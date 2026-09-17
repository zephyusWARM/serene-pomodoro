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
  const { focusDuration, shortBreakDuration, longBreakDuration } = settings;

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
        className="settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="偏好設定"
        title="偏好設定"
      >
        <SettingsIcon size={15} />
      </button>

      {isOpen && (
        <div className="settings-panel">
          <div className="settings-title">
            <span>偏好設定</span>
          </div>

          {/* Task Name (#7) */}
          <div className="setting-group">
            <div className="setting-label">任務名稱</div>
            <input
              type="text"
              className="task-name-input"
              value={settings.taskName || ''}
              onChange={(e) => onUpdate('taskName', e.target.value)}
              placeholder="SERENE GUARDIAN"
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
                  <Icon size={13} className="duration-icon" />
                  {label}
                </span>
                <input
                  type="range"
                  className="duration-slider"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => onUpdate(key, Number(e.target.value))}
                />
                <span className="duration-value">{value}m</span>
              </div>
            ))}
          </div>

          <div className="setting-info">
            <SparkleIcon size={12} className="info-icon" />
            <span>計時結束時會自動顯示全螢幕放鬆畫面</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
