import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function treeHash(folder) {
 const hash=crypto.createHash('sha256');
 function walk(dir) {
  for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
   if(['__pycache__','.git','bin'].includes(e.name)||e.name.endsWith('.pyc')) continue;
   const file=path.join(dir,e.name);
   if(e.isDirectory()) walk(file);
   else { hash.update(path.relative(folder,file).replaceAll('\\','/')+'\0'); const bytes=fs.readFileSync(file); hash.update(bytes.includes(0)?bytes:bytes.toString('utf8').replaceAll('\r\n','\n')); }
  }
 }
 walk(folder);return hash.digest('hex');
}
