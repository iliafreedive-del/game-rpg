// Сохранения из старых сборок для проверки `node tools/qa/suite.mjs saves`.
// node tools/qa/save_fixtures.mjs [архив.zip …]   (по умолчанию — сборки из /mnt/project-files/builds)
// Каждая старая сборка запускается своим кодом, герой получает уровень, золото и вещи, игра сама пишет сохранение;
// localStorage с ожидаемыми значениями ложится в tools/qa/fixtures/saves/<сборка>_<класс>.json.
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execFileSync } from 'child_process';
import * as Q from './lib.mjs';
const B = '/mnt/project-files/builds';
const zips = process.argv.slice(2).length ? process.argv.slice(2) : [
  `${B}/dark-ascent-cloudflare-build35.zip`, `${B}/build44/dark-ascent-cloudflare-build44.zip`, `${B}/build50/dark-ascent-cloudflare-build50.zip`,
  `${B}/build55/dark_ascent_build55.zip`, `${B}/build58/dark_ascent_build58.zip`].filter(f => fs.existsSync(f));
const outDir = Q.mkdir(path.join(Q.ROOT, 'tools/qa/fixtures/saves'));
const b = await Q.browser();
for (const zip of zips) {
  const tag = (zip.match(/build(\d+)/) || [, path.basename(zip, '.zip')])[1];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa_b' + tag + '_')); execFileSync('unzip', ['-q', zip, '-d', dir]);
  const base = await Q.serve(dir);
  for (const cls of [0, 1]) {
    try {
      const p = await Q.open(b, { base, titleOnly: true, seed: 1, lang: 'ru' });
      await p.click('#titleBtns button'); await p.waitForSelector('.class-card', { timeout: 20000 }); await (await p.$$('.class-card'))[cls].click();
      await p.waitForFunction(() => window.__G && window.__G.zone && window.__G.player && window.__G.zoneReady, null, { timeout: 90000 });
      const exp = await p.evaluate(async () => {
        const G = window.__G, P = G.profile;
        const D = window.__LANG && window.__LANG !== 'ru' ? '/js_' + window.__LANG : '/js'; const IT = await import(D + '/game/items.js'); const gm = await import(D + '/game/game.js');
        P.level = 9; P.gold = 777; P.xp = 50; if (P.tutorial) P.tutorial.prologue = true;
        for (const sl of ['weapon', 'head', 'chest', 'amulet']) { try { const it = IT.makeItem({ slot: sl, ilvl: 9, rarity: 2, cls: P.cls }); if (it) { delete it.req; P.gear[sl] = it; } } catch { } }
        gm.saveNow(true);
        const st = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/dark_ascent/.test(k)) st[k] = localStorage.getItem(k); }
        return { storage: st, expect: { cls: P.cls, level: P.level, gold: P.gold, gear: Object.values(P.gear).filter(Boolean).length }, build: window.__BUILD || null };
      });
      const f = path.join(outDir, `build${tag}_${exp.expect.cls}.json`); fs.writeFileSync(f, JSON.stringify(exp, null, 1));
      console.log(`build ${tag} ${exp.expect.cls}: ${Object.keys(exp.storage).join(', ')} → ${path.relative(Q.ROOT, f)}${p.errors.length ? ' (ошибки старой сборки: ' + p.errors.length + ')' : ''}`);
      await p.context().close();
    } catch (e) { console.log(`build ${tag} класс ${cls}: не получилось — ${String(e).slice(0, 200)}`); }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
await b.close(); Q.stopServers();
