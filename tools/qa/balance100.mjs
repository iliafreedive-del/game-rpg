// Проверка «пройдётся ли игра до 100 уровня» (тред «перед релизом»). node tools/qa/balance100.mjs [класс] [часов в день]
// Модель «живого игрока»: качается в походах (враг = герой + 1), вещи берёт из фортов, сундука дня и недельных заданий,
// золото — с врагов, фортов, заданий дня/недели, алтаря, дозора и пути сезона. Тратит золото жадно: что даёт больше
// (ln урона + ln запаса прочности) на одну монету — закалка у Горана, усиления Элвина, слияние в мифическое.
// Сравнивает с «типичным героем» из hw_curve.mjs (закалка ур./4, Элвин ур./2), под которого настроены Летопись и враги.
import { G } from '../../js/game/ctx.js';
import { stats, xpToNext, damageReduction } from '../../js/game/stats.js';
import { makeItem, upgradeCost as upgradeCost0, maxRarityFor } from '../../js/game/items.js';
// Цены кузнеца и Элвина — из игры (items.js priceK, data/upgrades.js); OLD=1 — без переноса закалки на новую вещь
const FIX = process.env.OLD !== '1',   // перенос закалки на новую вещь (character.js carryUpg); цены — из игры
      _x = 0, PK = l => l <= 20 ? Math.pow(1.1, l - 1) : Math.pow(1.1, 19) * l / 20;
const upgradeCost = upgradeCost0;
import { CLASSES, GROWTH } from '../../js/data/items.js';
import { ENEMIES, scaleHP, scaleDmg, scaleXP } from '../../js/data/enemies.js';
import { makeBattle, stageFoes } from '../../js/game/hwbattle.js';
import { refHero, winrate } from './hw_curve.mjs';
import { PETS, TRAIN_STEP, trainCost, petUpCost } from '../../js/data/pets.js';
let seed = 7; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const ONLY = process.argv[2], HPD = +(process.argv[3] || 2);   // часов игры в день
import { UPGRADES } from '../../js/data/upgrades.js';
const UPG = Object.fromEntries(['dmg', 'hp', 'aps'].map(k => [k, [UPGRADES[k].base, UPGRADES[k].mul, UPGRADES[k].max]]));
const upgCost = (id, l) => Math.round(UPG[id][0] * Math.pow(UPG[id][1], l));
const mergeCost = (r, L) => Math.round([40, 200, 900, 4000][r] * PK(L));
const WB = (cls, L) => ({ warrior: L >= 6 ? 'knight_sword' : L >= 3 ? 'long_sword' : 'short_sword', archer: L >= 5 ? 'long_bow' : L >= 3 ? 'hunter_bow' : 'short_bow', mage: L >= 4 ? 'rune_staff' : 'oak_staff' }[cls]);
const AB = { head: L => L >= 4 ? 'helm' : 'cap', chest: L => L >= 6 ? 'plate' : L >= 3 ? 'mail' : 'jerkin', amulet: () => 'amulet' };
function mk(cls, slot, ilvl, r, u = 0) { const it = makeItem({ base: slot === 'weapon' ? WB(cls, ilvl) : AB[slot](ilvl), ilvl, rarity: r, cls, noClamp: true }); it.rarity = r; it.upg = u; delete it.req; return it; }

function profileOf(cls, L, gear, up) {
  const C = CLASSES[cls], g = GROWTH[cls], attrs = {}; for (const k of ['str', 'dex', 'int', 'vit']) attrs[k] = C.attrs[k] + g[k] * (L - 1);
  return { cls, level: L, xp: 0, attrs, gear, skills: {}, upg: { ...up }, codex: {}, castle: null };
}
const S_of = p => { G.profile = p; return stats(p); };
// урон в секунду по одной цели с главным умением 5 ранга (оценка): воин — Вихрь, лучник — Залп (3 стрелы в цель), маг — Огненный шар с поджогом
function dpsOf(S, cls) {
  const avg = (S.dmgMin + S.dmgMax) / 2, cr = 1 + S.critChance * (S.critMult - 1);
  if (cls === 'warrior') return S.dps + 2.4 * avg * cr / 4;
  if (cls === 'archer') return S.dps + 3 * 1.1 * avg * cr / 3;
  return S.dps * 0.3 + 27 * S.spellPower * 1.4 / 1.4;   // маг: в основном огненный шар, посох между ним
}
// враг уровня E против героя: секунд на убийство, ударов врага до смерти героя, секунд до смерти героя
function duel(S, cls, L, type, E, mul = {}) {
  const D = ENEMIES[type], diff = D.boss ? 1.7 : D.elite ? 1.5 : 1.2;
  let hp = D.hp * scaleHP(E) * diff * (mul.hp || 1); if (E >= 3 && !D.boss && !D.elite) hp = Math.max(hp, 88 + 12 * E);
  const arm = D.armor * (1 + 0.15 * (E - 1)), red = damageReduction(arm, L) * 0.9;
  const ttk = hp / (dpsOf(S, cls) * (1 - red));
  const hit = (D.dmg[0] + D.dmg[1]) / 2 * scaleDmg(E) * (D.boss || D.elite ? 1.15 : 1.08) * (mul.dmg || 1) * (1 - damageReduction(S.armor, E));
  return { ttk, hits: S.maxHP / hit, die: S.maxHP / hit * D.cd };
}
const score = (S, cls) => Math.log(dpsOf(S, cls)) + Math.log(S.ehp);

function run(cls) {
  const gear = { weapon: mk(cls, 'weapon', 1, 0), head: null, chest: mk(cls, 'chest', 1, 0), amulet: null };
  const up = { dmg: 0, hp: 0, aps: 0 };
  let gold = 0, hours = 0, fortAcc = 0, dayAcc = 0, weekAcc = 0, epicW = 0, blue = { head: 0, chest: 0, amulet: 0 }, totalGold = 0;
  const rows = [];
  for (let L = 1; L < 100; L++) {
    // ---- доход за уровень
    const kills = xpToNext(L) / (15 * scaleXP(L + 1) * 0.8);   // смесь врагов похода, опыт ≈ 15 (скелет 12, драугр 16, берсерк 20)
    const h = kills * 4 / 3600; hours += h; const days = h / HPD;
    let inc = kills * 5 * (1 + 0.12 * L) * 0.75 * 0.6 * 1.1;   // золото с врагов (+10% чемпионы)
    inc += kills * 0.03 * (4 + 3 * (L + 1));                      // продажа серых вещей
    const forts = kills / 200; inc += forts * 9 * (1 + 0.15 * L) * 9.5;   // командир форта: 7 кучек, босс — 12
    inc += days * (120 + 160 * L + (150 + 60 * L) * 3 / 7 + 1280 * (1 + 0.08 * L) + 240 + 140 * L + 67 * L);   // день: задания, сундук дня, неделя, алтарь, дозор, сезон
    gold += inc; totalGold += inc;
    // ---- вещи: форт (зелёная/синяя, каждый второй с 40 ур. — эпическое оружие), сундук дня (зелёная), неделя (синяя+)
    fortAcc += forts; dayAcc += days; weekAcc += days / 7;
    const cands = [];
    const cap = maxRarityFor(L);
    while (fortAcc >= 1) { fortAcc--; const boss = (cands.length + L) % 2 === 0;
      if (boss && cap >= 3) { cands.push(mk(cls, 'weapon', L + 2, 3)); epicW++; }
      else { const slot = ['weapon', 'weapon', 'head', 'chest', 'chest', 'amulet'][Math.floor(Math.random() * 6)]; const r = Math.min(cap, Math.random() < 0.3 ? 2 : 1); cands.push(mk(cls, slot, L + 1, r)); if (r === 2 && slot !== 'weapon') blue[slot]++; } }
    while (dayAcc >= 1) { dayAcc--; cands.push(mk(cls, ['weapon', 'head', 'chest', 'amulet'][Math.floor(Math.random() * 4)], L + 1, Math.min(cap, 1))); }
    while (weekAcc >= 1) { weekAcc--; const slot = ['weapon', 'head', 'chest', 'amulet'][Math.floor(Math.random() * 4)]; cands.push(mk(cls, slot, L + 1, Math.max(Math.min(2, cap), Math.min(3, cap)))); }
    for (const s of ['weapon', 'head', 'chest', 'amulet']) cands.push(mk(cls, s, L + 1, 0));   // серое с врагов — каждый уровень хоть одно в слот
    const P = () => profileOf(cls, L + 1, gear, up);
    for (const it of cands) { const s = it.slot, old = gear[s], a = score(S_of(P()), cls); if (FIX && old) it.upg = Math.max(it.upg || 0, old.upg || 0); gear[s] = it; const b = score(S_of(P()), cls); if (b <= a) gear[s] = old; }
    // ---- траты: жадно по пользе на монету
    for (let guard = 0; guard < 400; guard++) {
      const base = score(S_of(P()), cls), opts = [];
      for (const id in UPG) if (up[id] < UPG[id][2]) opts.push({ c: upgCost(id, up[id]), f: () => up[id]++, u: () => up[id]-- });
      for (const s in gear) { const it = gear[s]; if (it && (it.upg || 0) < 10) opts.push({ c: upgradeCost(it), f: () => it.upg++, u: () => it.upg-- }); }
      if (L + 1 >= 60 && epicW >= 3 && gear.weapon.rarity === 3) { const w = gear.weapon; opts.push({ c: mergeCost(3, L + 1), f: () => { w.rarity = 4; w._m = 1; }, u: () => { w.rarity = 3; delete w._m; }, merge: 'w' }); }
      for (const s of ['head', 'chest', 'amulet']) if (L + 1 >= 35 && blue[s] >= 3 && gear[s] && gear[s].rarity === 2) { const it = gear[s]; opts.push({ c: mergeCost(2, L + 1), f: () => { it.rarity = 3; }, u: () => { it.rarity = 2; }, merge: s }); }
      let best = null;
      for (const o of opts) { if (o.c > gold) continue; o.f(); const v = (score(S_of(P()), cls) - base) / o.c; o.u(); if (v > 0 && (!best || v > best.v)) best = { ...o, v }; }
      if (!best) break; best.f(); gold -= best.c; if (best.merge === 'w') epicW -= 3; else if (best.merge) blue[best.merge] -= 3;
    }
    const Lh = L + 1, S = S_of(P()), R = refHero(cls, Lh); G.profile = profileOf(cls, Lh, {}, {});
    const ref = (() => { const C = CLASSES[cls], r = Lh >= 60 ? 4 : Lh >= 40 ? 3 : Lh >= 20 ? 2 : Lh >= 8 ? 1 : 0, u = Math.min(10, Math.floor(Lh / 4)); const g = { weapon: mk(cls, 'weapon', Lh, r, u), head: mk(cls, 'head', Lh, r, u), chest: mk(cls, 'chest', Lh, r, u), amulet: mk(cls, 'amulet', Lh, r, u) }; return S_of(profileOf(cls, Lh, g, { dmg: Math.min(40, Lh >> 1), hp: Math.min(40, Lh >> 1), aps: Math.min(20, Math.floor(Lh / 5)) })); })();
    const naked = (() => { const g = { weapon: mk(cls, 'weapon', Lh, Math.min(1, maxRarityFor(Lh))), head: mk(cls, 'head', Lh, Math.min(1, maxRarityFor(Lh))), chest: mk(cls, 'chest', Lh, Math.min(1, maxRarityFor(Lh))), amulet: mk(cls, 'amulet', Lh, Math.min(1, maxRarityFor(Lh))) }; return S_of(profileOf(cls, Lh, g, {})); })();
    rows.push({ L: Lh, hours, inc, totalGold, S, ref, naked, gear: { ...Object.fromEntries(Object.entries(gear).map(([k, v]) => [k, v && { i: v.ilvl, r: v.rarity, u: v.upg }])) }, up: { ...up },
      wpnUpCost: upgradeCost(mk(cls, 'weapon', Lh, Math.min(3, maxRarityFor(Lh)), 0)) });
  }
  return rows;
}

const f = (x, d = 0) => x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e4 ? Math.round(x / 1e3) + 'k' : (+x).toFixed(d);
const out = [];
for (const cls of ONLY ? [ONLY] : ['warrior', 'archer', 'mage']) {
  const rows = run(cls);
  console.log(`\n=== ${cls} (игра ${HPD} ч/день) ===`);
  console.log('ур.  часов  зол/ур.  закалка+1  оружие(ilvl/ред/+)  Элвин d/h/a   урон%реф  проч%реф | рядовой: с на убийство / ударов до смерти | босс похода: с / ударов | реф: рядовой с / удары');
  for (const r of rows) {
    if (!(r.L <= 10 && r.L % 5 === 0) && r.L % 10 !== 0 && r.L !== 15 && r.L !== 25 && r.L !== 99 && r.L !== 20) continue;
    const a = duel(r.S, cls, r.L, 'f_draugr', r.L + 1), b = duel(r.S, cls, r.L, 'f_boss', r.L + 1), ra = duel(r.ref, cls, r.L, 'f_draugr', r.L + 1);
    const w = r.gear.weapon;
    console.log([String(r.L).padEnd(4), f(r.hours).padStart(5), f(r.inc).padStart(8), f(r.wpnUpCost).padStart(9), `${w.i}/${w.r}/+${w.u}`.padStart(18), `${r.up.dmg}/${r.up.hp}/${r.up.aps}`.padStart(12),
      String(Math.round(dpsOf(r.S, cls) / dpsOf(r.ref, cls) * 100)).padStart(8), String(Math.round(r.S.ehp / r.ref.ehp * 100)).padStart(8), ' |', a.ttk.toFixed(1).padStart(6), a.hits.toFixed(1).padStart(6), ' |', b.ttk.toFixed(0).padStart(5), b.hits.toFixed(1).padStart(5), ' |', ra.ttk.toFixed(1).padStart(5), ra.hits.toFixed(1).padStart(5)].join(' '));
  }
  out.push({ cls, rows });
}
export { out, dpsOf, duel };

// ---- Летопись: самый дальний этап, где реальный герой и «типичный» выигрывают ≥50% (боссы 10/20/30… тоже считаются)
import { hwSkill, HW_MAGE_K } from '../../js/game/hwbattle.js';
const SK = { warrior: 'whirlwind', archer: 'volley', mage: 'fireball' };
const hwH = (S, cls, L) => ({ cls, hp: S.maxHP, dmg: (S.dmgMin + S.dmgMax) / 2 * (cls === 'mage' ? HW_MAGE_K : 1), aps: Math.min(2.2, S.aps), crit: S.critChance, critMult: S.critMult, armor: S.armor, spell: S.spellPower, skill: hwSkill(cls, SK[cls], Math.min(5, 1 + Math.floor(L / 8))) });
function reach(H) { let s = 1; while (s < 120 && winrate([H], stageFoes(s + 1), 12) >= 0.5) s++; return s; }
if (!process.env.NOHW) {
  console.log('\nЛетопись: до какого этапа герой выигрывает ≥50% (реальный / типичный из hw_curve), ожидается этап ≈ ур./0,8');
  for (const { cls, rows } of out) {
    const line = [];
    for (const r of rows) if ([10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(r.L)) line.push(`${r.L}: ${reach(hwH(r.S, cls, r.L))}/${reach(hwH(r.ref, cls, r.L))}`);
    console.log(cls.padEnd(8), line.join('  '));
  }
}
// ---- золото: сколько всего заработано к уровню и сколько стоит то, на что рассчитан «типичный герой»
console.log('\nЗолото: заработано всего к уровню (реальный игрок) против цены «типичного героя» (закалка 4 вещей до ур./4, Элвин ур./2)');
for (const r of out[0].rows) if ([20, 30, 40, 50, 60, 80, 100].includes(r.L)) {
  const L = r.L, u = Math.min(10, Math.floor(L / 4)), rr = L >= 60 ? 4 : L >= 40 ? 3 : L >= 20 ? 2 : 1; let smith = 0;
  for (const s of ['weapon', 'head', 'chest', 'amulet']) { const it = mk('warrior', s, L, rr); for (let k = 0; k < u; k++) { it.upg = k; smith += upgradeCost(it); } }
  let elvin = 0; for (const id of ['dmg', 'hp']) for (let k = 0; k < Math.min(40, L >> 1); k++) elvin += upgCost(id, k); for (let k = 0; k < Math.min(20, Math.floor(L / 5)); k++) elvin += upgCost('aps', k);
  console.log(`ур. ${L}: заработано ${f(r.totalGold)}, за уровень ${f(r.inc)}; закалка 4 вещей своего уровня до +${u}: ${f(smith)}; Элвин: ${f(elvin)}; слияние в мифическое: ${f(mergeCost(3, L))}`);
}
// ---- питомцы: доля урона питомца от урона героя по одной цели и лечение
console.log('\nПитомцы: урон питомца в % от урона героя (одна цель), лечение огонька и вампиризм мыши в % здоровья героя в секунду');
const LV = l => 1 + 0.04 * (l - 1);
for (const [L, pl, tr, label] of [[10, 3, 3, 'ур.10, питомец 3, дрессировка 3'], [30, 10, 15, 'ур.30, питомец 10, дрессировка 15'], [60, 20, 30, 'ур.60, питомец 20, дрессировка 30'], [100, 25, 40, 'ур.100, питомец 25, дрессировка 40']]) {
  const r = out[0].rows.find(x => x.L === L), S = r.S, avg = (S.dmgMin + S.dmgMax) / 2, hd = dpsOf(S, 'warrior'), tm = 1 + TRAIN_STEP * tr;
  const parts = Object.entries(PETS).map(([id, D]) => { const base = avg * D.k * LV(pl); let d = (D.ranged && D.fx !== 'needle' ? 0 : base * tm) / D.cd; d += base * tm * ({ burn: 1.05, poison: 0.6 * 2.5, leech: 0 }[D.fx] || (D.ranged && D.fx !== 'needle' ? 1 : 0)) / D.cd; return `${id} ${Math.round(d / hd * 100)}%`; });
  const heal = (0.03 + 0.001 * (pl - 1)) * tm / 5 * 100, leech = Math.min(avg * 0.12 * LV(pl) * 0.25 / 1.1, S.maxHP * 0.015) * tm / S.maxHP * 100;   // укус ≈ раз в 1,1 с, лечение не больше 1,5% здоровья × дрессировка
  const intake = duel(S, 'warrior', L, 'f_draugr', L + 1); console.log(`${label}: ${parts.join(', ')}; огонёк лечит ${heal.toFixed(1)}%/с, мышь ${leech.toFixed(1)}%/с; один драугр снимает ${(100 / intake.die).toFixed(1)}%/с`);
}
