// Перечисляет остановки пошаговых демонстраций: где инструктор замирает и ждёт «Дальше», что подсказывает.
// Та же физика и тот же автопилот, что в игре (planStops из js/pauses.js); остановки физику не меняют.
// «конец» — действие сделано, поза готова; «середина» — смена канта или ошибка, пока доска ещё едет.
import { Sim } from '../js/sim.js';
import { LESSONS } from '../js/lessons.js';
import { TRACKS, newRun, stepRun, trackAuto } from '../js/tracks.js';
import { planStops } from '../js/pauses.js';

const stance = process.argv[2] || 'regular';
const runs = [];
for (const L of LESSONS.filter((l) => l.kind === 'ride')) for (const v of L.variants ? L.variants.map((x) => x.id) : [null]) runs.push([L, v]);
// трасса «Как проехать»: тот же автопилот, что в игре, до финиша
for (const T of TRACKS) runs.push([{ id: 'track:' + T.id, kind: 'track', slopeDeg: T.slopeDeg, start: () => ({ u: T.line(0), s: 2, theta: 0, speed: 1 }), init: (ls) => Object.assign(ls, newRun()), auto: (sim, t) => trackAuto(T, sim, t), check: (sim, ls) => { stepRun(T, ls, sim); return { done: ls.finished }; } }, null]);
let bad = 0;
for (const [L, v] of runs) {
  const { stops, missing, time, fallen } = planStops(new Sim(), L, { stance, variant: v, max: L.free ? 40 : 120 });
  console.log(`${L.id}${v ? ':' + v : ''} (${stance}): шагов ${stops.length}, ${time.toFixed(0)} с${fallen ? ', падение ' + fallen.type : ''}`);
  for (const p of stops) console.log(`  ${p.t.toFixed(1).padStart(5)} с  ${p.at === 'mid' ? 'середина' : 'конец   '} [${p.focus || '—'}] ${p.look}`);
  if (!stops.length) { bad++; console.log('  ! ни одной остановки'); }
  for (const c of missing) { bad++; console.log(`  ! нет подсказки для «${c}»`); }
}
process.exit(bad ? 1 : 0);
