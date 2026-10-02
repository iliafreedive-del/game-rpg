// Проверка моделей 3D по формату docs/MODEL_SPEC.md: node tools/check_models.mjs [id ...]
// Собирает каждую модель из js/render3d/registry.js, гоняет все клипы по прогрессу 0…1, ищет NaN, пустые меши, нехватку клипов/сокетов, считает треугольники.
import * as THREE from '../js/vendor/three.module.min.js';
import { makeKit } from '../js/render3d/kit.js';
import { REQUIRED_CLIPS } from '../js/render3d/actor.js';
import { HEROES, MOBS, NPCS, WEAPONS, PROPS } from '../js/render3d/registry.js';

const only = process.argv.slice(2), scene = new THREE.Scene(), kit = makeKit(scene);
const groups = { hero: HEROES, mob: MOBS, npc: NPCS, weapon: WEAPONS, prop: PROPS };
let bad = 0;
const tris = root => { let n = 0; root.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return Math.round(n); };
const fail = (id, msg) => { bad++; console.log(`  ✗ ${id}: ${msg}`); };

for (const [kind, table] of Object.entries(groups)) for (const [id, def] of Object.entries(table)) {
  if (only.length && !only.includes(id)) continue;
  let m;
  try { m = def.build(kit, {}); } catch (e) { fail(id, 'build() упал: ' + e.message); continue; }
  const issues = [];
  if (!m.root || !m.root.isObject3D) issues.push('нет root (THREE.Object3D)');
  if (def.kind !== kind) issues.push(`kind «${def.kind}» не совпадает с разделом реестра «${kind}»`);
  if (def.id !== id) issues.push(`id «${def.id}» не совпадает с ключом «${id}»`);
  if (['hero', 'mob', 'npc'].includes(kind)) {
    for (const c of REQUIRED_CLIPS) if (typeof (m.anims || {})[c] !== 'function') issues.push(`нет клипа ${c}`);
    if (!m.bones || !Object.keys(m.bones).length) issues.push('нет bones');
    if (!m.sockets) issues.push('нет sockets');
    if (kind === 'hero' && !(m.sockets.handR && m.sockets.handL && m.sockets.back)) issues.push('у героя нужны сокеты handR, handL, back');
    if (!m.materials || !m.materials.length) issues.push('нет materials (нужны для вспышки удара)');
    if (!m.height || !m.radius) issues.push('нет height/radius');
    if (!issues.length) {
      for (const c of Object.keys(m.anims)) for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        try { m.anims[c]({ t: 1.3, dt: 1 / 60, time: k, k, speed: 3, move: 0.8, combo: k > 0.5 ? 1 : 0, env: {} }); } catch (e) { issues.push(`клип ${c}(k=${k}) упал: ${e.message}`); break; }
        m.root.updateMatrixWorld(true);
        m.root.traverse(o => { if (!Number.isFinite(o.position.x + o.position.y + o.position.z + o.quaternion.x + o.quaternion.w)) issues.push(`NaN в клипе ${c}, k=${k}: ${o.name || o.type}`); });
      }
      m.anims.idle({ t: 0, dt: 1 / 60, time: 0, speed: 0, move: 0, combo: 0, env: {} }); m.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m.root), h = box.max.y - box.min.y;
      if (box.min.y < -0.15) issues.push(`стопы под землёй: min.y = ${box.min.y.toFixed(2)}`);
      if (Math.abs(h - m.height) > m.height * 0.3) issues.push(`заявлена высота ${m.height} м, фактическая ${h.toFixed(2)} м`);
    }
  }
  if (kind === 'weapon' && !def.slot) issues.push('нет slot (handR | handL | back)');
  const t = m.root ? tris(m.root) : 0, limit = { hero: 25000, mob: 12000, npc: 8000, weapon: 2000, prop: 40000 }[kind];
  if (t > limit) issues.push(`треугольников ${t} > ${limit}`);
  console.log(`${issues.length ? '✗' : '✓'} ${kind.padEnd(6)} ${id.padEnd(14)} ${String(t).padStart(6)} тр.${m.anims ? ' клипы: ' + Object.keys(m.anims).join(',') : ''}`);
  for (const s of issues) fail(id, s);
}
console.log(bad ? `\nОшибок: ${bad}` : '\nВсе модели соответствуют формату.');
process.exit(bad ? 1 : 0);
