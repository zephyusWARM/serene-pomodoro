import { useState, useEffect, useRef, useCallback } from 'react';
import { triggerNotification, triggerEyeReminder } from '../utils/notifications';

// Pure function — module level to avoid recreation on each render
const getDurations = (d) => ({
    focus:      (d?.focusDuration      ?? 25) * 60 * 1000,
    shortBreak: (d?.shortBreakDuration ??  5) * 60 * 1000,
    longBreak:  (d?.longBreakDuration  ?? 15) * 60 * 1000,
});



const useTimer = (customDurations) => {
    const [mode, setMode] = useState('focus');
    const [isActive, setIsActive] = useState(false);
    const [remainingMs, setRemainingMs] = useState(() => getDurations(customDurations).focus);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [cycleCount, setCycleCount] = useState(0); // completed focus sessions

    // Focus-end prompt state.
    // 'none' | 'prompting' | 'resting' | 'waiting' | 'break-done'
    const [focusEndState, setFocusEndState] = useState('none');

    // 連續跳過休息次數 (漸進式提醒強度)
    const [skipCount, setSkipCount] = useState(0);
    const skipCountRef = useRef(0);

    // 20-20-20 護眼提醒是否已在本輪觸發
    const eyeReminderTriggeredRef = useRef(false);

    // Refs for accurate time tracking
    const startTimeRef = useRef(null);
    const remainingAtStartRef = useRef(remainingMs);
    const intervalRef = useRef(null);
    const modeRef = useRef(mode);
    const durationsRef = useRef(getDurations(customDurations));
    const transitionTimeoutRef = useRef(null);
    const cycleCountRef = useRef(0);
    const waitTimeoutRef = useRef(null);
    
    // We use a separate ref to track the CURRENT remainingMs so effects can access it reliably
    const remRef = useRef(remainingMs);
    useEffect(() => {
        remRef.current = remainingMs;
    }, [remainingMs]);

    // Keep mode ref in sync
    useEffect(() => { modeRef.current = mode; }, [mode]);
    // Keep cycleCount ref in sync
    useEffect(() => { cycleCountRef.current = cycleCount; }, [cycleCount]);
    // Keep skipCount ref in sync
    useEffect(() => { skipCountRef.current = skipCount; }, [skipCount]);

    // Determine next mode based on current mode and cycle count
    const computeNextMode = useCallback((currentMode, currentCycleCount) => {
        if (currentMode === 'focus') {
            // After every 4th focus session, take a long break
            return (currentCycleCount + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
        }
        // After any break, go back to focus
        return 'focus';
    }, []);

    // Handle Setting Profile Duration Updates
    useEffect(() => {
        const oldDurations = durationsRef.current;
        const newDurations = getDurations(customDurations);
        durationsRef.current = newDurations;
        
        // Always read the freshly synced latest remainingMs
        const currentRem = remRef.current;

        // Did the slider for the CURRENT mode just get dragged?
        if (oldDurations[mode] !== newDurations[mode]) {
            if (!isActive) {
                // If paused, just snap to the new total duration so they can immediately reflect their target
                setRemainingMs(newDurations[mode]);
            } else if (currentRem > newDurations[mode]) {
                // If running but they shrunk it below what's currently remaining, cap it immediately
                setRemainingMs(newDurations[mode]);
                // Re-sync the base elapsed calculation immediately so no jumps happen
                startTimeRef.current = Date.now();
                remainingAtStartRef.current = newDurations[mode];
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customDurations?.focusDuration, customDurations?.shortBreakDuration, customDurations?.longBreakDuration]);

    // Auto-transition: switch mode and auto-start after a brief pause
    // Used for break→focus transitions (auto) and after rest overlay completes
    const autoTransition = useCallback((fromMode) => {
        setIsTransitioning(true);

        // Clear any existing transition timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            const currentCycle = cycleCountRef.current;
            const nextMode = computeNextMode(fromMode, currentCycle);

            // If we just finished a focus session, increment the cycle count
            if (fromMode === 'focus') {
                setCycleCount(prev => prev + 1);
            }

            setMode(nextMode);
            setRemainingMs(durationsRef.current[nextMode]);
            setIsTransitioning(false);
            setIsActive(true); // Auto-start the next timer
        }, 3000); // 3-second transition buffer
    }, [computeNextMode]);

    // Core timer loop — real-clock based to avoid drift
    useEffect(() => {
        if (isActive) {
            startTimeRef.current = Date.now();
            remainingAtStartRef.current = remainingMs;

            intervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                const newRemaining = remainingAtStartRef.current - elapsed;

                if (newRemaining <= 0) {
                    clearInterval(intervalRef.current);

                    const currentMode = modeRef.current;

                    if (currentMode === 'focus') {
                        window.dispatchEvent(new Event('focus-session-completed'));
                        triggerNotification('focus');

                        // Reset eye reminder flag for next focus cycle
                        eyeReminderTriggeredRef.current = false;

                        // Increment cycle count
                        const nextCycle = cycleCountRef.current + 1;
                        setCycleCount(nextCycle);
                        cycleCountRef.current = nextCycle;

                        // Auto-switch to break (5 minutes default)
                        const nextMode = computeNextMode('focus', nextCycle);
                        const breakDuration = durationsRef.current[nextMode];

                        setMode(nextMode);
                        modeRef.current = nextMode;
                        setRemainingMs(breakDuration);
                        remRef.current = breakDuration;
                        setFocusEndState('none');

                        // Immediately trigger desktop screen perimeter gradient glow
                        if (window.electronAPI?.startBreakGlow) {
                            window.electronAPI.startBreakGlow({ mode: nextMode, durationMs: breakDuration });
                        }

                        // Auto-start counting down the 5-minute break!
                        setIsActive(true);
                    } else {
                        // Break ended → wait for user to personally click "繼續"
                        setRemainingMs(0);
                        remRef.current = 0;
                        setIsActive(false);

                        // Close break glow and alert main window
                        if (window.electronAPI?.stopBreakGlow) {
                            window.electronAPI.stopBreakGlow();
                        }
                        if (window.electronAPI?.notifyBreakCompleted) {
                            window.electronAPI.notifyBreakCompleted();
                        }

                        triggerNotification(currentMode);

                        // Strictly wait for user to return and click continue
                        setFocusEndState('break-done');
                    }
                } else {
                    setRemainingMs(newRemaining);
                    remRef.current = newRemaining;

                    // 20-20-20 護眼提醒：在專注模式剩餘 5 分鐘時觸發 (第 20 分鐘)
                    const currentMode = modeRef.current;
                    if (currentMode === 'focus' && !eyeReminderTriggeredRef.current) {
                        const fiveMinMs = 5 * 60 * 1000;
                        const totalFocus = durationsRef.current.focus;
                        // 只在 focus >= 20 分鐘時觸發，在剩餘 5 分鐘時
                        if (totalFocus >= 20 * 60 * 1000 && newRemaining <= fiveMinMs) {
                            eyeReminderTriggeredRef.current = true;
                            triggerEyeReminder();
                        }
                    }
                }
            }, 250);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, mode, computeNextMode]);

    // Sleep-jump guard: detect when system wakes from sleep during active timing.
    // If a large time gap occurred (>30s) while the page was hidden, pause instead
    // of letting the timer auto-complete with a huge jump.
    useEffect(() => {
        let lastTickTime = Date.now();
        const SLEEP_THRESHOLD_MS = 30 * 1000; // 30 seconds

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                const now = Date.now();
                const gap = now - lastTickTime;
                if (gap > SLEEP_THRESHOLD_MS) {
                    // Large time gap detected — likely woke from sleep
                    // Pause the timer so the user can decide what to do
                    setIsActive(false);
                    // Recalculate remaining time based on what was left before sleep
                    const elapsed = now - startTimeRef.current;
                    const newRemaining = remainingAtStartRef.current - elapsed;
                    if (newRemaining > 0) {
                        setRemainingMs(newRemaining);
                    }
                    // Don't auto-complete; let the user resume or reset
                }
            }
            lastTickTime = Date.now();
        };

        // Also keep lastTickTime updated periodically while visible
        const tickInterval = setInterval(() => { lastTickTime = Date.now(); }, 5000);

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearInterval(tickInterval);
        };
    }, [isActive]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            if (waitTimeoutRef.current) {
                clearTimeout(waitTimeoutRef.current);
            }
        };
    }, []);

    // Track when rest started for wall-clock guard
    const restStartTimeRef = useRef(null);

    // User chose "開始休息" → show rest overlay
    const handleChooseRest = useCallback(() => {
        setFocusEndState('resting');
        restStartTimeRef.current = Date.now();
        setSkipCount(0); // 選擇休息時重置跳過計數
    }, []);

    // Rest overlay completed (10s elapsed) → transition to break
    const handleRestComplete = useCallback(() => {
        setFocusEndState('none');
        restStartTimeRef.current = null;
        autoTransition('focus');
    }, [autoTransition]);

    // visibilitychange guard for web fallback (non-Electron):
    // If the page was hidden (sleep/minimize) and the rest duration has passed,
    // auto-complete the rest when the page becomes visible again.
    useEffect(() => {
        const REST_DURATION_MS = 10000; // Must match RestOverlay's 10s countdown

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && focusEndState === 'resting') {
                const startTime = restStartTimeRef.current;
                if (startTime && (Date.now() - startTime) >= REST_DURATION_MS) {
                    handleRestComplete();
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [focusEndState, handleRestComplete]);

    // User chose "再等一分鐘" → dismiss, re-prompt after 60s
    const handleChooseWait = useCallback(() => {
        setFocusEndState('waiting');
        setSkipCount(prev => prev + 1); // 記錄跳過次數

        // Clear any existing wait timeout
        if (waitTimeoutRef.current) {
            clearTimeout(waitTimeoutRef.current);
        }

        waitTimeoutRef.current = setTimeout(() => {
            setFocusEndState('prompting');
            // Also re-trigger Electron overlay if in Electron
            if (window.electronAPI?.showOverlay) {
                window.electronAPI.showOverlay(modeRef.current, skipCountRef.current);
            }
        }, 60 * 1000); // 1 minute
    }, []);

    // User manually starts next focus after break is done
    const handleBreakDoneStart = useCallback(() => {
        setFocusEndState('none');
        if (window.electronAPI?.stopBreakGlow) {
            window.electronAPI.stopBreakGlow();
        }
        const nextMode = 'focus';
        setMode(nextMode);
        modeRef.current = nextMode;
        const focusDuration = durationsRef.current[nextMode];
        setRemainingMs(focusDuration);
        remRef.current = focusDuration;
        setIsActive(true);
    }, []);

    // Dismiss focus-end flow (for manual controls)
    const dismissFocusEnd = useCallback(() => {
        setFocusEndState('none');
        if (waitTimeoutRef.current) {
            clearTimeout(waitTimeoutRef.current);
        }
    }, []);

    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    const totalDuration = durationsRef.current[mode];
    // Clamp progress between 0 and 100 for safety under heavy rendering
    const progress = Math.min(100, Math.max(0, ((totalDuration - remainingMs) / totalDuration) * 100));

    const startTimer  = useCallback(() => {
        // Cancel any ongoing transition if user manually starts
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            setIsTransitioning(false);
        }
        // Cancel any focus-end prompt/wait
        dismissFocusEnd();
        setIsActive(true);
        // If starting in a break mode, open break glow window
        if (modeRef.current !== 'focus' && window.electronAPI?.startBreakGlow) {
            window.electronAPI.startBreakGlow({ mode: modeRef.current, durationMs: remRef.current });
        }
    }, [dismissFocusEnd]);

    const pauseTimer  = useCallback(() => {
        // Cancel any ongoing transition if user pauses
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            setIsTransitioning(false);
        }
        setIsActive(false);
    }, []);

    const resetTimer  = useCallback(() => {
        // Cancel any ongoing transition
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            setIsTransitioning(false);
        }
        // Cancel any focus-end prompt/wait
        dismissFocusEnd();
        setIsActive(false);
        const resetDuration = durationsRef.current[mode];
        setRemainingMs(resetDuration);
        remRef.current = resetDuration;
        // Stop break glow if resetting
        if (window.electronAPI?.stopBreakGlow) {
            window.electronAPI.stopBreakGlow();
        }
    }, [mode, dismissFocusEnd]);

    const changeMode = useCallback((newMode) => {
        // Cancel any ongoing transition
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            setIsTransitioning(false);
        }
        // Cancel any focus-end prompt/wait
        dismissFocusEnd();
        setMode(newMode);
        modeRef.current = newMode;
        setIsActive(false);
        const newDuration = durationsRef.current[newMode];
        setRemainingMs(newDuration);
        remRef.current = newDuration;
        // Stop break glow if switching modes manually
        if (window.electronAPI?.stopBreakGlow) {
            window.electronAPI.stopBreakGlow();
        }
    }, [dismissFocusEnd]);

    return {
        minutes, seconds, isActive, mode, progress,
        startTimer, pauseTimer, resetTimer, changeMode,
        isTransitioning, cycleCount,
        totalDuration, remainingMs,
        // Focus-end prompt state & handlers
        focusEndState,
        handleChooseRest,
        handleChooseWait,
        handleRestComplete,
        handleBreakDoneStart,
        // 漸進式提醒
        skipCount,
    };
};

export default useTimer;
