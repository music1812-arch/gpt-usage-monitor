import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
for (const dir of ['src','tests','scripts','.']) for (const f of await readdir(dir)) {
  if (f.endsWith('.mjs')) execFileSync(process.execPath,['--check',`${dir}/${f}`]);
}
const usage=JSON.parse(await readFile('usage.json','utf8'));
assert.deepEqual(usage,{schemaVersion:1,observedAt:null,sources:['codex','api','chatgpt'].map(id=>({id,state:'not_connected',limits:[]}))},'Public usage.json must contain only the exact empty placeholder');
const tracked=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
for (const path of tracked) assert(!/(^|\/)(auth\.json|usage-private[^/]*|\.env(?:\..*)?|[^/]+\.(?:pem|key))$/i.test(path),'Private credential or snapshot file must not be tracked');
assert(!(await readFile('v2.html','utf8')).includes('localStorage'));
console.log('Syntax and public placeholder checks passed');
