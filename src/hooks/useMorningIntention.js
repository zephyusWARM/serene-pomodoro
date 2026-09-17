import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_INTENTION = 'serene-morning-intention';
const STORAGE_KEY_DISMISSED = 'serene-morning-dismissed';
const SESSION_KEY_STARTED = 'serene-session-started';

export const getLocalToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getSavedIntention = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_INTENTION);
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = getLocalToday();
      if (parsed.date === today && parsed.intention) {
        return parsed.intention;
      }
    }
  } catch {
    // ignore
  }
  return '';
};

// Check if user dismissed the prompt in the current time window
const isDismissedForNow = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    const today = getLocalToday();
    if (parsed.date !== today) return false;

    const currentHour = new Date().getHours();
    // If dismissed after 9 AM, dismissed for the whole day
    if (parsed.hour >= 9) return true;

    // If dismissed before 9 AM, and still before 9 AM, snooze until 9 AM
    if (currentHour < 9) return true;

    // If dismissed before 9 AM, but now it is 9 AM or later, allow 9 AM morning check
    return false;
  } catch {
    return false;
  }
};

const shouldPromptNow = (isFocusActive) => {
  // Never interrupt an ongoing focus session
  if (isFocusActive) return false;

  // If intention already set for today, don't auto-prompt
  if (getSavedIntention()) return false;

  const currentHour = new Date().getHours();

  // Between 00:00 and 04:59 is deep night, not morning
  if (currentHour < 5) return false;

  // Check if snoozed / dismissed for this time window
  if (isDismissedForNow()) return false;

  const isFreshSession = !sessionStorage.getItem(SESSION_KEY_STARTED);

  // Condition 1: 剛開機/啟動第一次用 (between 05:00 and 08:59)
  if (isFreshSession && currentHour < 9) {
    sessionStorage.setItem(SESSION_KEY_STARTED, 'true');
    return true;
  }

  // Condition 2: 早上9點後第一次用app (currentHour >= 9)
  if (currentHour >= 9) {
    sessionStorage.setItem(SESSION_KEY_STARTED, 'true');
    return true;
  }

  return false;
};

export default function useMorningIntention({ isFocusActive = false } = {}) {
  const [showModal, setShowModal] = useState(() => shouldPromptNow(isFocusActive));
  const [todayIntention, setTodayIntention] = useState(getSavedIntention);
  const currentDateRef = useRef(getLocalToday());

  const loadTodayIntention = useCallback(() => {
    setTodayIntention(getSavedIntention());
  }, []);

  const evaluateAndTrigger = useCallback(() => {
    const today = getLocalToday();
    // Handle midnight rollover: refresh intention if date rolled over
    if (today !== currentDateRef.current) {
      currentDateRef.current = today;
      setTodayIntention(getSavedIntention());
    }

    if (shouldPromptNow(isFocusActive)) {
      setShowModal(true);
    }
  }, [isFocusActive]);

  // When focus timer transitions to inactive, check if prompt is needed in next tick
  useEffect(() => {
    if (!isFocusActive) {
      const timer = setTimeout(() => {
        if (shouldPromptNow(false)) {
          setShowModal(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFocusActive]);

  useEffect(() => {
    // Evaluate when window gains focus
    const handleFocus = () => {
      evaluateAndTrigger();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic check every 30 seconds (catches 9:00 AM sharp and midnight crossing)
    const timer = setInterval(() => {
      evaluateAndTrigger();
    }, 30000);

    // Listen for custom update event
    const handleUpdated = () => {
      loadTodayIntention();
    };
    window.addEventListener('morning-intention-updated', handleUpdated);

    // Listen for Electron system wakeup from sleep/hibernate
    const cleanupResume = window.electronAPI?.onSystemResumed?.(() => {
      evaluateAndTrigger();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(timer);
      window.removeEventListener('morning-intention-updated', handleUpdated);
      if (typeof cleanupResume === 'function') cleanupResume();
    };
  }, [loadTodayIntention, evaluateAndTrigger]);

  const saveIntention = useCallback((text) => {
    const trimmed = (text || '').trim();
    const today = getLocalToday();

    if (trimmed) {
      const data = {
        date: today,
        intention: trimmed,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_INTENTION, JSON.stringify(data));
      setTodayIntention(trimmed);
    }
    setShowModal(false);
    window.dispatchEvent(new Event('morning-intention-updated'));
  }, []);

  const dismissForToday = useCallback(() => {
    const today = getLocalToday();
    const currentHour = new Date().getHours();
    localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify({ date: today, hour: currentHour }));
    setShowModal(false);
  }, []);

  const openModalManual = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    todayIntention,
    saveIntention,
    dismissForToday,
    openModalManual,
    closeModal,
  };
}
