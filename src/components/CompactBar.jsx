import React from 'react';
import { PlayIcon, PauseIcon, ExpandIcon } from './Icons';
import './CompactBar.css';

const RADIUS = 16;
const CIRC = 2 * Math.PI * RADIUS;

const MODE_LABEL = { focus: '專注', shortBreak: '短休息', longBreak: '長休息' };

/**
 * Island: the whole widget as one capsule — progress ring, time, and the one action that matters.
 * The countdown itself lives in useTimer; this only presents it.
 */
const CompactBar = ({ minutes, seconds, mode, isActive, progress, isTransitioning, onToggle, onExpand }) => {
  const time = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const offset = CIRC * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      className="compact-bar"
      role="group"
      aria-label="島嶼計時器"
      data-mode={mode}
      data-active={String(isActive)}
    >
      <svg className="compact-ring" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="compact-ring-bg" cx="20" cy="20" r={RADIUS} />
        <circle
          className="compact-ring-fg"
          cx="20"
          cy="20"
          r={RADIUS}
          style={{ strokeDashoffset: offset }}
        />
      </svg>

      <div className="compact-readout" title={`${MODE_LABEL[mode] || ''} ${time}`}>
        <span className="compact-time">{time}</span>
        <span className="compact-mode">{MODE_LABEL[mode]}</span>
      </div>

      <button
        className={`compact-play ${isActive ? 'is-active' : 'is-paused'}`}
        onClick={onToggle}
        disabled={isTransitioning}
        aria-label={isActive ? '暫停計時' : '開始計時'}
        title={isActive ? '暫停計時 (Space)' : '開始計時 (Space)'}
      >
        {isActive ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
      </button>

      <button
        className="icon-btn compact-expand"
        onClick={onExpand}
        aria-label="展開"
        title="展開 (快捷鍵 I)"
      >
        <ExpandIcon size={16} />
      </button>
    </div>
  );
};

export default CompactBar;
