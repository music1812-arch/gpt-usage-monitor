import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {collectCodex} from '../src/codex-collector.mjs';
const fake=(mode='chatgpt')=>()=>spawn(process.execPath,['--input-type=module','-e',`
import {createInterface} from 'node:readline';
const lines=createInterface({input:process.stdin});let initialized=false;
lines.on('line',line=>{const r=JSON.parse(line);if(r.method==='initialized'){initialized=true;return;}
let result={};if(r.method==='account/read'){if(!initialized)process.exit(2);result={account:{type:'${mode}'}};}
if(r.method==='account/rateLimits/read')result={rateLimits:{primary:{usedPercent:32,resetsAt:1999999999}}};
console.log(JSON.stringify({id:r.id,result}));});`],{stdio:['pipe','pipe','ignore']});
test('official stdio handshake and account read normalize quota',async()=>{
 const s=await collectCodex({enabled:true,spawnImpl:fake()});assert.equal(s.state,'ok');assert.equal(s.limits[0].remainingPercent,68);
});
test('API-key auth cannot become subscription quota',async()=>assert.equal((await collectCodex({enabled:true,spawnImpl:fake('apiKey')})).state,'not_connected'));
test('disabled never starts process',async()=>assert.equal((await collectCodex({spawnImpl:()=>assert.fail()})).state,'not_connected'));
test('process spawn failure rejects cleanly',async()=>assert.rejects(collectCodex({enabled:true,spawnImpl:()=>spawn('/missing-codex')}),/codex_unavailable/));
test('hung app server times out',async()=>assert.rejects(collectCodex({enabled:true,timeoutMs:50,spawnImpl:()=>spawn(process.execPath,['-e','setInterval(()=>{},1000)'])}),/codex_unavailable/));
