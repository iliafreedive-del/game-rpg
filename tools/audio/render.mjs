// Рендер превью звуков природы в файлы: node tools/audio/render.mjs <папка> [сцены…]
// Поднимает статический сервер на корне репозитория, открывает tools/audio/render.html в Chromium (Playwright),
// получает WAV и, если есть ffmpeg, жмёт в MP3. Без аргументов сцен — все. --measure печатает пик/RMS каждого голоса.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, extname, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2), measure = args.includes('--measure');
const [outDir = 'sounds_out', ...scenes] = args.filter(a => !a.startsWith('--'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = createServer(async (q, s) => { try { const p = join(root, decodeURIComponent(q.url.split('?')[0])); s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); s.end(await readFile(p)); } catch { s.writeHead(404); s.end(); } });
await new Promise(r => srv.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage(); page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.error('[page error]', e));
await page.goto(`http://localhost:${srv.address().port}/tools/audio/render.html`);
await page.waitForFunction(() => window.renderScene);
if (measure) {
  const res = await page.evaluate(() => window.measureAll());
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(24), 'peak', v.peak.toFixed(3), 'rms', v.rmsDb.toFixed(1), 'dB');
} else {
  await mkdir(outDir, { recursive: true });
  const all = scenes.length ? scenes : ['forest', 'fjord', 'mobs', 'village', 'cave', 'wastes'];
  for (const name of all) {
    const st = await page.evaluate(n => window.sceneStats(n), name); console.log(name, 'peak', st.peak.toFixed(3), 'rms', st.rmsDb.toFixed(1), 'dB');
    const b64 = await page.evaluate(n => window.renderScene(n, 0.89), name);   // превью нормируем к -1 dBFS
    const wav = join(outDir, name + '.wav'); await writeFile(wav, Buffer.from(b64, 'base64'));
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '3', join(outDir, name + '.mp3')]); } catch (e) { console.warn('ffmpeg:', e.message); }
  }
}
await browser.close(); srv.close();
