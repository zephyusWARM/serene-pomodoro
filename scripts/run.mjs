import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Prefer the invoking supported Node; use the installed Codex runtime on this Windows host.
const supported = version => { const [major, minor] = version.split('.').map(Number); return major >= 24 || (major === 22 && minor >= 20); };
let runtime = process.execPath;
if (!supported(process.versions.node)) {
  const bundled = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  if (!existsSync(bundled)) throw new Error('Use Node >=22.20 (or 24+) to run project quality gates.');
  const probe = spawnSync(bundled, ['-p', 'process.versions.node'], { encoding: 'utf8' });
  if (probe.status !== 0 || !supported(probe.stdout.trim())) throw new Error('No supported Node runtime found.');
  runtime = bundled;
}
const tasks = {
  build: ['node_modules/vite/bin/vite.js', 'build'],
  lint: ['node_modules/eslint/bin/eslint.js', '.','--max-warnings=0'],
  electron: ['node_modules/@playwright/test/cli.js', 'test'],
  unit: ['--test', 'tests/persistence.test.mjs', 'tests/weekSummary.test.mjs'],
  skills: ['scripts/skills-check.mjs'],
  'package:win': ['node_modules/electron-builder/cli.js', '--win', '--publish', 'never'],
};
const requested = process.argv[2];
const sequences = { quality: ['skills', 'lint', 'unit', 'build', 'electron'], 'dist:win': ['build', 'package:win'] };
const sequence = sequences[requested] || [requested];
for (const task of sequence) {
  if (!tasks[task]) throw new Error(`Unknown task: ${task}`);
  console.log(`\n[${task}] ${runtime}`);
  const result = spawnSync(runtime, [...tasks[task], ...process.argv.slice(3)], { stdio: 'inherit', env: { ...process.env, PATH: `${path.dirname(runtime)}${path.delimiter}${process.env.PATH}` } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
