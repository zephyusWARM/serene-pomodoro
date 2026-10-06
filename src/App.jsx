import React, { useCallback, useEffect, useRef, useState } from 'react';
import Timer from './components/Timer';
import Controls from './components/Controls';
import Settings from './components/Settings';
import AmbientPlayer from './components/AmbientPlayer';
import FocusEndPrompt from './components/FocusEndPrompt';
import RestOverlay from './components/RestOverlay';
import MorningIntentionModal from './components/MorningIntentionModal';
import CompactBar from './components/CompactBar';
import TodaySheet from './components/TodaySheet';
import useTimer from './hooks/useTimer';
import useSettings from './hooks/useSettings';
import useStats from './hooks/useStats';
import useMorningIntention from './hooks/useMorningIntention';
import useDialogFocus from './hooks/useDialogFocus';
import { requestNotificationPermission } from './utils/notifications';
import './App.css';

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
  IslandIcon,
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

// More dots than this stop being glanceable (and overflow the widget); the count says the rest.
const MAX_DOTS = 16;
// The window resize happens between a short fade-out and fade-in so the swap never shows a clipped frame.
const ISLAND_FADE_MS = 140;

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

  const [showToday, setShowToday] = useState(false);
  const [compact, setCompact] = useState(false);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const canCompact = Boolean(window.electronAPI?.setCompact);

  const breakDoneRef = useRef(null);
  useDialogFocus(breakDoneRef, focusEndState === 'break-done');

  // Island mode: collapse the widget into a capsule or expand it again. The countdown never pauses.
  const switchCompact = useCallback(async (next) => {
    if (!window.electronAPI?.setCompact || switchingRef.current) return;
    switchingRef.current = true;
    setSwitching(true);
    await new Promise((resolve) => setTimeout(resolve, ISLAND_FADE_MS));
    try {
      await window.electronAPI.setCompact(next);
      setCompact(next);
      if (next) setShowToday(false);
    } finally {
      requestAnimationFrame(() => {
        setSwitching(false);
        switchingRef.current = false;
      });
    }
  }, []);

  // Anything that needs the full widget (break finished, morning intention) pulls it out of the island.
  const needsFullWidget = showMorningModal || focusEndState === 'break-done';
  useEffect(() => {
    if (compact && needsFullWidget) switchCompact(false);
  }, [compact, needsFullWidget, switchCompact]);

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

  // Sync break countdown to Electron perimeter break glow
  useEffect(() => {
    if (mode !== 'focus' && isActive && window.electronAPI?.updateBreakGlow) {
      const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const percent = totalDuration > 0 ? (totalDuration - remainingMs) / totalDuration : 0;
      window.electronAPI.updateBreakGlow({ timeText, percent, mode });
    }
  }, [minutes, seconds, mode, isActive, totalDuration, remainingMs]);

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

  // Global Keyboard Shortcuts (Space: Start/Pause/Continue, R: Reset, M: Cycle Mode, I: Island)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      if (showMorningModal && focusEndState !== 'break-done') return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.closest('button, a, input, textarea, select, [role="tab"], [role="dialog"]') ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // If waiting for user to return after break, Space or Enter triggers "繼續"
      if (focusEndState === 'break-done') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleBreakDoneStart();
          return;
        }
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
      } else if ((e.key === 'i' || e.key === 'I') && canCompact && !needsFullWidget && !showToday) {
        e.preventDefault();
        switchCompact(!compact);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, mode, focusEndState, showMorningModal, handleBreakDoneStart, startTimer, pauseTimer, resetTimer, changeMode, canCompact, compact, needsFullWidget, showToday, switchCompact]);

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

  // Today's focus sessions as dots, grouped in fours. They are decoration for the count beside them.
  const renderDots = () => {
    const shown = Math.min(todayFocusCount, MAX_DOTS);
    const totalSlots = Math.min(MAX_DOTS, Math.max(4, Math.ceil(todayFocusCount / 4) * 4));
    return Array.from({ length: totalSlots }).map((_, i) => (
      <span
        key={i}
        className={`progress-dot ${i < shown ? 'completed' : ''}`}
      />
    ));
  };

  const nextMode = getNextMode();
  const transitionConfig = TRANSITION_CONFIG[nextMode];

  // 0..1 across the current session; drives the slow drift of the ambient light, once per second.
  const progress = totalDuration > 0
    ? Math.min(1, Math.max(0, (totalDuration - remainingMs) / totalDuration))
    : 0;

  return (
    <div
      className="app"
      data-mode={mode}
      data-compact={compact ? 'true' : 'false'}
      data-switching={switching ? 'true' : 'false'}
      style={{ '--progress': progress.toFixed(4) }}
    >
      {/* ── Ambient colour field: one scene of light per mode, crossfaded (drawn in CSS) ── */}
      <div className="app-bg app-bg-focus" />
      <div className="app-bg app-bg-break" />
      <div className="app-bg app-bg-long" />

      {/* ── Ambient Audio ── */}
      <AmbientPlayer sound={settings.ambientSound} />

      {/* ── Transition Overlay ── */}
      {isTransitioning && (
        <div className="transition-overlay">
          <div className="transition-content">
            <transitionConfig.Icon size={30} className="transition-icon-svg" />
            <div className="transition-text">{transitionConfig.text}</div>
            <div className="transition-dots" aria-hidden="true">
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
        <div className="break-done-overlay" ref={breakDoneRef} role="dialog" aria-modal="true" aria-labelledby="break-done-title" tabIndex={-1}>
          <div className="break-done-content">
            <SparkleIcon size={34} className="break-done-sparkle" />
            <h2 className="break-done-title" id="break-done-title">休息結束！</h2>
            <p className="break-done-text">身心充飽電，準備好請點擊繼續</p>
            <button
              className="break-done-btn"
              onClick={handleBreakDoneStart}
              title="點擊開始下一段專注 (快捷鍵 Space 或 Enter)"
            >
              繼續 · 開始專注
            </button>
          </div>
        </div>
      )}

      {/* ── Web Fallback Break Glow (for browser mode) ── */}
      {!window.electronAPI?.isElectron && mode !== 'focus' && isActive && (
        <div className="web-break-glow" />
      )}

      {/* ── Morning Intention Modal ── */}
      <MorningIntentionModal
        visible={showMorningModal && focusEndState !== 'break-done'}
        currentIntention={todayIntention}
        onSave={saveIntention}
        onDismiss={dismissForToday}
      />

      {/* ── Today / this week ── */}
      <TodaySheet
        visible={showToday && !compact}
        todayCount={todayFocusCount}
        onClose={() => setShowToday(false)}
      />

      {compact ? (
        /* ── Island: the whole widget as one capsule ── */
        <CompactBar
          minutes={minutes}
          seconds={seconds}
          mode={mode}
          isActive={isActive}
          progress={progress}
          isTransitioning={isTransitioning}
          onToggle={isActive ? pauseTimer : startTimer}
          onExpand={() => switchCompact(false)}
        />
      ) : (
        /* ── Content layer ── */
        <div className="app-content" inert={showMorningModal || focusEndState === 'break-done' || showToday}>

          {/* Title Bar */}
          <div className="title-bar">
            <div className="title-side">
              <Settings
                settings={settings}
                onUpdate={updateSetting}
                todayIntention={todayIntention}
                onOpenMorningModal={openModalManual}
              />
            </div>
            <div className="title-center">
              <p className="app-title">{settings.taskName || 'Serene Guardian'}</p>
              {todayIntention ? (
                <button
                  className="morning-intention-badge"
                  onClick={openModalManual}
                  title="點擊回顧或修改今日心向"
                >
                  <SparkleIcon size={11} className="badge-sparkle-icon" />
                  <span className="badge-text">{todayIntention}</span>
                </button>
              ) : (
                <button
                  className="morning-intention-badge empty"
                  onClick={openModalManual}
                  title="點擊設定今日心向"
                >
                  <SparkleIcon size={11} className="badge-sparkle-icon" />
                  <span className="badge-text">今日心向</span>
                </button>
              )}
            </div>
            <div className="title-side title-side-end">
              {canCompact && (
                <button
                  className="icon-btn island-btn"
                  onClick={() => switchCompact(true)}
                  aria-label="收合成島嶼"
                  title="收合成島嶼 (快捷鍵 I)"
                >
                  <IslandIcon size={18} />
                </button>
              )}
              {window.electronAPI?.isElectron ? (
                <button
                  className="icon-btn tray-hide-btn"
                  onClick={handleHideToTray}
                  aria-label="隱藏至系統列"
                  title="隱藏至系統列"
                >
                  <TrayIcon size={16} />
                </button>
              ) : (
                <div className="tray-placeholder" />
              )}
            </div>
          </div>

          {/* Center Timer */}
          <div className="timer-stage">
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

          {/* Ambient sounds: the selected one opens into a pill, the rest stay icons */}
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
                  aria-pressed={isSelected}
                  title={`環境白噪音：${label}${isPlaying ? ' (播放中)' : ''}`}
                >
                  <Icon size={16} className="ambient-icon" />
                  <span className="ambient-label">{label}</span>
                  {isPlaying && <MiniEqualizer />}
                </button>
              );
            })}
          </div>

          {/* Today: dots + count, opens the week */}
          <button
            className="today-btn"
            onClick={() => setShowToday(true)}
            aria-haspopup="dialog"
            aria-label={`今日專注 ${todayFocusCount} 段，查看本週`}
            title="查看本週專注"
          >
            <span className="progress-dots-container" aria-hidden="true">
              {renderDots()}
            </span>
            <span className="today-count" aria-hidden="true">今日 {todayFocusCount}</span>
          </button>

        </div>
      )}
    </div>
  );
}

export default App;
