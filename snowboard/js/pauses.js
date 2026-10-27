// Паузы в демонстрации. Инструктор начал что-то менять (новая подпись) → через 0.7 с, когда поза
// уже пошла, время замирает на 1.3 с: в субтитрах — что изменилось и куда смотреть, нужная панель
// (кант или вес) подсвечена. Каждый момент — один раз за заезд, чтобы не надоедать.
// Без DOM: тем же кодом паузы перечисляет tools/demo-pauses.mjs.
export const PAUSE = { after: 0.7, len: 1.3, gap: 2 };

export const newPauses = () => ({ caption: '', since: 0, last: -9, seen: new Set() });

// t — время урока, input — ход автопилота (caption, look, focus). Вернёт паузу или null.
export function keyMoment(P, t, input) {
  if (input.caption !== P.caption) { P.caption = input.caption; P.since = t; }
  if (!input.look || P.seen.has(input.caption) || t - P.since < PAUSE.after || t - P.last < PAUSE.gap) return null;
  P.seen.add(input.caption); P.last = t;
  return { left: PAUSE.len, look: input.look, focus: input.focus || null };
}
