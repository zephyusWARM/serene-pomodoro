import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const source = path.join(root, '.agents', 'skills');
export const adapters = ['.claude'];
export function skillNames() {
  return fs.readdirSync(source, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(source, d.name, 'SKILL.md'))).map(d => d.name).sort();
}
export function bootstrap() {
  for (const agent of adapters) {
    const folder = path.join(root, agent, 'skills');
    fs.mkdirSync(folder, { recursive: true });
    for (const name of skillNames()) {
      const link = path.join(folder, name), target = path.join(source, name);
      if (fs.existsSync(link)) {
        if (!fs.lstatSync(link).isSymbolicLink() || fs.realpathSync(link) !== fs.realpathSync(target)) throw new Error(`Refusing to overwrite independent skill: ${link}`);
        continue;
      }
      try { fs.symlinkSync(path.relative(folder, target), link, 'dir'); }
      catch (error) {
        if (process.platform !== 'win32' || !['EPERM','EACCES'].includes(error.code)) throw error;
        fs.symlinkSync(target, link, 'junction');
      }
    }
  }
  console.log(`Linked ${skillNames().length} canonical skills for Claude Code; Codex/Gemini/Antigravity use .agents/skills directly.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) bootstrap();
