// node tools/shot.mjs out.png "a=finkick&t=2&cam=side" [w h]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(root, u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
const port = srv.address().port;
const [out, qs, W = 900, H = 560, page0 = 'tools/view.html'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`http://localhost:${port}/${page0}?${qs || ''}`);
try { await p.waitForFunction(() => window.__ready, null, { timeout: 60000 }); } catch (e) { errs.push('timeout'); }
await p.waitForTimeout(+(process.env.WAIT || 300));
await p.screenshot({ path: out });
if (errs.length) console.log(errs.slice(0, 8).join('\n'));
await b.close(); srv.close();
