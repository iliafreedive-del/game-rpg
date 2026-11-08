// Автопилот-инструктор проезжает каждую трассу на обеих стойках: финиш без падений,
// все звёзды и время. Время автопилота подсказывает, честно ли поставлен par (третья звезда).
import { Sim } from '../js/sim.js';
import { TRACKS, trackStars, newRun, stepRun, trackAuto, fmtTime } from '../js/tracks.js';

const DT = 1 / 120;
let failed = 0;
for (const T of TRACKS) {
  for (const stance of ['regular', 'goofy']) {
    const sim = new Sim();
    sim.reset({ slopeDeg: T.slopeDeg, stance, u: T.line(0), s: 2, theta: 0, speed: 1 });
    const run = newRun();
    let t = 0;
    for (; t < 240 && !run.finished && !sim.fallen; t += DT) {
      sim.step(DT, trackAuto(T, sim, t));
      if (Math.abs(sim.u) > 21) sim.fall('out');
      run.time += DT;
      stepRun(T, run, sim);
    }
    const n = trackStars(T).length;
    const ok = run.finished && !sim.fallen && run.stars.size === n && run.missed === 0 && run.total <= T.par;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${T.id.padEnd(7)} ${stance.padEnd(8)} время ${fmtTime(run.total || run.time)} (par ${fmtTime(T.par)}) · звёзды ${run.stars.size}/${n} · макс. ${(sim.maxSpeed * 3.6).toFixed(0)} км/ч${run.missed ? ' · пропущено ворот ' + run.missed : ''}${sim.fallen ? ' · падение: ' + sim.fallen.type : ''}`);
  }
}
process.exit(failed ? 1 : 0);
