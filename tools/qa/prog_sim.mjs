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
// П57 (правки 2): босс не должен становиться лёгким, если герой перерос зону; опыт — сколько врагов и заданий на уровень
import { bandLevel, BOSS_LEVEL } from '../../js/game/progress.js';
import { killXP } from '../../js/game/loot.js';
import { STORY } from '../../js/data/quests.js';
import { floorLevel } from '../../js/world/floorgen.js';
import { questXP } from '../../js/game/quests.js';
console.log('\nБоссы против воина (без вещей и усилений): уровень врага, ударов героя на него, ударов врага по герою');
row('ур.', 'Палач', 'ударов', 'ударов в', 'Босс Гл5', 'ударов', 'ударов в');
for (const l of [5, 7, 9, 11, 13]) {
  const P = newProfile('warrior'); G.profile = P; P.level = l; autoGrow(P, l - 1); const S = stats(P), hit = S.dps / S.aps;
  const one = (type, lvl) => { const D = ENEMIES[type], hp = D.hp * scaleHP(lvl) * 1.7, md = (D.dmg[0] + D.dmg[1]) / 2 * scaleDmg(lvl) * 1.15 * (1 - damageReduction(S.armor, lvl)); return [lvl, (hp / hit).toFixed(0), (S.maxHP / md).toFixed(1)]; };
  const f5 = floorLevel(5);
  row(l, ...one('boss', bandLevel(BOSS_LEVEL, 10, true)), ...one('boss', bandLevel(f5, f5 + 3, true)));
}
console.log('\nОпыт: врагов на уровень (лес: леший поля 1–3, герой на уровень ниже врага) и опыт за сюжет по главам');
row('ур.', 'опыт до', 'за лешего', 'леших');
for (const l of [3, 5, 7, 9, 12]) {
  const P = newProfile('warrior'); G.profile = P; P.level = l; G.stats = stats(P);
  const e = { D: ENEMIES.w_leshy, lvl: bandLevel(3, 7), champion: false }, xp = killXP(e);
  row(l, xpToNext(l), xp, Math.round(xpToNext(l) / Math.max(1, xp)));
}
{ const sum = {}; for (const q of STORY) { const c = q.chapter || 1; sum[c] = (sum[c] || 0) + questXP(q.reward.xp || 0); } console.log('опыт за задания по главам:', JSON.stringify(sum)); }
