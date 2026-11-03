import test from 'node:test';import assert from 'node:assert/strict';
import {card,sourceState,view} from '../app.mjs';
test('API metrics render as connected without subscription percentages',()=>{
  const html=card({id:'api',name:'API',state:'ok',observedAt:new Date().toISOString(),metrics:{requests:2,inputTokens:10,outputTokens:20,costs:{usd:0.1}}});assert.match(html,/已同步/);assert.match(html,/2 次模型请求/);assert(!/剩余 [\d.]+%/.test(html));
});
test('source ages independently and preserves historical data on fetch failure',()=>{
  const source={id:'codex',state:'ok',observedAt:'2026-01-01T00:00:00Z',limits:[{usedPercent:25}]};assert.equal(sourceState(source,Date.parse('2026-01-01T00:16:00Z')),'stale');
  const s=view({sources:[source]},true)[0];assert.equal(s.state,'error');assert.match(card(s),/上次读取/);
});
test('escapes upstream content and missing reset is unknown',()=>{
  const html=card({name:'<script>',state:'ok',observedAt:new Date().toISOString(),limits:[{id:'<img>',usedPercent:20,resetsAt:null}]});assert(!html.includes('<script>'));assert.match(html,/重置 未知/);
});
