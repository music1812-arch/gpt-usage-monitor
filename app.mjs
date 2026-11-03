const SOURCES = [{id:'codex',name:'Codex 账户额度'},{id:'api',name:'OpenAI API · 独立计费'},{id:'chatgpt',name:'ChatGPT 普通功能'}];
export const safe = s => String(s ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function stamp(value) { const n = Date.parse(value); return Number.isFinite(n) ? new Date(n).toLocaleString('zh-CN') : '暂无'; }
export function sourceState(s, now = Date.now()) {
  if (s.state !== 'ok') return s.state;
  const age = now - Date.parse(s.observedAt);
  return !Number.isFinite(age) || age < -60000 || age > 900000 || s.limits?.some(l => l.resetsAt && l.resetsAt * 1000 <= now) ? 'stale' : 'ok';
}
export function card(s) {
  const state = sourceState(s), labels = {ok:'已同步',stale:'数据过期',error:'读取失败',not_connected:'未连接'};
  let content = '';
  if (state === 'ok' || state === 'stale' || state === 'error') {
    const historical = state !== 'ok' ? '上次读取 · ' : '';
    for (const l of s.limits || []) {
      if (!Number.isFinite(l.usedPercent)) continue;
      const used = Math.min(100,Math.max(0,l.usedPercent));
      content += `<div class="big">${historical}剩余 ${(100-used).toFixed(1)}%</div><div class="bar"><div class="fill" style="width:${100-used}%"></div></div><p class="muted">${safe(l.id)} · 已用 ${used.toFixed(1)}% · 窗口 ${safe(l.windowDurationMins ?? '未知')} 分钟<br>重置 ${l.resetsAt ? stamp(new Date(l.resetsAt*1000).toString()) : '未知'}</p>`;
    }
    if (s.id === 'api' && s.metrics) {
      const m=s.metrics;
      content += `<div class="big">${historical}${safe(m.requests)} 次模型请求</div><p>输入 ${safe(m.inputTokens)} / 输出 ${safe(m.outputTokens)} tokens（仅 completions）</p><p>组织成本：${safe(Object.entries(m.costs || {}).map(([currency,value]) => `${currency.toUpperCase()} ${value.toFixed(4)}`).join(' / ') || '无成本记录')}</p><p class="muted">最近 24 小时；官方统计可能延迟。API 消耗不代表订阅剩余额度。</p>`;
    }
  }
  return `<section class="card"><div class="row"><strong>${safe(s.name)}</strong><small class="${state === 'ok' ? 'ok' : 'warn'}">${labels[state] || '异常状态'}</small></div>${content || '<p>尚无可验证的官方授权额度数据</p>'}<p class="muted">${safe(s.message || '')}</p><div class="time">来源：${safe(s.origin || '未连接')}<br>采集：${stamp(s.observedAt)}<br>尝试：${stamp(s.lastAttemptAt)}</div></section>`;
}
export function view(data, failed = false) {
  return SOURCES.map(s => {
    const found = data?.sources?.find(x => x?.id === s.id) || {state:'not_connected',limits:[]};
    return {...found,...s,...(failed ? {state:'error',message:'接口读取失败；保留上次数据，稍后重试'} : {})};
  });
}
if (typeof document !== 'undefined') {
  let last, failures=0, running=false, timer;
  const button=document.getElementById('refresh');
  const endpoint=document.querySelector('meta[name="usage-endpoint"]').content;
  function render(failed=false) {
    const sources=view(last,failed), active=sources.filter(s => sourceState(s) === 'ok').length;
    document.getElementById('cards').innerHTML=sources.map(card).join('');
    document.getElementById('overall').textContent=failed ? '连接失败 · 自动重试中' : active ? `${active} 个数据源已同步` : '未连接有效数据源';
    document.getElementById('overall').className=active && !failed ? 'ok' : 'warn';
  }
  async function refresh() {
    if (running) return;
    clearTimeout(timer); running=true; button.disabled=true;
    const controller=new AbortController(), timeout=setTimeout(() => controller.abort(),12000);
    try {
      const response=await fetch(endpoint,{cache:'no-store',signal:controller.signal,credentials:'same-origin'});
      if (!response.ok) throw Error('request');
      const data=await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.sources)) throw Error('schema');
      last=data; failures=0; render();
      document.getElementById('checked').textContent='最近检查：'+new Date().toLocaleString('zh-CN');
    } catch { failures++; render(true); }
    finally {clearTimeout(timeout);running=false;button.disabled=false;timer=setTimeout(refresh,failures ? Math.min(60000,5000*2**Math.min(failures-1,4)) : 60000);}
  }
  button.addEventListener('click',refresh);
  window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',() => {if (!document.hidden) refresh();});
  refresh(); setInterval(() => render(failures>0),15000);
}
