// Модификаторы этажа Глубин (сборка 49): игрок сам поднимает сложность ради награды (риск окупается: награда растёт вместе с угрозой).
// Применяются в game.js (loadZone 'depths'), множители награды — через season.js rm().
export const FLOOR_MODS = {
  swift:  { name: 'Быстрые тени', glyph: '»', txt: 'Враги быстрее на 25%', spd: 1.25, gold: 1.3, xp: 1.2 },
  brutes: { name: 'Толстокожие', glyph: '⛨', txt: 'Враги крепче ×1,5', hp: 1.5, gold: 1.4, xp: 1.3 },
  fury:   { name: 'Ярость Бездны', glyph: '⚔', txt: 'Враги бьют сильнее ×1,35', dmg: 1.35, gold: 1.4, xp: 1.25 },
  champs: { name: 'Чемпионы', glyph: '♛', txt: 'Каждый четвёртый враг — чемпион', champ: 0.25, items: 1.6, gold: 1.25, xp: 1.25 },
  dry:    { name: 'Сухая глотка', glyph: '⚗', txt: 'Зелья не действуют', nopot: true, gold: 1.5, xp: 1.4, items: 1.3 },
};
export const FLOOR_MOD_IDS = Object.keys(FLOOR_MODS);
const n = v => String(v).replace('.', ',');
export const modReward = m => `золото ×${n(m.gold || 1)}${m.xp ? `, опыт ×${n(m.xp)}` : ''}${m.items ? `, вещи ×${n(m.items)}` : ''}`;
