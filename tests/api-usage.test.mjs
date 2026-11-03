import test from 'node:test';
import assert from 'node:assert/strict';
import {collectApiUsage} from '../src/api-usage-collector.mjs';
const json = b => new Response(JSON.stringify(b));
const usage = {input_tokens:100,output_tokens:20,num_model_requests:2};
test('no key performs no request',async () => {
  const s=await collectApiUsage({fetchImpl:() => assert.fail('network')}); assert.equal(s.state,'not_connected');
});
test('paginates completions and costs without counting subscription quota',async () => {
  const urls=[];
  const s=await collectApiUsage({key:'test-only',now:1793664000000,fetchImpl:async (u,opts) => {
    urls.push(u);assert.equal(opts.headers.Authorization,'Bearer test-only');assert.equal(u.origin,'https://api.openai.com');
    if (u.pathname.endsWith('costs')) return json({data:[{results:[{amount:{value:0.42,currency:'usd'}}]}],has_more:false});
    return json({data:[{results:[usage]}],has_more:!u.searchParams.has('page'),next_page:'next'});
  }});
  assert.equal(urls.length,3);assert.equal(s.metrics.requests,4);assert.equal(s.metrics.inputTokens,200);assert.equal(s.metrics.costs.usd,0.42);assert.deepEqual(s.limits,[]);
  assert.equal(Number(urls[0].searchParams.get('end_time'))-Number(urls[0].searchParams.get('start_time')),86400);
});
test('bounded retries for transient errors, never leaks response or key',async () => {
  let calls=0;const sleeps=[];
  await assert.rejects(collectApiUsage({key:'SECRET',sleep:async ms => sleeps.push(ms),fetchImpl:async () => {calls++;return new Response('SECRET',{status:429,headers:{'retry-after':'100'}});}}),/http_429/);
  assert.equal(calls,3);assert.deepEqual(sleeps,[5000,5000]);
});
test('unauthorized response is not retried',async () => {
  let calls=0;await assert.rejects(collectApiUsage({key:'test',fetchImpl:async () => {calls++;return new Response('secret',{status:401});}}),/http_401/);assert.equal(calls,1);
});
test('rejects malformed and looping pagination',async () => {
  await assert.rejects(collectApiUsage({key:'test',fetchImpl:async () => json({data:[{}],has_more:false})}),/invalid_response/);
  await assert.rejects(collectApiUsage({key:'test',fetchImpl:async () => json({data:[],has_more:true,next_page:'same'})}),/invalid_pagination/);
});
test('network failures retry and succeed without false zero on malformed usage',async () => {
  let calls=0;
  const s=await collectApiUsage({key:'test',sleep:async()=>{},fetchImpl:async()=>{if(++calls===1)throw Error('secret');return json({data:[],has_more:false});}});
  assert.equal(s.metrics.requests,0);assert.equal(calls,3);
  await assert.rejects(collectApiUsage({key:'test',fetchImpl:async()=>json({data:[{results:[{}]}],has_more:false})}),/invalid_usage/);
});
