// Allowlisted bridge tasks, re-imported for every job (edit without restarting the bridge).
// Nothing from a job is interpolated into a shell: executables are spawned directly with argv arrays.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const IDE_DATA = path.join(HOME, '.gemini/antigravity-ide');

export function createTasks(root) {
  const node = process.execPath;
  const run = task => ({ cmd: node, args: [path.join(root, 'scripts/run.mjs'), task] });
  const which = name => {
    const r = spawnSync('where.exe', [name], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean) : [];
  };

  // Antigravity IDE agent API: the IDE ships `language_server agentapi`, which talks to the running
  // IDE language server. Its loopback session token is read from that process at call time and only
  // passed through the child environment (never written to results or logs).
  function agentApiExe() {
    for (const dir of [path.join(IDE_DATA, 'bin'), path.join(HOME, '.gemini/antigravity/bin')]) {
      const bat = path.join(dir, 'agentapi.bat');
      if (!fs.existsSync(bat)) continue;
      const m = fs.readFileSync(bat, 'utf8').match(/"([^"]+language_server[^"]*\.exe)"\s+agentapi/i);
      if (m && fs.existsSync(m[1])) return m[1];
    }
    throw new Error('agentapi client not found (is Antigravity IDE installed?)');
  }
  function lsSession() {
    const ps = spawnSync('powershell.exe', ['-NoProfile', '-Command',
      "$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'language_server*' -and $_.CommandLine -match 'subclient_type ide' } | Select-Object -First 1; " +
      "if ($p) { @{ cmd = $p.CommandLine; ports = @(Get-NetTCPConnection -State Listen -OwningProcess $p.ProcessId | Where-Object LocalAddress -eq '127.0.0.1' | ForEach-Object LocalPort | Sort-Object -Unique) } | ConvertTo-Json -Compress }"],
      { encoding: 'utf8', timeout: 60000, windowsHide: true });
    if (!ps.stdout.trim()) throw new Error('Antigravity IDE language server is not running (open Antigravity IDE)');
    const info = JSON.parse(ps.stdout);
    const token = (info.cmd.match(/--csrf_token\s+(\S+)/) || [])[1];
    if (!token) throw new Error('could not read the language server session token');
    return { token, ports: [].concat(info.ports || []).map(String) };
  }
  function agentApi(args) {
    const { token, ports } = lsSession();
    let last;
    for (const port of ports) {
      last = spawnSync(agentApiExe(), ['agentapi', ...args], { encoding: 'utf8', timeout: 120000, windowsHide: true,
        env: { ...process.env, ANTIGRAVITY_LS_ADDRESS: `127.0.0.1:${port}`, ANTIGRAVITY_CSRF_TOKEN: token } });
      // Non-gRPC ports drop the connection; try the next listening port.
      if (!/server preface|connection refused|forcibly closed/i.test(`${last.stdout}${last.stderr}`)) return last;
    }
    return last || { status: -1, stdout: '', stderr: 'no language server ports' };
  }
  function latestConversation() {
    const brain = path.join(IDE_DATA, 'brain');
    const dirs = fs.readdirSync(brain).filter(d => /^[0-9a-f-]{36}$/i.test(d))
      .map(d => ({ d, t: fs.statSync(path.join(brain, d)).birthtimeMs })).sort((x, y) => y.t - x.t);
    if (!dirs.length) throw new Error('no Antigravity conversations found');
    return dirs[0].d;
  }

  return {
    quality: () => run('quality'),
    lint: () => run('lint'),
    unit: () => run('unit'),
    build: () => run('build'),
    electron: () => run('electron'),
    'skills:check': () => run('skills'),
    'skills:sync': () => ({ cmd: node, args: [path.join(root, 'scripts/skills-bootstrap.mjs')] }),
    probe: () => ({ internal: () => JSON.stringify({ bridgeNode: process.version, platform: process.platform, root,
      found: Object.fromEntries(['git', 'node', 'python', 'claude', 'codex', 'gemini'].map(n => [n, which(n)])) }, null, 2) }),

    // Prompt the Antigravity agent (model = the one selected in its panel) in an existing conversation.
    // `new-conversation` needs an Agent Manager project id, so the target is an existing conversation:
    // job.conversationId, or the most recently created one. The task returns once delivered; the agent
    // is instructed to write its reply to .agent-bridge/antigravity/<job id>.md, which submit.mjs awaits.
    'antigravity:ask': job => ({ internal: async () => {
      if (typeof job.prompt !== 'string' || !job.prompt.trim()) throw new Error('antigravity:ask needs a non-empty "prompt"');
      const conv = job.conversationId || latestConversation();
      if (!/^[0-9a-f-]{36}$/i.test(conv)) throw new Error('invalid conversation id');
      const outRel = `.agent-bridge/antigravity/${job.id}.md`;
      const outAbs = path.join(root, outRel);
      fs.mkdirSync(path.dirname(outAbs), { recursive: true });
      fs.rmSync(outAbs, { force: true });
      const full = `${job.prompt.trim()}\n\n---\nBRIDGE PROTOCOL (required): When finished, write your COMPLETE final answer as Markdown to \`${outRel}\` in this workspace, in one write, as your last action. Do not modify any other file unless the request above explicitly asks you to.`;
      const r = agentApi(['send-message', conv, full]);
      if (r.status !== 0) throw new Error(`send-message failed: ${r.stdout}${r.stderr}`);
      // Return immediately so the bridge stays free; the client waits for the answer file.
      return JSON.stringify({ delivered: true, conversation: conv, answerFile: outRel });
    } }),
    // Live discovery check: ask headless Claude Code (fixed prompt, one turn, no tools) which skills it sees.
    'claude:skills': () => {
      const exe = which('claude.exe')[0] || which('claude')[0];
      if (!exe || !exe.toLowerCase().endsWith('.exe')) throw new Error('claude.exe not found on PATH');
      return { cmd: exe, args: ['-p', 'List the names of every skill available to you in this session, one per line, nothing else. Do not use any tools.', '--max-turns', '1', '--disallowedTools', 'Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch'] };
    },
    // Release helpers (explicitly requested by the user; fixed argv, no shell).
    // Build the renderer, then the NSIS/portable installers (run.mjs selects a supported Node).
    'package:win': () => run('dist:win'),
    'git:status': () => ({ cmd: 'git', args: ['status', '--short', '--branch'] }),
    // Commit everything not ignored, message read from .agent-bridge/commit-message.txt (-F).
    'git:commit': () => ({ internal: () => {
      const msg = path.join(root, '.agent-bridge/commit-message.txt');
      if (!fs.existsSync(msg)) throw new Error('missing .agent-bridge/commit-message.txt');
      const add = spawnSync('git', ['add', '-A'], { cwd: root, encoding: 'utf8' });
      if (add.status !== 0) throw new Error(add.stderr);
      const c = spawnSync('git', ['commit', '-F', msg], { cwd: root, encoding: 'utf8' });
      if (c.status !== 0) throw new Error(`${c.stdout}${c.stderr}`);
      return c.stdout;
    } }),
    'git:push-main': () => ({ cmd: 'git', args: ['push', 'origin', 'main'] }),
    // Silent per-user install of the freshly built NSIS installer for the current package version.
    'install:win': () => ({ internal: () => {
      const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
      const setup = path.join(root, 'release', `Serene Guardian Setup ${version}.exe`);
      if (!fs.existsSync(setup)) throw new Error(`installer not found: ${setup}`);
      spawnSync('taskkill.exe', ['/IM', 'Serene Guardian.exe', '/F'], { encoding: 'utf8' });
      const r = spawnSync(setup, ['/S'], { encoding: 'utf8', timeout: 10 * 60000, windowsHide: true });
      if (r.status !== 0) throw new Error(`installer exit ${r.status}: ${r.stderr}`);
      return `installed ${version} (installer exit 0)`;
    } }),
    'install:verify': () => ({ internal: () => {
      const q = spawnSync('powershell.exe', ['-NoProfile', '-Command',
        "$k = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object DisplayName -like 'Serene Guardian*' | Select-Object DisplayName,DisplayVersion,InstallLocation; " +
        "$p = Get-Process 'Serene Guardian' -ErrorAction SilentlyContinue | Select-Object Id,Path; " +
        "$r = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue; " +
        "@{ installed = $k; running = $p; startup = ($r.PSObject.Properties | Where-Object { $_.Value -like '*Serene*' } | ForEach-Object { $_.Name + ' = ' + $_.Value }) } | ConvertTo-Json -Depth 4"],
        { encoding: 'utf8', timeout: 60000, windowsHide: true });
      return q.stdout + q.stderr;
    } }),
    'launch:installed': () => ({ internal: () => {
      const exe = path.join(HOME, 'AppData/Local/Programs/Serene Guardian/Serene Guardian.exe');
      if (!fs.existsSync(exe)) throw new Error(`not found: ${exe}`);
      const child = spawn(exe, [], { detached: true, stdio: 'ignore' }); child.unref();
      return `launched ${exe}`;
    } }),
    'antigravity:latest': () => ({ internal: () => latestConversation() }),
    'antigravity:metadata': job => ({ internal: () => {
      if (!/^[0-9a-f-]{36}$/i.test(job.conversationId || '')) throw new Error('conversationId required');
      const r = agentApi(['get-conversation-metadata', job.conversationId]);
      return `${r.stdout}${r.stderr}`;
    } }),
  };
}
