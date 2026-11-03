import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {normalizeCodexRateLimits} from './codex-normalize.mjs';

// Only the official local app-server's read-only account methods. Never start inference or login.
export async function collectCodex({enabled = false, spawnImpl = spawn, timeoutMs = 15000, executable = 'codex'} = {}) {
  if (!enabled) return {id:'codex',state:'not_connected',limits:[],message:'尚未启用已授权的本机 Codex'};
  const env = {...process.env};
  delete env.MONITOR_PASSWORD; delete env.OPENAI_ADMIN_KEY;
  const child = spawnImpl(executable,['app-server'],{stdio:['pipe','pipe','ignore'],env});
  const lines = createInterface({input:child.stdout});
  const pending = new Map(); let id = 0, buffered = 0;
  const fail = () => { for (const {reject} of pending.values()) reject(Error('codex_unavailable')); pending.clear(); };
  child.on('error',fail); child.on('exit',fail); child.stdin.on('error',fail);
  lines.on('line',line => {
    buffered += line.length;
    if (buffered > 1024 * 1024) { fail(); child.kill(); return; }
    let msg; try { msg = JSON.parse(line); } catch { fail(); return; }
    const p = pending.get(msg.id); if (!p) return;
    pending.delete(msg.id); msg.error ? p.reject(Error('codex_read_failed')) : p.resolve(msg.result);
  });
  const send = msg => child.stdin.write(JSON.stringify(msg)+'\n');
  const rpc = (method,params) => new Promise((resolve,reject) => { const next=++id; pending.set(next,{resolve,reject}); send({id:next,method,...(params ? {params} : {})}); });
  const timer = setTimeout(() => { fail(); child.kill(); },timeoutMs);
  try {
    await rpc('initialize',{clientInfo:{name:'gpt_usage_monitor',version:'2.0.0'}});
    send({method:'initialized'});
    const account = await rpc('account/read',{refreshToken:false});
    if (account?.account?.type !== 'chatgpt') return {id:'codex',state:'not_connected',limits:[],message:'需要官方 ChatGPT 登录；API Key 登录不提供订阅额度'};
    const result = await rpc('account/rateLimits/read');
    return {...normalizeCodexRateLimits({result}).sources[0], observedAt:new Date().toISOString(),origin:'Codex App Server account/rateLimits/read',message:'账户额度；云端 / Work 覆盖范围待官方页面核对'};
  } finally { clearTimeout(timer); lines.close(); child.kill(); }
}
