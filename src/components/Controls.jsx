import React, { useRef, useLayoutEffect, useState } from 'react';
import { PlayIcon, PauseIcon, ResetIcon } from './Icons';
import './Controls.css';

const MODES = [
  { key: 'focus', label: '專注' },
  { key: 'shortBreak', label: '短休息' },
  { key: 'longBreak', label: '長休息' },
];

const Controls = ({
  isActive,
  onStart,
  onPause,
  onReset,
  mode,
  onModeChange,
  cycleCount = 0,
  isTransitioning = false,
}) => {
  // Current cycle position within 4-cycle set (1-based)
  const cyclePosition = (cycleCount % 4) + 1;

  // Sliding thumb position measurement
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 2, width: 64 });
  const tabRefs = useRef({});
  const [isResetting, setIsResetting] = useState(false);

  // Measured before paint so the thumb never flashes at its default position.
  useLayoutEffect(() => {
    const el = tabRefs.current[mode];
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [mode]);

  const handleResetClick = () => {
    setIsResetting(true);
    onReset();
    setTimeout(() => setIsResetting(false), 500);
  };

  return (
    <div className="controls-container" data-mode={mode}>
      {/* ── Segmented control: one thumb that slides between modes ── */}
      <div className="segmented-control" role="tablist" aria-label="計時模式">
        <div
          className="sliding-indicator"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        {MODES.map(({ key, label }) => {
          const isCurrent = mode === key;
          return (
            <button
              key={key}
              ref={(el) => (tabRefs.current[key] = el)}
              className={`segmented-tab${isCurrent ? ' active' : ''}`}
              onClick={() => onModeChange(key)}
              disabled={isTransitioning}
              role="tab"
              aria-selected={isCurrent}
              title={`切換至 ${label} (快捷鍵 M)`}
            >
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── One primary action, flanked by where you are in the cycle and reset ── */}
      <div className="action-buttons">
        <div className="cycle-indicator" title={`當前為第 ${cyclePosition} 輪專注循環`}>
          <div className="cycle-capsules" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`cycle-capsule ${n < cyclePosition ? 'completed' : ''} ${
                  n === cyclePosition ? 'current' : ''
                }`}
              />
            ))}
          </div>
          <span className="cycle-label">第 {cyclePosition} / 4 輪</span>
        </div>

        <button
          className={`control-btn main-action-btn ${isActive ? 'is-active' : 'is-paused'}`}
          onClick={isActive ? onPause : onStart}
          disabled={isTransitioning}
          title={isActive ? '暫停計時 (Space)' : '開始計時 (Space)'}
        >
          <span className="btn-icon-wrap">
            {isActive ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </span>
          <span className="btn-text">{isActive ? '暫停' : '開始'}</span>
        </button>

        <button
          className={`control-btn reset-btn ${isResetting ? 'rotating' : ''}`}
          onClick={handleResetClick}
          aria-label="重置計時"
          title="重置計時 (R 鍵)"
        >
          <ResetIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default Controls;
