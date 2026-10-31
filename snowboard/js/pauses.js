// Пошаговая демонстрация. Инструктор делает одно действие (одна подпись) — и время замирает:
// в субтитрах что получилось и куда смотреть, нужная панель (кант или вес) подсвечена,
// а дальше — только по кнопке «Дальше». Обычное действие останавливается в конце, когда поза уже готова;
// мгновенный момент (input.key, смена канта) и ошибка (input.mistake) — посередине, пока доска ещё едет.
// Каждое действие — один раз за заезд: повторы (вторая гирлянда, следующий поворот) идут без остановок.
// Без DOM: тем же кодом остановки перечисляет tools/demo-pauses.mjs.
export const PAUSE = { min: 0.6, key: 0.25, mistake: 0.7 };

export const newPauses = () => ({ cur: null, seen: new Set() });

const stopOf = (c, at) => ({ caption: c.caption, look: c.look, focus: c.focus || null, at });
const due = (P, c) => c && c.look && !c.stopped && !P.seen.has(c.caption);

// t — время урока, input — ход автопилота (caption, look, focus, key, mistake). Вернёт остановку или null.
// Остановка в конце действия приходит, когда автопилот уже перешёл к следующему: этот ход ждёт «Дальше».
export function keyMoment(P, t, input) {
  const c = P.cur;
  if (!c || input.caption !== c.caption) {
    const end = due(P, c) && t - c.since >= PAUSE.min; // мелькнувшая на миг подпись — ещё не действие
    if (c && (end || c.stopped)) P.seen.add(c.caption);
    P.cur = { caption: input.caption, look: input.look, focus: input.focus, since: t, stopped: false, mid: input.key ? PAUSE.key : input.mistake ? PAUSE.mistake : null };
    if (end) return stopOf(c, 'end');
  }
  const n = P.cur;
  if (n.mid != null && due(P, n) && t - n.since >= n.mid) { n.stopped = true; return stopOf(n, 'mid'); }
  return null;
}
// Демонстрация закончилась: последнее действие тоже заканчивается остановкой.
export function lastMoment(P) {
  const c = P.cur;
  if (!due(P, c)) return null;
  P.seen.add(c.caption); c.stopped = true;
  return stopOf(c, 'end');
}

// Все остановки демонстрации заранее — та же физика и тот же автопилот, что в игре.
// По ним в субтитрах «шаг 2 из 6», их же печатает tools/demo-pauses.mjs. sim — свободный экземпляр Sim.
export function planStops(sim, L, { stance = 'regular', variant = null, max = 120 } = {}) {
  const DT = 1 / 120;
  sim.reset({ slopeDeg: L.slopeDeg, stance, ...L.start(stance === 'goofy' ? -1 : 1, variant) });
  const ls = {}; L.init(ls, variant);
  const P = newPauses(), stops = [], missing = new Set();
  let r = {};
  for (let t = 0; t < max && !r.done && !r.fail && !sim.fallen; t += DT) {
    const input = L.auto(sim, t, ls);
    if (!input.look) missing.add(input.caption);
    const p = keyMoment(P, t, input);
    if (p) stops.push({ t, ...p });
    sim.step(DT, input);
    if (Math.abs(sim.u) > 21) sim.fall('out');
    r = L.check(sim, ls, DT);
    if (r.done && L.kind !== 'track') { const e = lastMoment(P); if (e) stops.push({ t, ...e }); }
  }
  return { stops, missing: [...missing], time: sim.time, fallen: sim.fallen };
}
