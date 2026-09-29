// Whether the widget is actually on screen.
//
// The main window runs with backgroundThrottling disabled so the countdown keeps exact time while
// it sits in the tray. A side effect is that Chromium keeps reporting the page as visible and keeps
// producing frames for it, so decorative rAF loops and infinite CSS animations would keep burning
// CPU/GPU for a window nobody can see. Electron reports the real state (hide/show/minimize/restore);
// the browser build falls back to the Page Visibility API. Only visual work is gated on this —
// timekeeping never is.
let visible = typeof document === 'undefined' ? true : !document.hidden;
const listeners = new Set();

const apply = (next) => {
  const value = Boolean(next);
  if (value === visible) return;
  visible = value;
  // Freezes CSS animations via index.css; they resume from the same frame when shown again.
  document.documentElement.toggleAttribute('data-window-hidden', !visible);
  listeners.forEach((listener) => listener(visible));
};

if (typeof window !== 'undefined') {
  document.documentElement.toggleAttribute('data-window-hidden', !visible);
  window.electronAPI?.onWindowVisibility?.(apply);
  document.addEventListener('visibilitychange', () => apply(!document.hidden));
}

export const isWindowVisible = () => visible;

export const subscribeWindowVisibility = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
