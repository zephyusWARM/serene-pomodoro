import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, normalizeStats, readStats } from '../src/utils/persistence.js';

test('invalid stored settings cannot crash rendering or produce NaN timers', () => {
  for (const value of [null, [], 1, { focusDuration: -1, taskName: {}, shortBreakDuration: '5', longBreakDuration: 0 }]) {
    const settings = normalizeSettings(value);
    assert.equal(settings.focusDuration, 25);
    assert.equal(settings.taskName, '');
    assert.equal(settings.shortBreakDuration, 5);
    assert.equal(settings.longBreakDuration, 15);
  }
});
test('valid user preferences survive normalization', () => {
  assert.deepEqual(normalizeSettings({ focusDuration: 60, shortBreakDuration: 1, longBreakDuration: 30, taskName: '深度工作', ambientSound: 'rain' }), {
    focusDuration: 60, shortBreakDuration: 1, longBreakDuration: 30, taskName: '深度工作', ambientSound: 'rain', notificationType: 'chime',
  });
});
test('stats retain valid counts and recover from malformed JSON and shape', () => {
  for (const raw of ['{broken', 'null', '[]', '"oops"']) assert.deepEqual(readStats({ getItem: () => raw }), {});
  assert.deepEqual(normalizeStats({ '2026-09-21': 4, '2026-09-20': '2', '2026-09-19': -1, bad: 1 }), { '2026-09-21': 4 });
});
