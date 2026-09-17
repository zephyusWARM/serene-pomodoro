import React from 'react';

/**
 * Precision Vector Iconography (Apple SF Symbols style)
 * Clean, consistent 1.75px stroke, rounded corners, currentColor inheritance.
 */

export const FocusIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <circle cx="12" cy="12" r="9" opacity="0.35" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export const ShortBreakIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M11 20A7 7 0 0 1 4 13C4 7.5 9 4 20 4c0 11-3.5 16-9 16Z" />
    <path d="M4 20l7-7" />
  </svg>
);

export const LongBreakIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z" />
    <path d="M19 3v4" opacity="0.6" />
    <path d="M21 5h-4" opacity="0.6" />
  </svg>
);

export const PlayIcon = ({ size = 17, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`svg-icon ${className}`}
  >
    <path d="M7 4.5v15c0 .8.9 1.3 1.6.9l11.5-7.5c.7-.5.7-1.4 0-1.9L8.6 3.6C7.9 3.2 7 3.7 7 4.5Z" />
  </svg>
);

export const PauseIcon = ({ size = 17, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`svg-icon ${className}`}
  >
    <rect x="6.5" y="4" width="3.8" height="16" rx="1.8" />
    <rect x="13.7" y="4" width="3.8" height="16" rx="1.8" />
  </svg>
);

export const ResetIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const SettingsIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const TrayIcon = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SparkleIcon = ({ size = 13, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`svg-icon ${className}`}
  >
    <path d="M12 2l2.4 6.8 6.8 2.4-6.8 2.4L12 20.4l-2.4-6.8-6.8-2.4 6.8-2.4L12 2Z" />
  </svg>
);

export const MuteIcon = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export const RainIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 14v5" />
    <path d="M8 14v5" />
    <path d="M12 16v5" />
  </svg>
);

export const ForestIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M12 3l5 8h-3l4 7H6l4-7H7l5-8Z" />
    <path d="M12 18v3" />
  </svg>
);

export const CafeIcon = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
    <path d="M6 1v3" />
    <path d="M10 1v3" />
    <path d="M14 1v3" />
  </svg>
);

export const MiniEqualizer = () => (
  <span className="mini-equalizer">
    <span className="bar bar-1" />
    <span className="bar bar-2" />
    <span className="bar bar-3" />
  </span>
);
