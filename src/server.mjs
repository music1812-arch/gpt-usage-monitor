import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
import {collectApiUsage} from './api-usage-collector.mjs';
import {collectCodex} from './codex-collector.mjs';
import {createMonitor, startPolling} from './monitor.mjs';

export function validatePublicOrigin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname)) throw Error('MONITOR_PUBLIC_ORIGIN must be a single HTTPS origin');
  return url.origin;
}

export function createUsageServer({monitor, password, publicOrigin} = {}) {
  const allowedOrigin = validatePublicOrigin(publicOrigin);
  if (typeof password !== 'string' || password.length < 24) throw Error('MONITOR_PASSWORD requires at least 24 characters');
  const expected = Buffer.from('Basic '+Buffer.from('monitor:'+password).toString('base64'));
  const files = {'/':['../v2.html','text/html; charset=utf-8'],'/v2.html':['../v2.html','text/html; charset=utf-8'],'/app.mjs':['../app.mjs','text/javascript; charset=utf-8']};
  let requests = 0, windowStart = Date.now();
  return createServer(async (req,res) => {
    if (allowedOrigin) res.setHeader('Strict-Transport-Security','max-age=31536000');
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const finish = (code,body) => { res.statusCode=code; res.end(body); };
    // The dedicated HTTPS gateway must overwrite this header. Never challenge for
    // a password on its plaintext HTTP entry point; keep direct loopback probes.
    const scheme = req.headers['x-forwarded-proto'];
    if (allowedOrigin && scheme !== undefined && scheme !== 'https') {
      if (scheme !== 'http') return finish(400,'Invalid forwarded scheme');
      let path; try { const url = new URL(req.url,'http://localhost'); path = url.pathname + url.search; }
      catch { return finish(400,'Invalid path'); }
      res.setHeader('Location',allowedOrigin + path);
      return finish(308,'Use HTTPS');
    }
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return finish(403,'Forbidden host');
    if (req.headers.origin && req.headers.origin !== 'http://'+host && req.headers.origin !== allowedOrigin) return finish(403,'Forbidden origin');
    if (req.headers['sec-fetch-site'] === 'cross-site') return finish(403,'Forbidden site');
    if (Date.now()-windowStart >= 60000) { requests=0; windowStart=Date.now(); }
    if (++requests > 120) { res.setHeader('Retry-After','60'); return finish(429,'Rate limited'); }
    const supplied = Buffer.from(req.headers.authorization || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) {
      res.setHeader('WWW-Authenticate','Basic realm="Private usage", charset="UTF-8"'); return finish(401,'Authentication required');
    }
    if (req.method !== 'GET') { res.setHeader('Allow','GET'); return finish(405,'Read only'); }
    try {
      const path = new URL(req.url,'http://localhost').pathname;
      if (path === '/v1/usage') {
        res.setHeader('Content-Type','application/json; charset=utf-8'); return finish(200,JSON.stringify(monitor.snapshot()));
      }
      const entry = Object.hasOwn(files,path) ? files[path] : null; if (!entry) return finish(404,'Not found');
      res.setHeader('Content-Type',entry[1]); const data = await readFile(new URL(entry[0],import.meta.url),'utf8');
      finish(200,entry[1].startsWith('text/html') ? data.replace('content="./usage.json"','content="./v1/usage"') : data);
    } catch { finish(500,'Internal error'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.MONITOR_PORT || 18791);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Use an independent unprivileged test port');
  const monitor = createMonitor({codex:() => collectCodex({enabled:process.env.CODEX_ENABLED === '1',executable:process.env.CODEX_BIN || 'codex'}),api:() => collectApiUsage({key:process.env.OPENAI_ADMIN_KEY}),chatgpt:async () => ({id:'chatgpt',state:'not_connected',limits:[],message:'未接入经过验证的普通 ChatGPT 额度接口'})});
  const server = createUsageServer({monitor,password:process.env.MONITOR_PASSWORD,publicOrigin:process.env.MONITOR_PUBLIC_ORIGIN});
  server.listen(port,'127.0.0.1',() => console.log(`Private test service: http://127.0.0.1:${port}`));
  const stopPolling=startPolling(monitor);
  for (const sig of ['SIGTERM','SIGINT']) process.on(sig,() => {stopPolling();server.close();});
}
