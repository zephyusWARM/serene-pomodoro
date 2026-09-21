import { test, expect, _electron as electron } from '@playwright/test';
import axe from 'axe-core';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let app, page, profile, errors;
const root = process.cwd();
async function launch() {
  const env = { ...process.env, NODE_ENV: 'production', SERENE_TEST_PROFILE: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ args: [path.join(root, 'tests/electron/launch.cjs')], env });
  app.on('console', msg => { if (msg.type() === 'error') errors.push(`main: ${msg.text()}`); });
  app.on('window', win => monitor(win));
  page = await app.firstWindow();
  monitor(page);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.timer-container')).toBeVisible();
}
function monitor(win) {
  win.on('pageerror', error => errors.push(error.message));
  win.on('console', msg => { if (msg.type() === 'error') errors.push(`${msg.text()} ${msg.location().url}`); });
  win.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
}
async function dismissMorning() {
  if (await page.locator('.morning-close-corner').isVisible()) await page.locator('.morning-close-corner').click();
}
async function capture(name, target = page) {
  await mkdir('artifacts/electron/screenshots', { recursive: true });
  await target.screenshot({ path: `artifacts/electron/screenshots/${name}.png`, animations: 'disabled' });
}
async function windows() {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({
    url: w.webContents.getURL(), visible: w.isVisible(), top: w.isAlwaysOnTop(),
    bounds: w.getBounds(), focusable: w.isFocusable(),
    isolated: w.webContents.getLastWebPreferences().contextIsolation,
    node: w.webContents.getLastWebPreferences().nodeIntegration,
  })));
}
async function jump(ms) {
  // Change wall time only; real production setInterval and IPC still run.
  await page.evaluate(delta => {
    window.__qaOffset = (window.__qaOffset || 0) + delta;
    window.__qaNow ??= Date.now.bind(Date);
    Date.now = () => window.__qaNow() + window.__qaOffset;
  }, ms);
  await page.waitForTimeout(350);
}
const timer = () => page.locator('.timer-container');
// Layout probe: the break quote must stay inside the ring and never overlap the mode tabs,
// even for the longest quote the product can show (text is swapped in place, layout is real).
async function expectBreakQuoteContained() {
  const longest = await page.evaluate(() => {
    const main = document.querySelector('.quote-main');
    const sub = document.querySelector('.quote-sub');
    main.textContent = 'The best time to plant a tree was 20 years ago. The second best is now.';
    sub.textContent = 'Every break fuels the next breakthrough.';
    const box = el => el.getBoundingClientRect();
    const quote = box(document.querySelector('.break-quote'));
    const ring = box(document.querySelector('.timer-container'));
    const tabs = box(document.querySelector('.segmented-control'));
    return { quote: { top: quote.top, bottom: quote.bottom, left: quote.left, right: quote.right },
      ring: { top: ring.top, bottom: ring.bottom, left: ring.left, right: ring.right }, tabsTop: tabs.top,
      clipped: main.scrollHeight > main.clientHeight + 1 || sub.scrollHeight > sub.clientHeight + 1 };
  });
  expect(longest.quote.bottom, 'quote must end above the mode tabs').toBeLessThan(longest.tabsTop);
  expect(longest.quote.bottom, 'quote must stay inside the ring').toBeLessThanOrEqual(longest.ring.bottom);
  expect(longest.quote.left).toBeGreaterThanOrEqual(longest.ring.left);
  expect(longest.quote.right).toBeLessThanOrEqual(longest.ring.right);
  expect(longest.clipped, 'longest shipped quote must not be truncated').toBe(false);
}
const start = () => page.locator('.main-action-btn').click();
const reset = () => page.locator('.reset-btn').click();

test.beforeEach(async () => {
  errors = [];
  profile = await mkdtemp(path.join(os.tmpdir(), 'serene-electron-'));
  await launch();
  await dismissMorning();
});
test.afterEach(async () => {
  try {
    await capture('last-state');
    expect(errors, 'No renderer or main console errors').toEqual([]);
  } finally { if (app) await app.close(); }
});

test('real desktop lifecycle, background countdown, pause/reset and preferences survive restart', async () => {
  expect(await page.evaluate(() => window.electronAPI.isElectron)).toBe(true);
  await expect.poll(async () => (await windows()).length).toBe(1);
  await expect.poll(async () => (await windows())[0]).toMatchObject({ top: true, isolated: true, node: false, bounds: { width: 340, height: 480 } });
  await capture('focus-idle');
  await start();
  await expect(timer()).toHaveAttribute('data-active', 'true');
  await page.locator('.tray-hide-btn').click();
  expect((await windows())[0].visible).toBe(false);
  const before = await page.locator('.time').innerText();
  await page.waitForTimeout(1600);
  expect(await page.locator('.time').innerText()).not.toBe(before);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  await expect.poll(async () => (await windows())[0], 'widget is visible and still topmost after restore').toMatchObject({ visible: true, top: true });
  await start();
  await expect(timer()).toHaveAttribute('data-active', 'false');
  const paused = await page.locator('.time').innerText();
  await page.waitForTimeout(1200);
  expect(await page.locator('.time').innerText()).toBe(paused);
  await reset();
  await expect(page.locator('.time')).toHaveText('25:00');
  await page.getByRole('button', { name: '偏好設定', exact: true }).click();
  await page.locator('.task-name-input').fill('Acceptance 設定');
  await page.locator('.duration-slider').first().fill('30');
  await capture('settings');
  await app.close();
  await launch();
  await dismissMorning();
  await expect(page.locator('.time')).toHaveText('30:00');
  await page.getByRole('button', { name: '偏好設定', exact: true }).click();
  await expect(page.locator('.task-name-input')).toHaveValue('Acceptance 設定');
});

test('four focus cycles, real glow windows, break waits for user and stats persist', async () => {
  for (let cycle = 1; cycle <= 4; cycle++) {
    if (cycle === 1) await start();
    await jump(25 * 60000 + 1000);
    await expect(timer()).toHaveAttribute('data-mode', cycle === 4 ? 'longBreak' : 'shortBreak');
    await expect(timer()).toHaveAttribute('data-active', 'true');
    await expect.poll(async () => (await windows()).filter(w => w.url.includes('break-glow')).length).toBeGreaterThan(0);
    if (cycle === 1) {
      const glow = app.windows().find(w => w.url().includes('break-glow'));
      await capture('break-glow', glow);
      await expectBreakQuoteContained();
      await capture('short-break');
      await start();
      await expect.poll(async () => (await windows()).filter(w => w.url.includes('break-glow')).length).toBe(0);
      await start();
    }
    if (cycle === 4) await capture('long-break');
    await jump((cycle === 4 ? 15 : 5) * 60000 + 1000);
    await expect(page.locator('.break-done-btn')).toBeVisible();
    await expect(timer()).toHaveAttribute('data-active', 'false');
    await expect.poll(async () => (await windows()).filter(w => w.url.includes('break-glow')).length).toBe(0);
    await capture('break-complete');
    await page.waitForTimeout(500);
    await expect(timer()).toHaveAttribute('data-active', 'false');
    await page.locator('.break-done-btn').click();
    await expect(timer()).toHaveAttribute('data-mode', 'focus');
    await expect(timer()).toHaveAttribute('data-active', 'true');
  }
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('zen-garden-stats')));
  expect(Object.values(stats)).toEqual([4]);
  await app.close();
  await launch();
  expect(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('zen-garden-stats'))))).toEqual([4]);
});

test('keyboard control semantics, modal focus isolation and renderer accessibility', async () => {
  const settings = page.getByRole('button', { name: '偏好設定', exact: true });
  await settings.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.settings-panel')).toBeVisible();
  await expect(timer()).toHaveAttribute('data-active', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('.settings-panel')).toBeHidden();
  await expect(settings).toBeFocused();
  await page.locator('.morning-intention-badge').click();
  await capture('morning-intention');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  for (const state of ['idle', 'settings']) {
    if (state === 'settings') await settings.click();
    await page.evaluate(axe.source);
    const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    await writeFile(`artifacts/electron/axe-${state}.json`, JSON.stringify(results, null, 2));
    expect(results.violations, `${state} WCAG violations`).toEqual([]);
  }
});

test('invalid persisted values recover without breaking completion', async () => {
  await page.evaluate(() => {
    localStorage.setItem('serene-settings', JSON.stringify({ focusDuration: -1, shortBreakDuration: 'oops', taskName: {}, ambientSound: 'invalid' }));
    localStorage.setItem('zen-garden-stats', '{broken');
  });
  await page.reload();
  await dismissMorning();
  await expect(page.locator('.time')).toHaveText('25:00');
  await start();
  await jump(25 * 60000 + 1000);
  await expect(timer()).toHaveAttribute('data-mode', 'shortBreak');
  expect(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('zen-garden-stats'))))).toEqual([1]);
});

test('twenty elapsed minutes trigger real reminder and reset re-arms it; suspend pauses safely', async () => {
  const settings = page.getByRole('button', { name: '偏好設定', exact: true });
  await settings.click();
  await page.getByRole('slider', { name: '專注時段' }).fill('60');
  await page.keyboard.press('Escape');
  await start();
  await jump(19 * 60000);
  expect((await windows()).filter(w => w.url.includes('eye-reminder'))).toHaveLength(0);
  await jump(61000);
  await expect.poll(async () => (await windows()).filter(w => w.url.includes('eye-reminder')).length).toBe(1);
  const eye = app.windows().find(w => w.url().includes('eye-reminder'));
  await expect(eye.locator('#title')).toHaveText('看向遠方 20 秒');
  // Measure the settled layout: wait for finite entrance animations (not the infinite pulse).
  await eye.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished)));
  const fit = await eye.evaluate(() => ({ card: document.querySelector('.reminder-card').getBoundingClientRect().bottom, h: window.innerHeight,
    countdown: document.getElementById('countdown').getBoundingClientRect().bottom }));
  expect(fit.card, 'reminder card fits its window').toBeLessThanOrEqual(fit.h);
  expect(fit.countdown, 'countdown is visible').toBeLessThanOrEqual(fit.h);
  await capture('eye-reminder', eye);
  // The real close IPC destroys the page that invoked it, so fire it without awaiting in-page,
  // then assert from the main process that the reminder window is really gone.
  await eye.evaluate(() => { setTimeout(() => window.eyeReminderAPI.close(), 0); });
  await expect.poll(async () => (await windows()).filter(w => w.url.includes('eye-reminder')).length).toBe(0);
  await reset();
  await start();
  await jump(20 * 60000 + 1000);
  await expect.poll(async () => (await windows()).filter(w => w.url.includes('eye-reminder')).length).toBe(1);
  await reset();
  await start();
  await app.evaluate(({ powerMonitor }) => powerMonitor.emit('suspend'));
  await expect(timer()).toHaveAttribute('data-active', 'false');
  const suspended = await page.locator('.time').textContent();
  await jump(90 * 60000);
  await app.evaluate(({ powerMonitor }) => powerMonitor.emit('resume'));
  await expect(timer()).toHaveAttribute('data-mode', 'focus');
  await expect(timer()).toHaveAttribute('data-active', 'false');
  await expect(page.locator('.time')).toHaveText(suspended);
  expect(await page.evaluate(() => localStorage.getItem('zen-garden-stats'))).toBeNull();
});
