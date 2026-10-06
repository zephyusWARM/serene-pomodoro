import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, summarizeWeek } from '../src/utils/weekSummary.js';

const now = new Date(2026, 9, 6, 12, 30); // Tuesday, 6 Oct 2026, local time

test('dateKey uses the local calendar date', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(dateKey(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('week runs oldest to newest across a month boundary and ends with today', () => {
  const { days } = summarizeWeek({}, now);
  assert.deepEqual(days.map((day) => day.key), [
    '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06',
  ]);
  assert.deepEqual(days.map((day) => day.isToday), [false, false, false, false, false, false, true]);
  assert.equal(days.at(-1).weekday, 2);
});

test('totals only count the visible week and max is the busiest day', () => {
  const summary = summarizeWeek({ '2026-10-06': 3, '2026-10-04': 5, '2026-09-29': 9 }, now);
  assert.equal(summary.weekTotal, 8);
  assert.equal(summary.max, 5);
  assert.equal(summary.days[0].count, 0);
});

test('streak counts consecutive days back from today, across the week boundary', () => {
  const stats = {};
  for (const key of ['2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01', '2026-09-30', '2026-09-29']) stats[key] = 1;
  assert.equal(summarizeWeek(stats, now).streak, 8);
});

test('an idle today does not break yesterday\'s streak, but a missed day does', () => {
  assert.equal(summarizeWeek({ '2026-10-05': 2, '2026-10-04': 1 }, now).streak, 2);
  assert.equal(summarizeWeek({ '2026-10-06': 1, '2026-10-04': 4 }, now).streak, 1);
  assert.equal(summarizeWeek({ '2026-10-04': 4 }, now).streak, 0);
  assert.equal(summarizeWeek({}, now).streak, 0);
});
