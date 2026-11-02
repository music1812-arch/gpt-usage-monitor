import test from 'node:test';import assert from 'node:assert/strict';import {normalizeCodexRateLimits} from '../src/codex-normalize.mjs';
test('maps primary and secondary rate limits without duplicate windows',()=>{
const r=normalizeCodexRateLimits({result:{rateLimitsByLimitId:{codex:{primary:{usedPercent:25,windowDurationMins:300,resetsAt:1793630400},secondary:{usedPercent:60,windowDurationMins:10080,resetsAt:1794000000}}}}},'2026-11-03T00:00:00Z');
assert.equal(r.sources[0].state,'ok');assert.equal(r.sources[0].limits.length,2);assert.equal(r.sources[0].limits[0].remainingPercent,75);assert.equal(r.sources[0].limits[1].remainingPercent,40);
});
test('missing limits do not create fake usage',()=>{const r=normalizeCodexRateLimits({result:{}});assert.equal(r.sources[0].state,'not_connected');assert.deepEqual(r.sources[0].limits,[])});
test('rejects invalid payload',()=>assert.throws(()=>normalizeCodexRateLimits(null)));
test('clamps malformed percentages',()=>{const r=normalizeCodexRateLimits({rateLimits:{primary:{usedPercent:125}}});assert.equal(r.sources[0].limits[0].remainingPercent,0)});
