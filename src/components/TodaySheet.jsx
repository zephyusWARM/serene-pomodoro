import React, { useEffect, useRef } from 'react';
import useDialogFocus from '../hooks/useDialogFocus';
import { readStats } from '../utils/persistence';
import { summarizeWeek } from '../utils/weekSummary';
import { CloseIcon } from './Icons';
import './TodaySheet.css';

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_LONG = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
// Bars scale to the busiest day, but never so tightly that one session looks like a full day.
const MIN_SCALE = 4;

const describe = ({ weekTotal, streak }) => {
  if (weekTotal === 0) return '這週還沒有專注紀錄，開始第一段吧。';
  const streakText = streak > 1 ? `，已連續 ${streak} 天` : '';
  return `這週完成 ${weekTotal} 段專注${streakText}。`;
};

function TodaySheetContent({ todayCount, onClose }) {
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, true);

  // Read on every render: the sheet is small, the stored stats already include each finished session,
  // and todayCount re-renders it right after one is saved, so the bars and streak never go stale.
  const summary = summarizeWeek(readStats(localStorage));

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const scale = Math.max(MIN_SCALE, summary.max);

  return (
    <div
      className="sheet-overlay"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="sheet"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
      >
        {/* Grabber: also the part of the sheet that still drags the window. */}
        <div className="sheet-grabber" />

        <div className="sheet-head">
          <div className="sheet-heading">
            <h2 className="sheet-title" id="sheet-title">本週</h2>
            <p className="sheet-summary">{describe(summary)}</p>
          </div>
          <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="關閉" title="關閉 (Esc)">
            <CloseIcon size={14} />
          </button>
        </div>

        <ul className="week" aria-label="最近七天的專注段數">
          {summary.days.map((day) => (
            <li
              key={day.key}
              className={`week-day${day.isToday ? ' today' : ''}`}
              aria-label={`${WEEKDAY_LONG[day.weekday]}${day.isToday ? '（今天）' : ''} ${day.count} 段`}
            >
              <span className="week-count" aria-hidden="true">{day.count > 0 ? day.count : ''}</span>
              <span className="week-track" aria-hidden="true">
                <span
                  className="week-bar"
                  style={{ height: day.count > 0 ? `${Math.max(8, (day.count / scale) * 100)}%` : '3px' }}
                />
              </span>
              <span className="week-label" aria-hidden="true">{WEEKDAY_SHORT[day.weekday]}</span>
            </li>
          ))}
        </ul>

        <p className="sheet-today">
          今日 <span className="sheet-today-count">{todayCount}</span> 段
        </p>
      </div>
    </div>
  );
}

export default function TodaySheet({ visible, todayCount, onClose }) {
  if (!visible) return null;
  return <TodaySheetContent todayCount={todayCount} onClose={onClose} />;
}
