export const DEFAULT_SETTINGS = {
  focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
  notificationType: 'chime', ambientSound: 'none', taskName: '',
};

export function normalizeSettings(value) {
  const result = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [key, min, max] of [['focusDuration', 5, 60], ['shortBreakDuration', 1, 15], ['longBreakDuration', 5, 30]]) {
    if (Number.isInteger(value[key]) && value[key] >= min && value[key] <= max) result[key] = value[key];
  }
  if (typeof value.taskName === 'string') result.taskName = value.taskName.slice(0, 30);
  if (['none', 'rain', 'forest', 'cafe'].includes(value.ambientSound)) result.ambientSound = value.ambientSound;
  return result;
}

export function normalizeStats(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([date, count]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isSafeInteger(count) && count >= 0));
}

export function readStats(storage) {
  try { return normalizeStats(JSON.parse(storage.getItem('zen-garden-stats'))); }
  catch { return {}; }
}
