// Client: node scripts/agent-bridge/submit.mjs <task> [--prompt-file f] [--conversation id] [--timeout ms] [--no-wait]
// Writes a job into .agent-bridge/jobs and waits for the Windows-side bridge result.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.join(root, '.agent-bridge');
const [task, ...rest] = process.argv.slice(2);
if (!task) { console.error('usage: submit.mjs <task> [--prompt-file f] [--model m] [--timeout ms] [--no-wait]'); process.exit(2); }
const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const hb = path.join(base, 'heartbeat.json');
async function waitForAnswer(file, until) {
  let last = -1, since = 0;
  while (Date.now() < until) {
    await new Promise(r => setTimeout(r, 3000));
    if (!fs.existsSync(file)) continue;
    const size = fs.statSync(file).size;
    if (size > 0 && size === last) { if (Date.now() - since > 6000) { console.log(fs.readFileSync(file, 'utf8')); return 0; } }
    else { last = size; since = Date.now(); }
  }
  console.error(`no answer yet; it will appear at ${file}`); return 4;
}
const alive = fs.existsSync(hb) && Date.now() - Date.parse(JSON.parse(fs.readFileSync(hb, 'utf8')).at) < 15000;
if (!alive) { console.error('Bridge not running (no heartbeat in 15s). Start it on Windows: npm run bridge'); process.exit(3); }
const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${task.replace(/[^\w-]/g, '_')}`;
const job = { id, task };
if (opt('--prompt-file')) job.prompt = fs.readFileSync(opt('--prompt-file'), 'utf8');
if (opt('--conversation')) job.conversationId = opt('--conversation');
if (opt('--timeout')) job.timeoutMs = Math.max(1000, Number(opt('--timeout')) || 0);
fs.mkdirSync(path.join(base, 'jobs'), { recursive: true });
const tmp = path.join(base, `${id}.tmp`); fs.writeFileSync(tmp, JSON.stringify(job)); fs.renameSync(tmp, path.join(base, 'jobs', `${id}.json`));
console.log(`submitted ${id}`);
if (rest.includes('--no-wait')) process.exit(0);
const resFile = path.join(base, 'results', `${id}.json`);
const deadline = Date.now() + (job.timeoutMs || 20 * 60000) + 60000;
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 2000));
  if (!fs.existsSync(resFile)) continue;
  let res; try { res = JSON.parse(fs.readFileSync(resFile, 'utf8')); } catch { continue; }
  if (res.status === 'running') continue;
  if (task === 'antigravity:ask' && res.status === 'passed') {
    // Delivered; now wait for the agent's answer file (written into the shared workspace).
    const { answerFile, conversation } = JSON.parse(res.tail);
    console.log(`delivered to ${conversation}; waiting for ${answerFile}`);
    process.exit(await waitForAnswer(path.join(root, answerFile), deadline));
  }
  console.log(res.tail); console.log(`\n[${res.status}] exit=${res.exitCode} log=${res.log}`);
  process.exit(res.status === 'passed' ? 0 : 1);
}
console.error(`timed out waiting; check later: ${resFile}`); process.exit(4);
