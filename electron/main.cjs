const { app, BrowserWindow, ipcMain, screen, Tray, Menu, powerMonitor } = require('electron');
const path = require('path');

// 判斷是否為開發模式
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let overlayWindow = null;
let eyeReminderWindow = null;
let tray = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 340,
        height: 480,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        title: 'Serene Guardian',
        // icon: path.join(__dirname, 'icon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // 攔截關閉事件，改為隱藏到系統列
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

let currentTrayStatus = {
    timeText: '',
    mode: 'focus',
    isRunning: false,
    intentionText: '',
};

function refreshTrayMenu() {
    if (!tray) return;

    let tooltip = 'Serene Guardian (靜謐守護者)';
    if (currentTrayStatus.timeText) {
        const modeEmoji = currentTrayStatus.mode === 'focus' ? '🍅' : (currentTrayStatus.mode === 'shortBreak' ? '🌿' : '🌙');
        tooltip = `${modeEmoji} ${currentTrayStatus.timeText} · Serene Guardian`;
    }
    if (currentTrayStatus.intentionText) {
        tooltip += `\n✨ ${currentTrayStatus.intentionText}`;
    }
    try {
        tray.setToolTip(tooltip);
    } catch (_) {
        // ignore
    }

    const modeLabels = {
        focus: '🍅 專注時段',
        shortBreak: '🌿 短休息',
        longBreak: '🌙 長休息',
    };
    const currentModeLabel = modeLabels[currentTrayStatus.mode] || '🍅 專注時段';

    const menuItems = [];

    // Current status header
    if (currentTrayStatus.timeText) {
        menuItems.push({
            label: `${currentModeLabel}：${currentTrayStatus.timeText} ${currentTrayStatus.isRunning ? '(計時中)' : '(已暫停)'}`,
            enabled: false,
        });
    }

    if (currentTrayStatus.intentionText) {
        menuItems.push({
            label: `✨ 今日心向：${currentTrayStatus.intentionText}`,
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                    mainWindow.webContents.send('open-morning-modal');
                }
            }
        });
    }

    if (menuItems.length > 0) {
        menuItems.push({ type: 'separator' });
    }

    // Quick action: Start / Pause
    menuItems.push({
        label: currentTrayStatus.isRunning ? '⏸ 暫停計時' : '▶ 開始計時',
        click: () => {
            if (mainWindow) {
                mainWindow.webContents.send('tray-toggle-timer');
            }
        }
    });

    menuItems.push({
        label: '↺ 重設計時',
        click: () => {
            if (mainWindow) {
                mainWindow.webContents.send('tray-reset-timer');
            }
        }
    });

    menuItems.push({ type: 'separator' });

    const isWindowVisible = mainWindow && mainWindow.isVisible();
    menuItems.push({
        label: isWindowVisible ? '⬇ 隱藏至系統列' : '⬆ 顯示主視窗',
        click: () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
                refreshTrayMenu();
            }
        }
    });

    menuItems.push({ type: 'separator' });

    menuItems.push({
        label: '完全退出',
        click: () => {
            app.isQuiting = true;
            app.quit();
        }
    });

    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

// 建立系統列圖示 (Tray)
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    try {
        tray = new Tray(iconPath);
    } catch (e) {
        console.warn('Tray icon not found at', iconPath, e);
    }

    if (tray) {
        refreshTrayMenu();

        // 左鍵單擊切換/顯示主視窗
        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.focus();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
                refreshTrayMenu();
            }
        });

        // 雙擊切換顯示/隱藏
        tray.on('double-click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
                refreshTrayMenu();
            }
        });
    }
}

// 建立全螢幕置頂覆蓋視窗
function createOverlayWindow(mode, skipCount = 0) {
    if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    overlayWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        fullscreen: true,
        alwaysOnTop: true,
        frame: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        minimizable: false,
        closable: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'overlay-preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0f2027',
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    const overlayPath = path.join(__dirname, 'overlay.html');
    overlayWindow.loadFile(overlayPath, {
        query: { mode: mode || 'focus', skipCount: String(skipCount || 0) }
    });

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

// 建立 20-20-20 護眼提醒小視窗 (角落浮動)
function createEyeReminder() {
    if (eyeReminderWindow) {
        eyeReminderWindow.close();
        eyeReminderWindow = null;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const winWidth = 360;
    const winHeight = 200;
    const margin = 20;

    eyeReminderWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: width - winWidth - margin,
        y: height - winHeight - margin,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        focusable: false,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'eye-reminder-preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    eyeReminderWindow.setAlwaysOnTop(true, 'floating');

    const reminderPath = path.join(__dirname, 'eye-reminder.html');
    eyeReminderWindow.loadFile(reminderPath);

    eyeReminderWindow.on('closed', () => {
        eyeReminderWindow = null;
    });

    // Auto-close after 25 seconds (20s countdown + buffer)
    setTimeout(() => {
        if (eyeReminderWindow) {
            eyeReminderWindow.close();
            eyeReminderWindow = null;
        }
    }, 25000);
}

// 當 Electron 完成初始化時
app.whenReady().then(() => {
    // 設定開機自動啟動（僅在真正打包成安裝版時啟用，避免在開發環境把 node_modules 中的 electron.exe 註冊到 Windows 開機自啟）
    if (app.isPackaged) {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe'),
        });
    } else {
        // 開發環境確保不啟用開機自啟
        app.setLoginItemSettings({
            openAtLogin: false,
        });
    }

    createWindow();
    createTray();

    // 監聽系統從休眠/睡眠恢復事件
    // 如果恢復時 overlay 還在，自動關閉並通知 renderer
    powerMonitor.on('resume', () => {
        console.log('[PowerMonitor] System resumed from sleep/hibernate');
        if (overlayWindow) {
            console.log('[PowerMonitor] Closing lingering overlay window');
            // Notify main renderer that rest is complete before closing
            if (mainWindow) {
                mainWindow.webContents.send('overlay-action', 'rest-complete');
            }
            overlayWindow.close();
            overlayWindow = null;
        }
        if (mainWindow) {
            mainWindow.webContents.send('system-resumed');
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    });
});

// 當所有視窗都關閉時
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// -- IPC 處理區 --

ipcMain.handle('show-overlay', (event, { mode, skipCount }) => {
    createOverlayWindow(mode, skipCount);
});

ipcMain.handle('show-eye-reminder', () => {
    createEyeReminder();
});

ipcMain.handle('close-eye-reminder', () => {
    if (eyeReminderWindow) {
        eyeReminderWindow.close();
        eyeReminderWindow = null;
    }
});

ipcMain.handle('close-overlay', () => {
    if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }
});

ipcMain.handle('overlay-action', (event, action) => {
    if (mainWindow) {
        mainWindow.webContents.send('overlay-action', action);
    }
});

ipcMain.handle('hide-window', () => {
    if (mainWindow) {
        mainWindow.hide();
        refreshTrayMenu();
    }
});

ipcMain.handle('update-tray-status', (event, status) => {
    if (status && typeof status === 'object') {
        currentTrayStatus = { ...currentTrayStatus, ...status };
        refreshTrayMenu();
    }
});

