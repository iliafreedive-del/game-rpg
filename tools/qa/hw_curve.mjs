// правки 3: таблица силы врагов «Летописи битв» (js/data/hwcurve.js). Для каждого этапа подбирается сила отряда так, чтобы
// типичный герой уровня L(этап) = 0,8·этап (вещи своего уровня, редкость по лестнице, закалка ур./4, Элвин ур./2) побеждал
// в ~60% боёв (боссы 10/20/30… — в ~45%), среднее по трём классам. Запуск: node tools/qa/hw_curve.mjs > js/data/hwcurve.js
import { G } from '../../js/game/ctx.js';
import { stats } from '../../js/game/stats.js';
import { makeItem } from '../../js/game/items.js';
import { CLASSES, GROWTH } from '../../js/data/items.js';
import { makeBattle, stageFoes, hwSkill, HW_MAGE_K, HW_TUNE } from '../../js/game/hwbattle.js';
let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647; Math.random = rng;
export const lvlOf = s => Math.max(1, Math.round(0.8 * s));
const SK = { warrior: 'whirlwind', archer: 'volley', mage: 'fireball' };
export function refHero(cls, L) {
  const C = CLASSES[cls], g = GROWTH[cls], attrs = {}; for (const k of ['str', 'dex', 'int', 'vit']) attrs[k] = C.attrs[k] + g[k] * (L - 1);
  const r = L >= 60 ? 4 : L >= 40 ? 3 : L >= 20 ? 2 : L >= 8 ? 1 : 0, up = Math.min(10, Math.floor(L / 4));
  const wb = { warrior: L >= 6 ? 'knight_sword' : L >= 3 ? 'long_sword' : 'short_sword', archer: L >= 5 ? 'long_bow' : L >= 3 ? 'hunter_bow' : 'short_bow', mage: L >= 4 ? 'rune_staff' : 'oak_staff' }[cls];
  const mk = base => { const it = makeItem({ base, ilvl: L, rarity: r, cls, noClamp: true }); it.rarity = r; it.upg = up; return it; };
  const gear = { weapon: mk(wb), head: mk(L >= 4 ? 'helm' : 'cap'), chest: mk(L >= 6 ? 'plate' : L >= 3 ? 'mail' : 'jerkin'), amulet: mk('amulet') };
  const p = { cls, level: L, xp: 0, attrs, gear, skills: {}, upg: { dmg: Math.min(40, L >> 1), hp: Math.min(40, L >> 1), aps: Math.min(20, Math.floor(L / 5)) }, codex: {}, castle: null };
  G.profile = p; const S = stats(p), rank = Math.min(5, 1 + Math.floor(L / 8));
  return { cls, hp: S.maxHP, dmg: (S.dmgMin + S.dmgMax) / 2 * (cls === 'mage' ? HW_MAGE_K : 1), aps: Math.min(2.2, S.aps), crit: S.critChance, critMult: S.critMult, armor: S.armor, spell: S.spellPower, skill: hwSkill(cls, SK[cls], rank) };
}
export function winrate(heroes, foes, n) {
  let w = 0, t = 0;
  for (const H of heroes) for (let i = 0; i < n; i++) { const B = makeBattle({ ...H, skill: { ...H.skill } }, foes.map(f => ({ ...f })), rng); let tt = 0; while (!B.over && tt < 120) { B.step(0.05); tt += 0.05; } if (B.over === 'win') w++; t++; }
  return w / t;
}
if (process.argv[1].endsWith('hw_curve.mjs')) {
  const N = +(process.env.N || 16), STAGES = 120, out = [];
  const cache = {}; const heroesAt = L => cache[L] || (cache[L] = ['warrior', 'archer', 'mage'].map(c => refHero(c, L)));
  for (let s = 1; s <= STAGES; s++) {
    if (s <= 5) { out.push(1); continue; }   // 1–5 — шаг обучения «Испытать себя», как было
    const base = stageFoes(s, true), boss = base.some(f => f.boss), target = boss ? 0.45 : 0.6, H = heroesAt(lvlOf(s));
    const at = m => base.map(f => ({ ...f, hp: Math.round(f.hp * m), dmg: f.dmg * m }));
    let lo = 0.001, hi = 1e4;   // множитель к нынешней силе этапа; бинарный поиск по логарифму
    for (let k = 0; k < 22; k++) { const m = Math.sqrt(lo * hi); if (winrate(H, at(m), N) > target) lo = m; else hi = m; }
    out.push(+Math.sqrt(lo * hi).toPrecision(4));
    if (process.env.V) console.error('этап', s, 'ур.', lvlOf(s), 'множитель', out[s - 1]);
  }
  console.log(`// Сгенерировано tools/qa/hw_curve.mjs (правки 3): множитель силы отряда к формуле stageFoes по этапам 1–${STAGES}.
// Подобран так, что типичный герой уровня 0,8·этап выигрывает ~60% боёв (боссы — ~45%), среднее по воину, лучнику и магу.
// Пересчитать после изменений характеристик героя: node tools/qa/hw_curve.mjs > js/data/hwcurve.js
export const HW_CURVE = [${out.join(', ')}];`);
}
