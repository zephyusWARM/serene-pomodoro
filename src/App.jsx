import React, { useEffect, useRef } from 'react';
import Timer from './components/Timer';
import Controls from './components/Controls';
import Settings from './components/Settings';
import AmbientPlayer from './components/AmbientPlayer';
import FocusEndPrompt from './components/FocusEndPrompt';
import RestOverlay from './components/RestOverlay';
import MorningIntentionModal from './components/MorningIntentionModal';
import useTimer from './hooks/useTimer';
import useSettings from './hooks/useSettings';
import useStats from './hooks/useStats';
import useMorningIntention from './hooks/useMorningIntention';
import { requestNotificationPermission } from './utils/notifications';
import './App.css';

import bgFocus  from './assets/bg-focus.png';
import bgBreak  from './assets/bg-break.png';
import bgLong   from './assets/bg-overlay.png'; // Night/Cosmos for Long Break
import TimeTraveler from './components/TimeTraveler'; // Time Traveler Dynamic Effect

import {
  MuteIcon,
  RainIcon,
  ForestIcon,
  CafeIcon,
  MiniEqualizer,
  FocusIcon,
  ShortBreakIcon,
  LongBreakIcon,
  SparkleIcon,
  TrayIcon,
} from './components/Icons';

const AMBIENT_ITEMS = [
  { key: 'none', label: '靜音', Icon: MuteIcon },
  { key: 'rain', label: '雨聲', Icon: RainIcon },
  { key: 'forest', label: '森林', Icon: ForestIcon },
  { key: 'cafe', label: '咖啡館', Icon: CafeIcon },
];

const TRANSITION_CONFIG = {
  focus:      { text: '即將開始專注...', Icon: FocusIcon },
  shortBreak: { text: '做得好！即將進入休息...', Icon: ShortBreakIcon },
  longBreak:  { text: '太棒了！進入長休息...', Icon: LongBreakIcon },
};

function App() {
  const { settings, updateSetting } = useSettings();

  const {
    minutes, seconds, isActive, mode,
    startTimer, pauseTimer, resetTimer, changeMode,
    isTransitioning, cycleCount,
    totalDuration, remainingMs,
    // Focus-end prompt state & handlers
    focusEndState,
    handleChooseRest,
    handleChooseWait,
    handleRestComplete,
    handleBreakDoneStart,
  } = useTimer(settings);

  const { todayFocusCount, recordFocusSession } = useStats();

  const {
    showModal: showMorningModal,
    todayIntention,
    saveIntention,
    dismissForToday,
    openModalManual,
  } = useMorningIntention({ isFocusActive: isActive && mode === 'focus' });

  // Stats listener + notification permission
  useEffect(() => {
    window.addEventListener('focus-session-completed', recordFocusSession);

    // Request notification permission (browser fallback)
    if (!window.electronAPI?.isElectron) {
      requestNotificationPermission();
    }

    return () => window.removeEventListener('focus-session-completed', recordFocusSession);
  }, [recordFocusSession]);

  // Electron overlay IPC listener (separate effect to avoid leak)
  // Use refs so the listener closure always sees the latest handlers
  const handleRestCompleteRef = useRef(handleRestComplete);
  const handleChooseWaitRef = useRef(handleChooseWait);
  useEffect(() => { handleRestCompleteRef.current = handleRestComplete; }, [handleRestComplete]);
  useEffect(() => { handleChooseWaitRef.current = handleChooseWait; }, [handleChooseWait]);

  // Sync timer and intention status to Electron Tray
  useEffect(() => {
    if (!window.electronAPI?.updateTrayStatus) return;
    const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    window.electronAPI.updateTrayStatus({
      timeText,
      mode,
      isRunning: isActive,
      intentionText: todayIntention,
    });
  }, [minutes, seconds, mode, isActive, todayIntention]);

  // Tray action listener
  useEffect(() => {
    if (!window.electronAPI?.onTrayAction) return;

    const cleanupTrayAction = window.electronAPI.onTrayAction((action) => {
      if (action === 'toggle') {
        if (isActive) {
          pauseTimer();
        } else {
          startTimer();
        }
      } else if (action === 'reset') {
        resetTimer();
      }
    });

    const cleanupMorningModal = window.electronAPI.onOpenMorningModal?.(() => {
      openModalManual();
    });

    return () => {
      if (typeof cleanupTrayAction === 'function') cleanupTrayAction();
      if (typeof cleanupMorningModal === 'function') cleanupMorningModal();
    };
  }, [isActive, startTimer, pauseTimer, resetTimer, openModalManual]);

  // Global Keyboard Shortcuts (Space: Start/Pause, R: Reset, M: Cycle Mode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isActive) {
          pauseTimer();
        } else {
          startTimer();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetTimer();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const modes = ['focus', 'shortBreak', 'longBreak'];
        const currentIdx = modes.indexOf(mode);
        const next = modes[(currentIdx + 1) % modes.length];
        changeMode(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, mode, startTimer, pauseTimer, resetTimer, changeMode]);

  const handleHideToTray = () => {
    if (window.electronAPI?.hideWindow) window.electronAPI.hideWindow();
  };

  // Determine what mode we're transitioning TO
  const getNextMode = () => {
    if (mode === 'focus') {
      return (cycleCount + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
    }
    return 'focus';
  };

  // Convert focus count to minimalist dots (groups of 4)
  const renderDots = () => {
    // Show total slots rounded up to nearest 4, min 4
    const totalSlots = Math.max(4, Math.ceil(todayFocusCount / 4) * 4);
    return Array.from({ length: totalSlots }).map((_, i) => (
      <div 
        key={i} 
        className={`progress-dot ${i < todayFocusCount ? 'completed' : ''}`} 
        title={i < todayFocusCount ? '已完成的專注' : '尚未完成'}
      />
    ));
  };

  const nextMode = getNextMode();
  const transitionConfig = TRANSITION_CONFIG[nextMode];

  return (
    <div className="app" data-mode={mode}>
      {/* ── AI Background Layers (crossfade) ── */}
      <div
        className="app-bg app-bg-focus"
        style={{ backgroundImage: `url(${bgFocus})` }}
      />
      <div
        className="app-bg app-bg-break"
        style={{ backgroundImage: `url(${bgBreak})` }}
      />
      <div
        className="app-bg app-bg-long"
        style={{ backgroundImage: `url(${bgLong})` }}
      />

      {/* ── Time Traveler Dynamic Effect ── */}
      <TimeTraveler active={mode === 'focus' && isActive} />

      {/* ── Ambient Audio ── */}
      <AmbientPlayer sound={settings.ambientSound} />

      {/* ── Transition Overlay ── */}
      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-content">
            <div className="transition-icon-wrap">
              <transitionConfig.Icon size={32} className="transition-icon-svg" />
            </div>
            <div className="transition-text">{transitionConfig.text}</div>
            <div className="transition-dots">
              <span className="t-dot" />
              <span className="t-dot" />
              <span className="t-dot" />
            </div>
          </div>
        </div>
      )}

      {/* ── Focus End Prompt (Web Fallback) ── */}
      {!window.electronAPI?.isElectron && (
        <FocusEndPrompt
          visible={focusEndState === 'prompting'}
          onRest={handleChooseRest}
          onWait={handleChooseWait}
        />
      )}

      {/* ── Rest Overlay (Web Fallback) ── */}
      {!window.electronAPI?.isElectron && (
        <RestOverlay
          visible={focusEndState === 'resting'}
          onComplete={handleRestComplete}
        />
      )}

      {/* ── Break Done Overlay ── */}
      {focusEndState === 'break-done' && (
        <div className="break-done-overlay">
          <div className="break-done-content">
            <div className="break-done-icon-wrap">
              <SparkleIcon size={36} className="break-done-sparkle" />
            </div>
            <h2 className="break-done-title">休息結束！</h2>
            <p className="break-done-text">準備好繼續專注了嗎？</p>
            <button className="break-done-btn" onClick={handleBreakDoneStart}>
              開始下一段專注
            </button>
          </div>
        </div>
      )}

      {/* ── Morning Intention Modal ── */}
      <MorningIntentionModal
        visible={showMorningModal}
        currentIntention={todayIntention}
        onSave={saveIntention}
        onDismiss={dismissForToday}
      />

      {/* ── Minimalist Content Layer ── */}
      <div className="app-content">
        
        {/* Title Bar */}
        <div className="title-bar">
          <Settings 
            settings={settings} 
            onUpdate={updateSetting} 
            todayIntention={todayIntention}
            onOpenMorningModal={openModalManual}
          />
          <div className="title-center">
            <p className="app-title">{settings.taskName || 'SERENE GUARDIAN'}</p>
            {todayIntention ? (
              <button
                className="morning-intention-badge"
                onClick={openModalManual}
                title="點擊回顧或修改今日心向"
              >
                <SparkleIcon size={12} className="badge-sparkle-icon" />
                <span className="badge-text">{todayIntention}</span>
              </button>
            ) : (
              <button
                className="morning-intention-badge empty"
                onClick={openModalManual}
                title="點擊設定今日心向"
              >
                <SparkleIcon size={12} className="badge-sparkle-icon" />
                <span className="badge-text">今日心向</span>
              </button>
            )}
          </div>
          {window.electronAPI?.isElectron ? (
            <button
              className="tray-hide-btn"
              onClick={handleHideToTray}
              title="隱藏至系統列"
            >
              <TrayIcon size={14} />
            </button>
          ) : (
            <div className="tray-placeholder" />
          )}
        </div>

        {/* Center Timer */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
          <Timer
            minutes={minutes}
            seconds={seconds}
            mode={mode}
            isActive={isActive}
            totalDuration={totalDuration}
            remainingMs={remainingMs}
          />
        </div>

        {/* Bottom Controls */}
        <Controls
          isActive={isActive}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          mode={mode}
          onModeChange={changeMode}
          cycleCount={cycleCount}
          isTransitioning={isTransitioning}
        />

        {/* Ambient Tools (Apple Mini-Dock Style) */}
        <div className="ambient-bar" role="toolbar" aria-label="環境白噪音">
          {AMBIENT_ITEMS.map(({ key, label, Icon }) => {
            const isSelected = settings.ambientSound === key;
            const isPlaying = isSelected && key !== 'none';
            return (
              <button
                key={key}
                className={`ambient-btn${isSelected ? ' active' : ''}`}
                data-sound={key}
                onClick={() => updateSetting('ambientSound', key)}
                title={`環境白噪音：${label}${isPlaying ? ' (播放中)' : ''}`}
              >
                <Icon size={14} className="ambient-icon" />
                <span className="ambient-label">{label}</span>
                {isPlaying && <MiniEqualizer />}
              </button>
            );
          })}
        </div>

        {/* Minimalist Progress Indicator */}
        <div className="progress-dots-container">
          {renderDots()}
        </div>

      </div>
    </div>
  );
}

export default App;
