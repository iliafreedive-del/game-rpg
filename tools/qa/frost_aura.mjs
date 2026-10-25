// Морозная аура Жатвы в 3D (25 октября): снимки ауры стоя и на бегу. node tools/qa/frost_aura.mjs [out]
import * as Q from './lib.mjs';
const out = process.argv[2] || Q.mkdir(Q.OUT + '/frost');
const b = await Q.browser(), p = await Q.open(b, { seed: 7 });
await Q.setHero(p, 12); await Q.loadZone(p, 'survival', {}); await Q.settle(p); await Q.closeAll(p);
for (const [lv, evo] of [[3, 0], [5, 1]]) {
  await p.evaluate(([lv, evo]) => { const S = window.__G.surv; S.w.frost = lv; if (evo) S.evo.evo_frost = 1; for (const e of S.swarm) e.hp = 0; }, [lv, evo]);
  await Q.advance(p, 600); await Q.closeAll(p);
  await Q.shot(p, `${out}/frost_${lv}${evo ? '_evo' : ''}_стоя.jpg`);
  await p.evaluate(() => { window.qaInput.keys.add('KeyD'); });
  for (let i = 0; i < 3; i++) { await Q.advance(p, 33); await Q.shot(p, `${out}/frost_${lv}${evo ? '_evo' : ''}_бег${i}.jpg`); }
  await Q.releaseKeys(p);
}
console.log('errors', p.errors); await b.close(); Q.stopServers();
