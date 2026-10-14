// Ноги героев в полу: самая низкая точка шкуры героя (метры над точкой стояния) в покое, ходьбе и беге, по кадрам.
// node tools/qa/feet.mjs [cls 0 воин,1 лучник,2 маг] [зона]   → строки «idle/walk/run: min … max …»
import { browser, open, advance, loadZone, settle } from './lib.mjs';
const cls = +(process.argv[2] || 2), zone = process.argv[3];
const b = await browser(); const p = await open(b, { cls, seed: 1 });
if (zone) { await loadZone(p, zone); await settle(p); }
const meas = () => p.evaluate(() => {
  const G = window.__G, a = window.__R3.actors.get(G.player); let mesh = null;
  a.root.traverse(o => { if (o.isSkinnedMesh && !o.userData.isOutline && o.visible) mesh = mesh || o; });
  if (!mesh) return { err: 'no skin', skin: a.model.skin };
  const v = new mesh.position.constructor(), pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, bn = mesh.skeleton.bones; let mn = 1e9, mnAll = 1e9, who = '';
  mesh.updateMatrixWorld(true); mesh.skeleton.update();
  for (let i = 0; i < pos.count; i += 1) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
    let bi = 0, bw = -1; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > bw) { bw = sw.getComponent(i, k); bi = si.getComponent(i, k); }
    const nm = bn[bi].name; if (v.y < mnAll) { mnAll = v.y; who = nm; } if (/foot|knee|leg/.test(nm) && v.y < mn) mn = v.y; }
  return { feet: +(mn - a.root.position.y).toFixed(3), all: +(mnAll - a.root.position.y).toFixed(3), who, rootY: +a.root.position.y.toFixed(3), clip: a.clip, sp: +(Math.hypot(G.player.vx || 0, G.player.vy || 0)).toFixed(2), skin: a.model.skin };
});
const run = async (label, setup, n = 24) => {
  await p.evaluate(setup); const r = [];
  for (let i = 0; i < n; i++) { await advance(p, 33); r.push(await meas()); }
  const f = r.map(x => x.feet).filter(x => x != null);
  const al = r.map(x => x.all); console.log(label, 'ALL min', Math.min(...al), [...new Set(r.map(x => x.who))].join('/'));
  console.log(label, r[0].skin, r[r.length - 1].clip, 'min', Math.min(...f), 'max', Math.max(...f), 'rootY', r[0].rootY, JSON.stringify(f));
};
await run('idle', () => { const i = window.qaInput; i.mx = i.my = 0; }, 6);
await run('walk', () => { const i = window.qaInput; i.mx = 0.45; i.my = 0; }, 30);
await run('run ', () => { const i = window.qaInput; i.mx = 1; i.my = 0; }, 30);
await b.close(); process.exit(0);
