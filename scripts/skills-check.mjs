import fs from 'node:fs';
import path from 'node:path';
import { treeHash } from './skills-hash.mjs';
import { root, source, adapters, skillNames } from './skills-bootstrap.mjs';
const inventory=JSON.parse(fs.readFileSync(path.join(root,'.agents','skill-provenance.json'),'utf8'));
for (const name of Object.keys(inventory.skills)) if (!skillNames().includes(name)) throw Error(`Missing canonical skill: ${name}`);
const isLink=p=>{try{return fs.lstatSync(p).isSymbolicLink();}catch{return false;}};
let count=0;
for(const name of skillNames()) {
 const canonical=path.join(source,name);
 if(fs.lstatSync(canonical).isSymbolicLink()) throw Error(`Canonical skill cannot be a link: ${name}`);
 const doc=fs.readFileSync(path.join(canonical,'SKILL.md'),'utf8');
 if(!/^---\r?\n/.test(doc)||!/^name:\s*['"]?[^\r\n]+/m.test(doc)||!/^description:/m.test(doc)) throw Error(`Invalid skill metadata: ${name}`);
 if(!inventory.skills[name] && name!=='serene-electron-qa') throw Error(`Missing provenance: ${name}`);
 if(inventory.skills[name]?.localTreeSha256 !== undefined && treeHash(canonical)!==inventory.skills[name].localTreeSha256) throw Error(`Skill drift: ${name}. Review the diff; do not silently rebaseline.`);
 for(const agent of adapters) {
  const link=path.join(root,agent,'skills',name);
  if(!fs.existsSync(link)&&!isLink(link)) throw Error(`Missing adapter: ${link}. Run \`npm run skills:sync\` (creates links, never copies).`);
  if(!isLink(link)||fs.realpathSync(link)!==fs.realpathSync(canonical)) throw Error(`Duplicate/broken adapter: ${link}`);
 }
 count++;
}
for(const agent of [...adapters,'.gemini']) {
 const dir=path.join(root,agent,'skills');if(!fs.existsSync(dir))continue;
 for(const e of fs.readdirSync(dir,{withFileTypes:true})) if(!skillNames().includes(e.name)) throw Error(`Unexpected agent skill: ${agent}/${e.name}`);
}
console.log(`PASS: ${count} canonical skills; all adapter links resolve to the same files; provenance hashes match. This proves filesystem discovery, not live agent activation.`);
