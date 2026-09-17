import React, { useRef, useEffect, useState } from 'react';
import { FocusIcon, ShortBreakIcon, LongBreakIcon, PlayIcon, PauseIcon, ResetIcon } from './Icons';
import './Controls.css';

const MODES = [
  { key: 'focus', label: '專注', Icon: FocusIcon },
  { key: 'shortBreak', label: '短休息', Icon: ShortBreakIcon },
  { key: 'longBreak', label: '長休息', Icon: LongBreakIcon },
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

  // Sliding pill position measurement
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 3, width: 68 });
  const tabRefs = useRef({});
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
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
      {/* ── Apple-style Sliding Pill Segmented Control ── */}
      <div className="segmented-control" role="tablist">
        <div
          className="sliding-indicator"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        {MODES.map(({ key, label, Icon }) => {
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
              <Icon size={14} className="tab-icon" />
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Apple Activity Capsule Cycle Indicator ── */}
      <div className="cycle-indicator" title={`當前為第 ${cyclePosition} 輪專注循環`}>
        <div className="cycle-capsules">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`cycle-capsule ${n < cyclePosition ? 'completed' : ''} ${
                n === cyclePosition ? 'current' : ''
              }`}
            >
              <div className="capsule-fill" />
            </div>
          ))}
        </div>
        <span className="cycle-label">第 {cyclePosition} / 4 輪</span>
      </div>

      {/* ── Tactile Luminescent Action Buttons ── */}
      <div className="action-buttons">
        <button
          className={`control-btn main-action-btn ${isActive ? 'is-active' : 'is-paused'}`}
          onClick={isActive ? onPause : onStart}
          disabled={isTransitioning}
          title={isActive ? '暫停計時 (Space)' : '開始計時 (Space)'}
        >
          <span className="btn-icon-wrap">
            {isActive ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
          </span>
          <span className="btn-text">{isActive ? '暫 停' : '開 始'}</span>
          <span className="btn-specular-highlight" />
        </button>

        <button
          className={`control-btn reset-btn ${isResetting ? 'rotating' : ''}`}
          onClick={handleResetClick}
          title="重置計時 (R 鍵)"
        >
          <ResetIcon size={15} />
        </button>
      </div>
    </div>
  );
};

export default Controls;
