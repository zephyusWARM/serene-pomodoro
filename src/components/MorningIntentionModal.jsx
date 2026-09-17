import React, { useState, useEffect, useRef } from 'react';
import './MorningIntentionModal.css';

const DEFAULT_OPTIONS = [
  { id: 'gentle', label: '🌸 溫柔一點', text: '溫柔一點' },
  { id: 'honest', label: '💎 誠實一點', text: '誠實一點' },
  { id: 'peaceful', label: '🌊 平靜一點', text: '平靜一點' },
  { id: 'focused', label: '🎯 專注一點', text: '專注一點' },
  { id: 'brave', label: '🦁 勇敢一點', text: '勇敢一點' },
  { id: 'patient', label: '⏳ 耐心一點', text: '耐心一點' },
];

function MorningIntentionContent({ currentIntention, onSave, onDismiss }) {
  const [selectedText, setSelectedText] = useState(() => {
    if (currentIntention) return currentIntention;
    return DEFAULT_OPTIONS[0].text;
  });

  const [isCustom, setIsCustom] = useState(() => {
    if (currentIntention) {
      return !DEFAULT_OPTIONS.some(o => o.text === currentIntention);
    }
    return false;
  });

  const [customText, setCustomText] = useState(() => {
    if (currentIntention && !DEFAULT_OPTIONS.some(o => o.text === currentIntention)) {
      return currentIntention;
    }
    return '';
  });

  const [confirmed, setConfirmed] = useState(false);
  const timeoutRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleSelectPreset = (text) => {
    setSelectedText(text);
    setIsCustom(false);
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomText(val);
    setSelectedText(val);
    setIsCustom(true);
  };

  const handleConfirm = () => {
    const finalIntention = (selectedText || customText || '溫柔一點').trim();
    if (!finalIntention) return;

    onSave(finalIntention);
    setConfirmed(true);

    // Auto-close after subtle blessing feedback
    timeoutRef.current = setTimeout(() => {
      onDismiss();
    }, 1400);
  };

  return (
    <div className="morning-modal-card">
      {/* Close button in top-right */}
      <button
        type="button"
        className="morning-close-corner"
        onClick={onDismiss}
        title="關閉 (Esc)"
        aria-label="關閉"
      >
        ✕
      </button>

      {confirmed ? (
        <div className="morning-blessing-view">
          <div className="blessing-icon">✨</div>
          <h3 className="blessing-title">願你帶著這份心意</h3>
          <p className="blessing-intention">「{selectedText}」</p>
          <p className="blessing-sub">平靜而篤定地度過充實的一天</p>
        </div>
      ) : (
        <>
          {/* Header / Aura (Draggable in Electron) */}
          <div className="morning-header">
            <div className="morning-sun-badge">🌅</div>
            <span className="morning-tag">晨間心向 · MORNING INTENTION</span>
          </div>

          {/* Core Question */}
          <h2 className="morning-question">
            「我今天想要成為<br />什麼樣的人？」
          </h2>

          {/* Guidance quote */}
          <p className="morning-quote">
            醒來後，先放下待辦事項。<br />
            今天想溫柔一點？還是誠實一點？<br />
            讓整天有一個溫暖的方向。
          </p>

          {/* Presets Grid */}
          <div className="morning-presets">
            {DEFAULT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`preset-chip ${!isCustom && selectedText === opt.text ? 'selected' : ''}`}
                onClick={() => handleSelectPreset(opt.text)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="morning-custom-box">
            <input
              type="text"
              className={`custom-intention-input ${isCustom && customText ? 'active' : ''}`}
              placeholder="✍️ 或寫下自己的心向 (如：包容、放鬆)..."
              value={customText}
              onChange={handleCustomChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              maxLength={20}
            />
          </div>

          {/* Actions */}
          <div className="morning-actions">
            <button
              type="button"
              className="morning-confirm-btn"
              onClick={handleConfirm}
              disabled={!selectedText.trim()}
            >
              帶著這份心意出發 ✦
            </button>

            <button
              type="button"
              className="morning-skip-btn"
              onClick={onDismiss}
            >
              稍後再想
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MorningIntentionModal({
  visible,
  currentIntention,
  onSave,
  onDismiss,
}) {
  if (!visible) return null;

  return (
    <div className="morning-modal-overlay">
      <MorningIntentionContent
        key={currentIntention || 'default'}
        currentIntention={currentIntention}
        onSave={onSave}
        onDismiss={onDismiss}
      />
    </div>
  );
}
