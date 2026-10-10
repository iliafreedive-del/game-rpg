// Save System: versioned profile in localStorage (+ optional cloud via platform), migrations from build 1.x.
import { makeItem, makeStarterGear, sellValue, applyKindPerk } from './items.js';
import { CLASSES, SLOTS, GROWTH, OLD_AFFIXES } from '../data/items.js';
import { STORY } from '../data/quests.js';
import { inClassTree } from '../data/skills.js';

export const SAVE_KEY = 'dark_ascent_save_v2';
export const LEGACY_KEYS = ['dark_ascent_chapter1_save', 'dark_ascent_v03_save'];
export const SAVE_VERSION = 7;

export function newProfile(cls = 'warrior') {
  const p = {
    cls,
    v: SAVE_VERSION, created: Date.now(), saved: 0,
    level: 1, xp: 0, gold: 25,
    attrs: { str: 10, dex: 10, int: 10, vit: 10 }, attrPts: 0, skillPts: 1,
    skills: {}, slots: [null, null, null, null],
    gear: {}, bag: [], bagSize: 40,
    potions: { hp: 3, mp: 1 }, scrolls: 1,
    story: { stage: 0, counters: {}, flags: {}, done: [], flow38: true, flow43: true, flow47: true, flowDepths: true, flow55: true, flow60: true },
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
// сборка 47: топоры и двуручники → мечи (урон пересчитан по скорости удара), старые свойства (крит, ловкость, стихии…) убраны
const TO_SWORD = { hand_axe: ['short_sword', 0.8], war_axe: ['long_sword', 0.8], claymore: ['long_sword', 0.6], zweihander: ['knight_sword', 0.6] };
const OLD_CRIT = [90, 1.19];
const MIGRATIONS = {
  6: p => {
    const fix = it => {
      if (!it || !it.affixes) return;
      it.affixes = it.affixes.filter(a => !OLD_AFFIXES.includes(a.k));
      const t = TO_SWORD[it.base]; if (t) { it.base = t[0]; it.wt = 'sword'; if (it.dmg) it.dmg = it.dmg.map(v => Math.max(1, Math.round(v * t[1]))); if (it.epic === 'e_axe') { it.epic = 'e_sword'; it.effect = 'execute'; } delete it.req; }
      if (it.affixes.some(a => a.kp) || it.rarity >= 2) applyKindPerk(it);
    };
    Object.values(p.gear || {}).forEach(fix); (p.bag || []).forEach(fix); if (p.shop && p.shop.stock) p.shop.stock.forEach(fix);
    // Меткость теперь за осколки Бездны: уровни, купленные за золото, возвращаются золотом
    const l = (p.upg && p.upg.crit) | 0; if (l) { let g = 0; for (let i = 0; i < l; i++) g += Math.round(OLD_CRIT[0] * Math.pow(OLD_CRIT[1], i)); p.gold = (p.gold | 0) + g; p.upg.crit = 0; }
    p.v = 7; return p;
  },
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
  // сборка 47: после Летописи вставлены Элвин, Мира и пробная Жатва; Глава II начинается со Старого Леса — номер шага пересчитываем по пройденным
  if (p.story && !p.story.flow47) {
    const done = new Set(p.story.done || []);
    if (done.has('elder_task')) for (const id of ['hw_elvin', 'meet_merchant', 'surv_try', 'surv_elvin']) if (!done.has(id)) { p.story.done.push(id); done.add(id); }
    let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st;
    p.story.flow47 = true;
  }
  // сборка 47: в начало Главы II вставлена цепочка к Глубинам — у тех, кто уже в Главе II или спускался на 3+ этаж, она позади
  if (p.story && !p.story.flowDepths) {
    const done = new Set(p.story.done || []), deep = ((p.depths && p.depths.best) || 0) >= 3;
    if (deep || [...done].some(id => id.startsWith('c2_') || id.startsWith('c3_') || id.startsWith('c4_'))) for (const id of ['c2_stone', 'c2_depths_portal', 'c2_depths3']) if (!done.has(id)) { p.story.done.push(id); done.add(id); }
    let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st;
    p.story.flowDepths = true;
  }
  // сборка 55: «Купить зелье у Миры» стоит сразу после первого навыка, до Летописи — номер шага пересчитываем по пройденным
  if (p.story && !p.story.flow55) {
    const done = new Set(p.story.done || []); let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st;
    p.story.flow55 = true;
  }
  // сборка 60: вставлены «Осмотреть снаряжение» (после старосты) и «Заглянуть к Кофи» (перед порталом) — у тех, кто уже дальше, они позади
  if (p.story && !p.story.flow60) {
    const done = new Set(p.story.done || []), add = id => { if (!done.has(id)) { p.story.done.push(id); done.add(id); } };
    if (done.has('meet_merchant') || done.has('hw_try') || done.has('elder_task')) add('hero_gear');
    if (done.has('find_portal') || done.has('enter')) add('meet_kofi');
    let st = 0; while (st < STORY.length && done.has(STORY[st].id)) st++; p.story.stage = st;
    p.story.flow60 = true;
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

// сборка 44: три сохранения — по одному на класс (ключ SAVE_KEY_<класс>); последний сыгранный класс — в LAST_KEY.
// Старое единое сохранение (SAVE_KEY) при первом запуске переезжает в слот своего класса; сам ключ остаётся копией SAVE_KEY_old.
export const CLASS_IDS = ['warrior', 'archer', 'mage'];
export const slotKey = cls => SAVE_KEY + '_' + cls;
const LAST_KEY = 'dark_ascent_last_cls';
function moveOldSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); let p = null, from = null;
    if (raw) { p = migrate(JSON.parse(raw)); from = SAVE_KEY; }
    else if (!CLASS_IDS.some(c => localStorage.getItem(slotKey(c)))) for (const k of LEGACY_KEYS) { const r = localStorage.getItem(k); if (r) { p = migrate(JSON.parse(r)); if (p) { p.legacyKey = k; from = k; break; } } }
    if (!p) return;
    const cls = CLASS_IDS.includes(p.cls) ? p.cls : 'warrior'; p.cls = cls;
    if (!localStorage.getItem(slotKey(cls))) { localStorage.setItem(slotKey(cls), JSON.stringify(p)); if (!localStorage.getItem(LAST_KEY)) localStorage.setItem(LAST_KEY, cls); }
    if (from === SAVE_KEY) { localStorage.setItem(SAVE_KEY + '_old', raw); localStorage.removeItem(SAVE_KEY); }
  } catch (e) { console.warn('save move failed', e); }
}
// все слоты: { slots: { warrior: профиль, … }, last: 'mage' }
export function loadSlots() {
  moveOldSave();
  const slots = {};
  for (const c of CLASS_IDS) { try { const r = localStorage.getItem(slotKey(c)); if (r) { const p = migrate(JSON.parse(r)); if (p) { p.cls = c; slots[c] = p; } } } catch (e) { console.warn('save load failed', c, e); } }
  let last = null; try { last = localStorage.getItem(LAST_KEY); } catch { }
  if (!slots[last]) last = Object.values(slots).sort((a, b) => (b.saved || 0) - (a.saved || 0)).map(p => p.cls)[0] || null;
  return { slots, last };
}
// облако (Яндекс): одна запись со всеми слотами; старое облачное сохранение (один профиль) — как слот своего класса
export function cloudBundle(cur) {
  const slots = {};
  for (const c of CLASS_IDS) { try { const r = localStorage.getItem(slotKey(c)); if (r) slots[c] = JSON.parse(r); } catch { } }
  if (cur) slots[cur.cls] = cur;
  return { multi: 1, last: cur ? cur.cls : null, slots };
}
export function mergeCloud(local, cloud) {
  if (!cloud) return local;
  const list = cloud.multi ? Object.values(cloud.slots || {}) : [cloud];
  for (const raw of list) {
    const p = migrate(raw); if (!p) continue; const c = CLASS_IDS.includes(p.cls) ? p.cls : 'warrior'; p.cls = c;
    if (!local.slots[c] || (p.saved || 0) > (local.slots[c].saved || 0)) { local.slots[c] = p; saveLocal(p, true); }
  }
  if (cloud.multi && cloud.last && local.slots[cloud.last]) {
    const lp = local.slots[local.last]; if (!lp || (local.slots[cloud.last].saved || 0) > (lp.saved || 0)) local.last = cloud.last;
  }
  if (!local.slots[local.last]) local.last = Object.keys(local.slots)[0] || null;
  return local;
}
export function loadLocal() { const { slots, last } = loadSlots(); return last ? slots[last] : null; }
export function saveLocal(p, keepTime) {
  try { if (!keepTime) p.saved = Date.now(); const c = CLASS_IDS.includes(p.cls) ? p.cls : 'warrior'; localStorage.setItem(slotKey(c), JSON.stringify(p)); if (!keepTime) localStorage.setItem(LAST_KEY, c); return true; }
  catch (e) { console.warn('save failed', e); return false; }
}
// удалить сохранение одного героя (остальные два не трогаем)
export function wipeLocal(cls) { try { localStorage.removeItem(slotKey(cls || 'warrior')); localStorage.removeItem(LAST_KEY); } catch { } }
