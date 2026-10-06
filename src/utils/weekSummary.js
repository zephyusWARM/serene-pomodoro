const pad = (n) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD, the key format used by the stored daily stats. */
export const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dayOffset = (now, back) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);

// Stats are pruned to 90 days, so no streak can be longer than this.
const MAX_STREAK_DAYS = 90;

/**
 * Summarise already-normalised daily stats (date -> completed focus sessions) for the last seven days.
 * `days` runs oldest to newest and always ends with today. A streak counts consecutive days with at
 * least one session, back from today; a day that has not happened yet (today with no session so far)
 * does not break the streak that ended yesterday.
 */
export function summarizeWeek(stats, now = new Date()) {
  const countOn = (date) => stats[dateKey(date)] || 0;

  const days = [];
  for (let back = 6; back >= 0; back--) {
    const date = dayOffset(now, back);
    days.push({ key: dateKey(date), weekday: date.getDay(), count: countOn(date), isToday: back === 0 });
  }

  let streak = 0;
  for (let back = countOn(now) > 0 ? 0 : 1; back <= MAX_STREAK_DAYS; back++) {
    if (countOn(dayOffset(now, back)) === 0) break;
    streak++;
  }

  return {
    days,
    weekTotal: days.reduce((sum, day) => sum + day.count, 0),
    max: days.reduce((best, day) => Math.max(best, day.count), 0),
    streak,
  };
}
