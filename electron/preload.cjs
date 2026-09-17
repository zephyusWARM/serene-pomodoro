const { contextBridge, ipcRenderer } = require('electron');

// Store the wrapped listener so we can remove it later
let overlayActionListener = null;

// 安全地暴露 API 給渲染進程
contextBridge.exposeInMainWorld('electronAPI', {
    // 顯示全螢幕覆蓋通知
    showOverlay: (mode, skipCount = 0) => {
        return ipcRenderer.invoke('show-overlay', { mode, skipCount });
    },

    // 顯示 20-20-20 護眼提醒
    showEyeReminder: () => {
        return ipcRenderer.invoke('show-eye-reminder');
    },

    // 隱藏主視窗至系統列
    hideWindow: () => {
        return ipcRenderer.invoke('hide-window');
    },

    // 監聽來自 Overlay 的動作
    onOverlayAction: (callback) => {
        // Remove previous listener if any, to prevent accumulation
        if (overlayActionListener) {
            ipcRenderer.removeListener('overlay-action', overlayActionListener);
        }
        overlayActionListener = (event, action) => callback(action);
        ipcRenderer.on('overlay-action', overlayActionListener);
    },

    // 移除 Overlay 動作監聽器
    removeOverlayAction: () => {
        if (overlayActionListener) {
            ipcRenderer.removeListener('overlay-action', overlayActionListener);
            overlayActionListener = null;
        }
    },

    // 監聽系統從休眠/睡眠喚醒
    onSystemResumed: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('system-resumed', listener);
        return () => {
            ipcRenderer.removeListener('system-resumed', listener);
        };
    },

    // 更新系統列 (Tray) 狀態資訊
    updateTrayStatus: (status) => {
        return ipcRenderer.invoke('update-tray-status', status);
    },

    // 監聽來自系統列快速操作 (開始/暫停/重置)
    onTrayAction: (callback) => {
        const toggleListener = () => callback('toggle');
        const resetListener = () => callback('reset');
        ipcRenderer.on('tray-toggle-timer', toggleListener);
        ipcRenderer.on('tray-reset-timer', resetListener);
        return () => {
            ipcRenderer.removeListener('tray-toggle-timer', toggleListener);
            ipcRenderer.removeListener('tray-reset-timer', resetListener);
        };
    },

    // 監聽從系統列點擊開啟晨間心向
    onOpenMorningModal: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('open-morning-modal', listener);
        return () => {
            ipcRenderer.removeListener('open-morning-modal', listener);
        };
    },

    // 檢查是否在 Electron 環境中
    isElectron: true,
});

