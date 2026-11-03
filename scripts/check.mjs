import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
for (const dir of ['src','tests','scripts','.']) for (const f of await readdir(dir)) {
  if (f.endsWith('.mjs')) execFileSync(process.execPath,['--check',`${dir}/${f}`]);
}
const usage=JSON.parse(await readFile('usage.json','utf8'));
assert.equal(usage.observedAt,null);
for (const s of usage.sources) {assert.equal(s.state,'not_connected');assert.deepEqual(s.limits,[]);assert.equal(s.metrics,undefined);}
assert(!(await readFile('v2.html','utf8')).includes('localStorage'));
console.log('Syntax and public placeholder checks passed');
