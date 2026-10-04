// Save System: versioned profile in localStorage (+ optional cloud via platform), migrations from build 1.x.
import { makeItem, makeStarterGear, sellValue, applyKindPerk } from './items.js';
import { CLASSES, SLOTS, GROWTH } from '../data/items.js';
import { STORY } from '../data/quests.js';
import { inClassTree } from '../data/skills.js';

export const SAVE_KEY = 'dark_ascent_save_v2';
export const LEGACY_KEYS = ['dark_ascent_chapter1_save', 'dark_ascent_v03_save'];
export const SAVE_VERSION = 6;

export function newProfile(cls = 'warrior') {
  const p = {
    cls,
    v: SAVE_VERSION, created: Date.now(), saved: 0,
    level: 1, xp: 0, gold: 25,
    attrs: { str: 10, dex: 10, int: 10, vit: 10 }, attrPts: 0, skillPts: 1,
    skills: {}, slots: [null, null, null, null],
    gear: {}, bag: [], bagSize: 40,
    potions: { hp: 3, mp: 1 }, scrolls: 1,
    story: { stage: 0, counters: {}, flags: {}, done: [], flow38: true, flow43: true },
    repeat: {},            // id -> {accepted, base, completions}
    stats: { kills: 0, skeletons: 0, elites: 0, chests: 0, meters: 0, gold: 0, bossKills: 0, deaths: 0, bossNoDeath: 0, playTime: 0 },
    world: { opened: {}, lastZone: 'town' },   // persistent story objects (key sarcophagus, secret wall, gate…)
    boosts: { xpUntil: 0, goldUntil: 0, blessUntil: 0 },
    ads: { used: {} }, iap: { tx: {} },
    shop: { seed: 1, refreshedAtLevel: 1, stock: [] },
    epicPity: 0, bossFirstKill: false, chapterDone: false,
    settings: { sfx: 0.7, music: 0.5, shake: true, quality: 'auto', skins: true },
    tutorial: {},
  };
  const g = makeStarterGear(cls);
  p.gear.weapon = g.weapon; p.gear.chest = g.chest;
  p.attrs = { ...CLASSES[cls].attrs };
  return p;
}

// ----- migrations
function migrateV1(old) {
  // Build 1.x stored level/xp/gold/attributes/skills as flat numbers. Keep what maps cleanly.
  const p = newProfile('warrior');
  p.level = Math.max(1, Math.min(30, old.level | 0 || 1));
  p.gold = Math.max(0, old.gold | 0);
  if (old.attributes) for (const k of ['str', 'dex', 'int', 'vit']) p.attrs[k] = Math.max(10, Math.min(200, old.attributes[k] | 0 || 10));
  // Old per-branch skill numbers become refundable skill points (new tree has real nodes)
  let oldSkill = 0; if (old.skills) for (const k in old.skills) oldSkill += Math.max(0, old.skills[k] | 0);
  p.skillPts = 1 + (p.level - 1) + 0 * oldSkill;
  const spent = Object.values(p.attrs).reduce((a, b) => a + b, 0) - 40;
  p.attrPts = Math.max(0, (p.level - 1) * 5 - spent) + Math.max(0, old.points | 0);
  p.potions.hp = Math.min(20, Math.max(3, old.potions | 0));
  // Old items had ad-hoc shapes; convert only weapon type & level to new items.
  // old 1.x items don't map to the new 4-slot system — they're converted to gold
  if (Array.isArray(old.bag)) p.gold += old.bag.length * 10;
  if ((old.quest | 0) > 0) { p.story.stage = 1; p.story.done = ['talk_elder']; }
  p.migratedFrom = 1;
  return p;
}
const OLD_UPG = { critDmg: [110, 1.18], move: [140, 1.22], mp: [35, 1.15], regen: [60, 1.17] };
const RES_KEYS = ['resAll', 'resFire', 'resCold', 'resLight'];
const MIGRATIONS = {
  // v5 → v6: цепочка сюжета изменилась (задание «Победить стража» слито с амулетом): стадия — по списку выполненных
  5: p => {
    if (p.story) { const done = new Set(p.story.done || []); let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st; if (p.story.flags && p.story.flags.medallion) p.world.hasMedallion = true; }
    p.v = 6; return p;
  },
  // v4 → v5: сопротивления стихиям убраны; редкости переименованы (серый/зелёный/синий/золотой)
  4: p => {
    const strip = it => { if (it && it.affixes) it.affixes = it.affixes.filter(a => !RES_KEYS.includes(a.k)); };
    Object.values(p.gear || {}).forEach(strip); (p.bag || []).forEach(strip);
    if (p.shop && p.shop.stock) p.shop.stock.forEach(strip);
    p.v = 5; return p;
  },
  // v3 → v4: характеристики растут сами; из золотых усилений остаются 4 — остальные возвращаются золотом.
  3: p => {
    let pts = Math.max(0, p.attrPts | 0); p.attrPts = 0;
    const g = GROWTH[p.cls || 'warrior'];
    for (const k in g) { const n = Math.floor(pts * g[k] / 5); p.attrs[k] += n; }
    let refund = 0; p.upg = p.upg || {};
    for (const id in OLD_UPG) { const l = p.upg[id] | 0; for (let i = 0; i < l; i++) refund += Math.round(OLD_UPG[id][0] * Math.pow(OLD_UPG[id][1], i)); delete p.upg[id]; }
    for (const [id, mx] of [['dmg', 40], ['hp', 40], ['crit', 25], ['aps', 20]]) if ((p.upg[id] | 0) > mx) p.upg[id] = mx;
    p.gold = (p.gold | 0) + refund; if (refund) p.simplified = { n: 0, gold: refund, upg: true };
    p.v = 4; return p;
  },
  // v2 → v3: hero classes + 4 gear slots. Items that no longer fit are sold automatically.
  2: p => {
    const wt = p.gear && p.gear.weapon && p.gear.weapon.wt;
    p.cls = p.cls || (wt === 'bow' ? 'archer' : wt === 'staff' ? 'mage' : 'warrior');
    const C = CLASSES[p.cls]; let gold = 0, n = 0;
    for (const k of Object.keys(p.gear || {})) if (!SLOTS.includes(k) && p.gear[k]) { gold += sellValue(p.gear[k]); n++; delete p.gear[k]; }
    p.bag = (p.bag || []).filter(it => { const ok = SLOTS.includes(it.slot) && (it.slot !== 'weapon' || C.weapons.includes(it.wt)); if (!ok) { gold += sellValue(it); n++; } return ok; });
    p.gold = (p.gold || 0) + gold; if (n) p.simplified = { n, gold };
    p.v = 3; return p;
  },
};

export function migrate(p) {
  if (!p || typeof p !== 'object') return null;
  if (!p.v || p.v < 2) return migrateV1(p);
  while (p.v < SAVE_VERSION) { const m = MIGRATIONS[p.v]; if (!m) break; p = m(p); }
  // сборка 38: в начало сюжета вставлены «Выбрать навык у наставника» и «Вернуться к старосте» — у старых сохранений они уже позади
  if (p.story && !p.story.flow38) {
    const done = new Set(p.story.done || []);
    if (done.has('talk_elder')) { for (const id of ['learn_skill', 'elder_task']) if (!done.has(id)) p.story.done.push(id); done.add('learn_skill'); done.add('elder_task'); let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st; }
    p.story.flow38 = true;
  }
  // сборка 43: «Испытать себя в Летописи битв» между навыком и старостой — у тех, кто уже был у старосты, оно позади
  if (p.story && !p.story.flow43) {
    const done = new Set(p.story.done || []);
    if (done.has('elder_task') && !done.has('hw_try')) { p.story.done.push('hw_try'); done.add('hw_try'); let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st; }
    p.story.flow43 = true;
  }
  // fill any fields added later with defaults (forward-compatible)
  const d = newProfile();
  for (const k in d) if (!(k in p)) p[k] = d[k];
  for (const k of ['stats', 'story', 'world', 'boosts', 'ads', 'iap', 'settings', 'potions', 'shop', 'tutorial'])
    for (const kk in d[k]) if (!(kk in p[k])) p[k][kk] = d[k][kk];
  p.bagSize = Math.max(p.bagSize || 30, 40 + (p.iap && p.iap.bagBig ? 20 : 0));   // сборка 20: сумка 40 (больше серого — сырьё для слияния)
  // сборка 20: «свойство вида» у синих и выше — для вещей из старых сохранений
  for (const it of [...Object.values(p.gear || {}), ...(p.bag || [])]) if (it && it.affixes && it.rarity >= 2 && !it.affixes.some(a => a.kp)) applyKindPerk(it);
  // сборка 36: у класса одна ветка навыков — навыки вне неё возвращаются очками и уходят с кнопок
  if (p.skills) for (const k of Object.keys(p.skills)) if (!inClassTree(p.cls || 'warrior', k)) {
    p.skillPts = (p.skillPts | 0) + (p.skills[k] | 0); delete p.skills[k];
    if (p.slots) p.slots = p.slots.map(x => x === k ? null : x); if (p.bigSkill === k) p.bigSkill = null;
  }
  return p;
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return migrate(JSON.parse(raw));
    for (const k of LEGACY_KEYS) {
      const r = localStorage.getItem(k);
      if (r) { const p = migrate(JSON.parse(r)); if (p) { p.legacyKey = k; return p; } }
    }
  } catch (e) { console.warn('save load failed', e); }
  return null;
}
export function saveLocal(p) {
  try { p.saved = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(p)); return true; }
  catch (e) { console.warn('save failed', e); return false; }
}
export function wipeLocal() { try { localStorage.removeItem(SAVE_KEY); } catch { } }
