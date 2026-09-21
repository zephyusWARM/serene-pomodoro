// Local agent bridge: lets another agent (e.g. Claude via a shared folder) run a fixed
// allowlist of project tasks on this Windows host without driving any GUI.
// Jobs:    .agent-bridge/jobs/<id>.json    {"id","task","prompt?","conversationId?","timeoutMs?"}
// Results: .agent-bridge/results/<id>.json {"id","task","status","exitCode","startedAt","finishedAt","log","tail"}
// Security: tasks are an allowlist (tasks.mjs); nothing from a job reaches a shell command line.
// Bound to this repository only. Start on Windows with: npm run bridge
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.join(root, '.agent-bridge');
const dirs = Object.fromEntries(['jobs', 'running', 'results', 'logs'].map(d => [d, path.join(base, d)]));
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });

// Task allowlist lives in tasks.mjs and is re-imported per job, so adding a task never needs a restart.
const loadTasks = async () => (await import(`./tasks.mjs?v=${Date.now()}`)).createTasks(root);
const write = (file, data) => { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, file); };
const tail = (s, n = 6000) => s.length > n ? s.slice(-n) : s;
let busy = false;

async function execute(job) {
  const started = new Date().toISOString();
  const logFile = path.join(dirs.logs, `${job.id}.log`);
  const result = { id: job.id, task: job.task, status: 'running', startedAt: started, log: path.relative(root, logFile) };
  write(path.join(dirs.results, `${job.id}.json`), result);
  try {
    const TASKS = await loadTasks();
    const factory = Object.hasOwn(TASKS, job.task) ? TASKS[job.task] : undefined;
    if (!factory) throw new Error(`Task not allowlisted: ${job.task}. Allowed: ${Object.keys(TASKS).join(', ')}`);
    const spec = factory(job);
    if (spec.internal) {
      const out = await spec.internal(); fs.writeFileSync(logFile, out);
      return { ...result, status: 'passed', exitCode: 0, tail: out };
    }
    const out = fs.createWriteStream(logFile);
    let text = '';
    const code = await new Promise(resolve => {
      const child = spawn(spec.cmd, spec.args, { cwd: root, env: process.env, windowsHide: true });
      const timeout = Math.max(1000, Math.min(Number(job.timeoutMs) || 20 * 60000, 60 * 60000));
      const timer = setTimeout(() => { text += `\n[bridge] timeout after ${timeout}ms\n`; child.kill(); }, timeout);
      for (const s of [child.stdout, child.stderr]) s.on('data', b => { out.write(b); text = tail(text + b.toString('utf8'), 200000); });
      child.on('error', e => { text += `\n[bridge] ${e.message}\n`; clearTimeout(timer); resolve(-1); });
      child.on('close', c => { clearTimeout(timer); resolve(c ?? -1); });
      if (spec.stdin !== undefined) child.stdin.end(spec.stdin); else child.stdin.end();
    });
    out.end();
    return { ...result, status: code === 0 ? 'passed' : 'failed', exitCode: code, tail: tail(text) };
  } catch (e) {
    fs.writeFileSync(logFile, String(e.stack || e));
    return { ...result, status: 'error', exitCode: -1, tail: String(e.message) };
  }
}

async function poll() {
  write(path.join(base, 'heartbeat.json'), { pid: process.pid, node: process.version, at: new Date().toISOString(), busy });
  if (busy) return;
  const next = fs.readdirSync(dirs.jobs).filter(f => f.endsWith('.json')).sort()[0];
  if (!next) return;
  busy = true;
  const claimed = path.join(dirs.running, next);
  try {
    fs.renameSync(path.join(dirs.jobs, next), claimed);
    let job;
    try { job = JSON.parse(fs.readFileSync(claimed, 'utf8')); } catch { job = {}; }
    // Safe file stem: no separators, and never a Windows reserved device name (CON, NUL, COM1, ...).
    const safeId = v => /^[\w.-]{1,80}$/.test(v || '') && !/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(v);
    job.id = safeId(job.id) ? job.id : `job-${Date.now()}`;
    console.log(`[bridge] ${new Date().toLocaleTimeString()} start ${job.id} (${job.task})`);
    const res = await execute(job);
    write(path.join(dirs.results, `${job.id}.json`), { ...res, finishedAt: new Date().toISOString() });
    console.log(`[bridge] ${job.id} -> ${res.status} (${res.exitCode})`);
  } finally { fs.rmSync(claimed, { force: true }); busy = false; }
}
console.log(`[bridge] watching ${dirs.jobs} (node ${process.version}). Ctrl+C to stop.`);
setInterval(() => poll().catch(e => console.error('[bridge]', e)), 1000);
