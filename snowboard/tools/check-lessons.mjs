// Прогоняет автопилот-инструктора по каждому уроку на склоне для обеих стоек.
// Падение или невыполненная цель — ненулевой код выхода (кроме задуманной ошибки в конце демо).
import { Sim } from '../js/sim.js';
import { LESSONS } from '../js/lessons.js';

const DT = 1 / 120;
let failed = 0;
for (const L of LESSONS.filter((l) => l.kind === 'ride' && !l.free)) {
  for (const v of L.variants ? L.variants.map((x) => x.id) : [null]) for (const stance of ['regular', 'goofy']) {
    const sim = new Sim();
    sim.reset({ slopeDeg: L.slopeDeg, stance, ...L.start(stance === 'goofy' ? -1 : 1, v) });
    const ls = {}; L.init(ls, v);
    let r = { done: false, text: '' };
    for (let t = 0; t < 120 && !r.done && !r.fail && !sim.fallen; t += DT) {
      sim.step(DT, L.auto(sim, t, ls));
      r = L.check(sim, ls, DT);
    }
    // демо соскальзываний специально заканчивается типичной ошибкой — ловлей нижнего канта
    const ok = L.demoMistake ? sim.fallen?.type === L.demoMistake && sim.time > 17 : r.done && !sim.fallen;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${(L.id + (v ? ':' + v : '')).padEnd(14)} ${stance.padEnd(8)} ${r.text}${sim.fallen ? ' · падение: ' + sim.fallen.type : ''}${r.fail ? ' · ' + r.fail : ''}`);
  }
}
process.exit(failed ? 1 : 0);
