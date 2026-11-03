// Organization API consumption is independent of ChatGPT subscription allowance.
export async function collectApiUsage({key, fetchImpl = fetch, now = Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  if (!key) return {id:'api', state:'not_connected', limits:[], message:'未配置组织管理员密钥'};
  const end = Math.floor(now / 1000), start = end - 86400;
  async function pages(path) {
    const rows = [], seen = new Set(); let page;
    for (let n = 0; n < 100; n++) {
      const url = new URL('https://api.openai.com/v1/organization/' + path);
      for (const [k,v] of Object.entries({start_time:start,end_time:end,bucket_width:'1d',limit:2,...(page ? {page} : {})})) url.searchParams.set(k,String(v));
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { response = await fetchImpl(url, {headers:{Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(10000),redirect:'error'}); }
        catch { if (attempt === 2) throw Error('network_or_timeout'); await sleep(250 * 2 ** attempt); continue; }
        if (response.ok) break;
        if (response.status !== 429 && response.status < 500) throw Error(`http_${response.status}`);
        if (attempt === 2) throw Error(`http_${response.status}`);
        const retry = Number(response.headers.get('retry-after'));
        await response.body?.cancel();
        await sleep(Math.min(5000, Number.isFinite(retry) && retry > 0 ? retry * 1000 : 250 * 2 ** attempt));
      }
      const body = await response.json();
      if (!Array.isArray(body.data) || typeof body.has_more !== 'boolean') throw Error('invalid_response');
      for (const bucket of body.data) {
        if (!Array.isArray(bucket.results)) throw Error('invalid_response');
        rows.push(...bucket.results);
      }
      if (!body.has_more) return rows;
      if (typeof body.next_page !== 'string' || !body.next_page || seen.has(body.next_page)) throw Error('invalid_pagination');
      page = body.next_page; seen.add(page);
    }
    throw Error('pagination_limit');
  }
  const completions = await pages('usage/completions');
  const totals = {inputTokens:0,outputTokens:0,requests:0};
  for (const row of completions) for (const [dest,src] of Object.entries({inputTokens:'input_tokens',outputTokens:'output_tokens',requests:'num_model_requests'})) {
    if (!Number.isSafeInteger(row[src]) || row[src] < 0) throw Error('invalid_usage');
    totals[dest] += row[src];
  }
  const costs = {};
  for (const row of await pages('costs')) {
    if (!Number.isFinite(row.amount?.value) || row.amount.value < 0 || !/^[a-z]{3}$/i.test(row.amount.currency)) throw Error('invalid_cost');
    costs[row.amount.currency] = (costs[row.amount.currency] || 0) + row.amount.value;
  }
  return {id:'api',state:'ok',limits:[],observedAt:new Date(now).toISOString(),origin:'OpenAI Organization Usage + Costs',metrics:{startTime:start,endTime:end,...totals,costs,scope:'completions tokens; all organization costs'}};
}
