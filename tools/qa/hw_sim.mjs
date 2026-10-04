// Баланс «Летописи битв»: node tools/qa/hw_sim.mjs — доля побед и остаток здоровья героя по этапам и уровням (базовые вещи)
import { makeBattle, stageFoes } from '../../js/game/hwbattle.js';
const BASE = {   // уровень → [maxHP, урон, ударов/с, крит, armor, spell] из stats() нового героя без вещей лучше стартовых
  warrior: l => [100 + 16 * l, 7 + l * 0.27, 1.5, 0.07, 9 + l * 0.5, 1.1],
  archer: l => [90 + 11 * l, 10.5 + l * 0.5, 1.1, 0.08 + l * 0.004, 12 + l * 1.5, 1.15],
  mage: l => [90 + 11 * l, 7 + l * 0.2, 1.0, 0.07, 9 + l * 0.5, 1.55 + l * 0.055],
};
const hero = (cls, l, gear = 1) => { const [hp, d, aps, crit, armor, spell] = BASE[cls](l); return { cls, hp: Math.round(hp * gear), dmg: d * gear * (cls === 'mage' ? Math.max(1, spell * 0.85) : 1), aps, crit, critMult: 1.5, armor, spell }; };
function run(cls, l, s, n = 80, gear = 1) {
  let w = 0, hp = 0, T = 0;
  for (let i = 0; i < n; i++) { const B = makeBattle(hero(cls, l, gear), stageFoes(s)); let t = 0; while (!B.over && t < 300) { B.step(1 / 30); t += 1 / 30; } if (B.over === 'win') { w++; hp += B.H.hp / B.H.max; } T += t; }
  return [Math.round(w / n * 100), w ? Math.round(hp / w * 100) : 0, Math.round(T / n)];
}
const stages = process.argv[2] ? process.argv[2].split(',').map(Number) : [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30];
const gear = +(process.argv[3] || 1);
for (const cls of ['warrior', 'archer', 'mage']) {
  console.log(cls + ' (победы % / остаток HP % / секунд), gear×' + gear);
  for (const l of [1, 2, 3, 4, 6, 8, 10]) console.log(' ур.' + String(l).padEnd(3) + stages.map(s => `${s}:${run(cls, l, s, 80, gear).join('/')}`.padEnd(14)).join(''));
}
