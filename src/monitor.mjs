export function createMonitor(collectors, {now = Date.now, intervalMs = 60000, staleMs = 900000} = {}) {
  const records = new Map(); let pending, next = 0;
  async function refresh({force = false} = {}) {
    if (pending) return pending;
    if (!force && now() < next) return;
    pending = (async () => {
      await Promise.all(Object.entries(collectors).map(async ([id, collect]) => {
        const old = records.get(id);
        try { records.set(id,{...await collect(),lastAttemptAt:new Date(now()).toISOString()}); }
        catch { records.set(id,{...(old || {id,limits:[]}),state:'error',message:'读取失败，将自动重试',lastAttemptAt:new Date(now()).toISOString()}); }
      }));
      next = now() + intervalMs;
    })();
    try { await pending; } finally { pending = null; }
  }
  function snapshot() {
    return {schemaVersion:1,sources:[...records.values()].map(s => {
      const age = now() - Date.parse(s.observedAt);
      const expired = s.limits?.some(l => l.resetsAt && l.resetsAt * 1000 <= now());
      return {...s,state:s.state === 'ok' && (!Number.isFinite(age) || age < -60000 || age > staleMs || expired) ? 'stale' : s.state};
    })};
  }
  return {refresh,snapshot};
}

// Schedule after completion; a scheduled tick bypasses the wall-clock cache
// cooldown so early timers / clock adjustments cannot skip a polling round.
export function startPolling(monitor, {intervalMs = 60000, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  let stopped = false, timer;
  async function tick() {
    if (stopped) return;
    try { await monitor.refresh({force:true}); }
    finally { if (!stopped) timer = setTimer(tick,intervalMs); }
  }
  void tick();
  return () => { stopped = true; if (timer !== undefined) clearTimer(timer); };
}
