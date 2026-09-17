import React, { useState, useEffect, useRef } from 'react';
import './FocusEndPrompt.css';

/**
 * FocusEndPrompt – Shown when a focus session ends.
 * After a 3-second countdown the user gets two choices:
 *   1. 「開始休息」 → triggers onRest (fullscreen rest takeover)
 *   2. 「再等一分鐘」 → dismisses; after 60 s, re-shows itself
 */
function FocusEndContent({ onRest, onWait }) {
  const [countdown, setCountdown] = useState(3);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      onRest();
    }
  }, [countdown, onRest]);

  return (
    <div className="focus-end-overlay">
      <div className="focus-end-content">
        {/* Icon */}
        <div className="focus-end-icon">🎉</div>

        {/* Title */}
        <h2 className="focus-end-title">專注結束！</h2>
        <p className="focus-end-subtitle">做得好，你值得休息一下</p>

        {/* Action Buttons */}
        <div className="focus-end-actions">
          <button
            className="focus-end-btn rest-btn"
            onClick={() => {
              clearInterval(intervalRef.current);
              onRest();
            }}
          >
            🌿 開始休息 ({countdown}s)
          </button>
          <button
            className="focus-end-btn wait-btn"
            onClick={() => {
              clearInterval(intervalRef.current);
              onWait();
            }}
          >
            ⏳ 再等一分鐘
          </button>
        </div>
      </div>
    </div>
  );
}

const FocusEndPrompt = ({ visible, onRest, onWait }) => {
  if (!visible) return null;
  return <FocusEndContent onRest={onRest} onWait={onWait} />;
};

export default FocusEndPrompt;
