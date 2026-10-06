import React, { useRef, useEffect } from 'react';
import {
  SettingsIcon,
  FocusIcon,
  ShortBreakIcon,
  LongBreakIcon,
  SparkleIcon,
} from './Icons';
import './Settings.css';

const Settings = ({ settings, onUpdate, todayIntention, onOpenMorningModal }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const { focusDuration, shortBreakDuration, longBreakDuration } = settings;

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector('input')?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Click-outside-to-close (#6)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    // Delay to avoid catching the toggle click itself
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="settings-container" ref={panelRef}>
      <button
        className="icon-btn settings-toggle"
        ref={toggleRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="偏好設定"
        aria-expanded={isOpen}
        aria-controls="settings-panel"
        title="偏好設定"
      >
        <SettingsIcon size={18} />
      </button>

      {isOpen && (
        <div className="settings-panel" id="settings-panel" role="region" aria-label="偏好設定">
          <div className="settings-title">
            <span>偏好設定</span>
          </div>

          {/* Task Name (#7) */}
          <div className="setting-group">
            <label className="setting-label" htmlFor="task-name">任務名稱</label>
            <input
              id="task-name"
              type="text"
              className="task-name-input"
              value={settings.taskName || ''}
              onChange={(e) => onUpdate('taskName', e.target.value)}
              placeholder="Serene Guardian"
              maxLength={30}
            />
          </div>

          {/* Morning Intention */}
          <div className="setting-group">
            <div className="setting-label">晨間心向</div>
            <div className="morning-settings-row">
              <span
                className="morning-settings-status"
                title={todayIntention || '尚未設定'}
              >
                {todayIntention ? todayIntention : '今日尚未設定'}
              </span>
              <button
                type="button"
                className="morning-settings-btn"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenMorningModal) onOpenMorningModal();
                }}
              >
                {todayIntention ? '修改心向' : '設定心向'}
              </button>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-label">計時時長（分鐘）</div>
            {[
              {
                key: 'focusDuration',
                label: '專注時段',
                Icon: FocusIcon,
                value: focusDuration,
                min: 5,
                max: 60,
              },
              {
                key: 'shortBreakDuration',
                label: '短休息',
                Icon: ShortBreakIcon,
                value: shortBreakDuration,
                min: 1,
                max: 15,
              },
              {
                key: 'longBreakDuration',
                label: '長休息',
                Icon: LongBreakIcon,
                value: longBreakDuration,
                min: 5,
                max: 30,
              },
            ].map(({ key, label, Icon, value, min, max }) => (
              <div className="duration-row" key={key}>
                <span className="duration-name">
                  <Icon size={14} className="duration-icon" />
                  {label}
                </span>
                <input
                  type="range"
                  aria-label={label}
                  aria-valuetext={`${value} 分鐘`}
                  className="duration-slider"
                  min={min}
                  max={max}
                  value={value}
                  style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
                  onChange={(e) => onUpdate(key, Number(e.target.value))}
                />
                <span className="duration-value">{value}m</span>
              </div>
            ))}
          </div>

          <div className="setting-info">
            <SparkleIcon size={11} className="info-icon" />
            <span>專注結束後會自動開始休息，螢幕邊緣亮起柔和光暈</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
