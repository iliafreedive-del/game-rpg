// Прогрессия (сборка 47): герой без вещей лучше стартовых против рядового врага на уровень выше.
// node tools/qa/prog_sim.mjs — HP/урон героя и врага, сколько ударов героя на врага и врага на героя.
import { G } from '../../js/game/ctx.js';
import { newProfile } from '../../js/game/save.js';
import { stats, xpToNext, damageReduction } from '../../js/game/stats.js';
import { autoGrow } from '../../js/game/loot.js';
import { ENEMIES, scaleHP, scaleDmg, scaleXP } from '../../js/data/enemies.js';
const row = (...a) => console.log(a.map(x => String(x).padEnd(9)).join(''));
for (const cls of ['warrior', 'archer', 'mage']) {
  console.log('\n' + cls); row('ур.', 'HP', 'DPS', 'скелет', 'ударов', 'урон/уд', 'ударов в', 'опыт до', 'скелетов');
  for (const l of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15]) {
    const P = newProfile(cls); G.profile = P; P.level = l; autoGrow(P, l - 1); const S = stats(P);
    const m = l + 1, D = ENEMIES.skel_warrior, mhp = Math.max(Math.round(D.hp * scaleHP(m) * 1.2), m >= 3 ? 88 + 12 * m : 0), md = (D.dmg[0] + D.dmg[1]) / 2 * scaleDmg(m) * 1.08 * (1 - damageReduction(S.armor, m));
    const hit = S.dps / S.aps, xp = D.xp * scaleXP(m);
    row(l, S.maxHP, S.dps, mhp, (mhp / hit).toFixed(1), md.toFixed(1), (S.maxHP / md).toFixed(1), xpToNext(l), Math.round(xpToNext(l) / xp));
  }
}
