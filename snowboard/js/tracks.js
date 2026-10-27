// Трассы на время: звёзды по маршруту, ворота, финиш. На каждой трассе три задания — по звезде
// за каждое; звёзды копятся между заездами и открывают новые трассы. Ошибки и падения не
// заканчивают заезд: райдер встаёт и едет дальше, время идёт (падение = штраф временем).
// Без DOM: автопилот проверяет трассы в tools/check-tracks.mjs.
import { followGates } from './lessons.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Линия трассы: сумма синусов (амплитуда, период, фаза), u в метрах поперёк склона
const wave = (...parts) => (s) => parts.reduce((u, [a, p, ph = 0]) => u + a * Math.sin((s / p) * TAU + ph), 0);

export const STAR_R = 1.8;      // радиус «сбора» звезды, м
export const GATE_PENALTY = 3;  // штраф за пропущенные ворота, с

// line — линия, по которой лежат звёзды (и едет инструктор); par — время на третью звезду.
export const TRACKS = [
  {
    id: 'green', level: 'Зелёная', name: 'Первые звёзды', color: '#22c55e', need: 0,
    slopeDeg: 9, length: 230, line: wave([5, 90, 0.4]), starStep: 14, vTarget: 6, par: 42,
    intro: 'Пологий широкий склон. Звёзды лежат на удобной линии — просто соединяй их плавными дугами.',
    tip: 'Смотри на следующую звезду, а не под ноги: куда смотришь — туда и едешь.',
  },
  {
    id: 'snake', level: 'Синяя', name: 'Змейка', color: '#3b82f6', need: 2,
    slopeDeg: 12, length: 320, line: wave([7, 48]), starStep: 10, vTarget: 7, par: 56,
    intro: 'Ритм: поворот — поворот — поворот. Звёзды стоят на каждой дуге, пропустишь смену канта — пропустишь звезду.',
    tip: 'Начинай новый поворот, как только проехал звезду: смена канта — до линии падения.',
  },
  {
    id: 'slalom', level: 'Синяя', name: 'Слалом', color: '#3b82f6', need: 4,
    slopeDeg: 12, length: 300, line: wave([6, 44, Math.PI / 2]), starStep: 22, vTarget: 7.5, par: 50,
    gates: { from: 22, step: 22, w: 7 },
    intro: 'Ворота слалома: проезжай между флажками. Пропуск ворот — плюс 3 секунды.',
    tip: 'Поворот начинается до ворот: к флажку ты уже должен ехать на новом канте.',
  },
  {
    id: 'forest', level: 'Синяя', name: 'Лесная тропа', color: '#3b82f6', need: 6,
    slopeDeg: 14, length: 380, line: wave([8, 110, 1], [3, 44]), starStep: 10, vTarget: 8, par: 56,
    intro: 'Длинные дуги вдоль леса и короткие подвороты. Линия меняет ритм — читай её заранее.',
    tip: 'Поднимай взгляд на 2–3 звезды вперёд: так видно, где длинная дуга, а где короткий поворот.',
  },
  {
    id: 'red', level: 'Красная', name: 'Карвинг', color: '#ef4444', need: 9,
    slopeDeg: 16, length: 440, line: wave([9, 70]), starStep: 12, vTarget: 11, par: 50,
    intro: 'Крутой склон и широкие быстрые дуги. Здесь выигрывает чистый резаный поворот без юза.',
    tip: 'Юз гасит скорость. Высокий кант и спокойные плечи — доска режет дугу и не теряет ход.',
  },
  {
    id: 'black', level: 'Чёрная', name: 'Стена', color: '#111827', need: 12,
    slopeDeg: 21, length: 260, line: wave([5, 40]), starStep: 10, vTarget: 4.5, par: 72,
    intro: 'Самый крутой участок. Короткие повороты и контроль скорости: разогнался — улетишь с трассы.',
    tip: 'Каждый поворот доводи поперёк склона — так ты держишь скорость под контролем.',
  },
];
export const TRACKS_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

export function trackStars(T) {
  const out = [];
  for (let s = 24; s < T.length - 12; s += T.starStep) out.push({ u: clamp(T.line(s), -18, 18), s });
  return out;
}
// Ворота — по линии трассы, через одни (красные/синие чередуются)
export function trackGates(T) {
  if (!T.gates) return null;
  const out = [];
  for (let s = T.gates.from; s < T.length - 15; s += T.gates.step) out.push({ u: clamp(T.line(s), -16, 16), s, w: T.gates.w });
  return out;
}

// Задания трассы: доехать, собрать все звёзды, уложиться в par
export const taskNames = (T) => ['Доехать до финиша', `Собрать все звёзды (${trackStars(T).length})`, `Уложиться в ${fmtTime(T.par)}`];
export function tasksDone(T, run) {
  return [run.finished, run.finished && run.stars.size === trackStars(T).length, run.finished && run.total <= T.par];
}
export const fmtTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// Звания по сумме звёзд
const RANKS = [[0, 'Новичок'], [3, 'Уверенный'], [7, 'Райдер'], [12, 'Профи'], [16, 'Легенда склона']];
export const rankOf = (n) => RANKS.filter(([k]) => n >= k).pop()[1];
export const nextRank = (n) => RANKS.find(([k]) => k > n) || null;
export const trackStarsEarned = (rec) => (rec?.tasks || []).filter(Boolean).length;
export const totalStars = (records) => Object.values(records || {}).reduce((a, r) => a + trackStarsEarned(r), 0);

// Состояние заезда; time идёт и во время падения
export const newRun = () => ({ time: 0, stars: new Set(), gi: 0, gatesOk: 0, missed: 0, falls: 0, finished: false, total: 0, events: [] });

// Один шаг: сбор звёзд, ворота, финиш. События — в run.events (их забирает графика/звук).
export function stepRun(T, run, sim) {
  if (run.finished) return;
  const stars = T._stars || (T._stars = trackStars(T));
  stars.forEach((p, i) => {
    if (!run.stars.has(i) && Math.abs(sim.s - p.s) < STAR_R && Math.abs(sim.u - p.u) < STAR_R) { run.stars.add(i); run.events.push({ type: 'star', i }); }
  });
  const gates = T._gates || (T._gates = trackGates(T));
  if (gates && run.gi < gates.length && sim.s >= gates[run.gi].s) {
    const g = gates[run.gi], ok = Math.abs(sim.u - g.u) <= g.w / 2;
    if (ok) run.gatesOk++; else run.missed++;
    run.events.push({ type: 'gate', ok, i: run.gi });
    run.gi++;
  }
  if (sim.s >= T.length) {
    run.finished = true;
    run.total = run.time + run.missed * GATE_PENALTY;
    run.events.push({ type: 'finish' });
  }
}

// Инструктор едет по линии звёзд; подписи — для показа «как проехать»
export function trackAuto(T, sim, t) {
  const path = T._path || (T._path = Array.from({ length: Math.ceil(T.length / 3) + 8 }, (_, i) => ({ u: clamp(T.line(i * 3), -18, 18), s: i * 3 })).slice(1));
  const c = followGates({ path }, sim, { vTarget: T.vTarget, max: T.slopeDeg > 15 ? 0.75 : 0.6, look: 6 + T.vTarget * 0.25 });
  if (t < 2) return { ...c, weight: 0.5, caption: 'Старт: таз вперёд, вес на переднюю ногу. Взгляд — на первую звезду.' };
  if (c.braking) return { ...c, weight: 0, caption: 'Быстровато: довожу доску поперёк склона, кант гасит скорость. Контроль важнее рекорда.' };
  if (Math.abs(c.err) > 0.3) return { ...c, weight: 0.5, caption: 'Начинаю поворот до звезды: вес вперёд, взгляд и плечи — к следующей звезде.' };
  return { ...c, weight: 0.25, caption: 'Веду дугу на канте, колени мягкие, смотрю на 2–3 звезды вперёд.' };
}
