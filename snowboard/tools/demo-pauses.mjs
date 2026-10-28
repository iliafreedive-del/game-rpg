// Перечисляет паузы демонстраций: когда инструктор замирает и что подсказывает.
// Та же физика и тот же автопилот, что в игре; паузы физику не меняют.
import { Sim } from '../js/sim.js';
import { LESSONS } from '../js/lessons.js';
import { newPauses, keyMoment } from '../js/pauses.js';

const DT = 1 / 120;
const stance = process.argv[2] || 'regular';
for (const L of LESSONS.filter((l) => l.kind === 'ride')) for (const v of L.variants ? L.variants.map((x) => x.id) : [null]) {
  const sim = new Sim();
  sim.reset({ slopeDeg: L.slopeDeg, stance, ...L.start(stance === 'goofy' ? -1 : 1, v) });
  const ls = {}; L.init(ls, v);
  const P = newPauses(), out = [];
  const missing = new Set();
  let r = { done: false };
  for (let t = 0; t < (L.free ? 40 : 120) && !r.done && !r.fail && !sim.fallen; t += DT) {
    const input = L.auto(sim, t, ls);
    if (!input.look) missing.add(input.caption);
    const p = keyMoment(P, t, input);
    if (p) out.push(`  ${t.toFixed(1).padStart(5)} с  [${p.focus || '—'}] ${p.look}`);
    sim.step(DT, input);
    r = L.check(sim, ls, DT);
  }
  console.log(`${L.id}${v ? ':' + v : ''} (${stance}): пауз ${out.length}, ${(sim.time).toFixed(0)} с${sim.fallen ? ', падение ' + sim.fallen.type : ''}`);
  console.log(out.join('\n'));
  for (const c of missing) console.log(`  ! нет подсказки для «${c}»`);
}
