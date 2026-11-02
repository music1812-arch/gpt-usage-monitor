/* GPT 用量管家 V2: normalize authenticated Codex App Server responses. No credentials here. */
export function normalizeCodexRateLimits(payload, observedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== 'object') throw new Error('invalid payload');
  const result = payload.result && typeof payload.result === 'object' ? payload.result : payload;
  const byId = result.rateLimitsByLimitId;
  const raw = byId && typeof byId === 'object'
    ? Object.entries(byId).map(([id, value]) => ({id, ...value}))
    : result.rateLimits ? [result.rateLimits] : [];
  const limits = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const bucketId = String(item.limitId || item.id || 'codex');
    for (const windowName of ['primary', 'secondary']) {
      const w = item[windowName];
      if (!w || typeof w.usedPercent !== 'number' || !Number.isFinite(w.usedPercent)) continue;
      const id = bucketId + ':' + windowName;
      if (seen.has(id)) continue;
      seen.add(id);
      limits.push({
        id,
        limitId: bucketId,
        window: windowName,
        usedPercent: Math.max(0, Math.min(100, w.usedPercent)),
        remainingPercent: Math.max(0, 100 - w.usedPercent),
        windowDurationMins: Number.isFinite(w.windowDurationMins) ? w.windowDurationMins : null,
        resetsAt: Number.isFinite(w.resetsAt) ? w.resetsAt : null
      });
    }
  }
  return {schemaVersion: 1, observedAt, sources: [{id:'codex', state:limits.length ? 'ok' : 'not_connected', limits}]};
}
