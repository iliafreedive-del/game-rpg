// Quest system: story chain + repeatable contracts. Progress only from real, observed events.
import { G, bus } from './ctx.js';
import { STORY, REPEATABLE } from '../data/quests.js';
import { gainXP, pickEpic } from './loot.js';
import { makeItem, makeSetItem } from './items.js';
import { SETS } from '../data/sets.js';
import { autoEquip } from './character.js';
import { rint } from '../core/util.js';
import { hasSkill } from './progress.js';
import { SEALS } from '../data/story.js';

// П57: крупные награды заданий опытом ×0,6 (+250 за задание — слишком быстро). Мелкие шаги обучения (до 100) — как были
export const questXP = x => x >= 100 ? Math.round(x * 0.6) : x;
export const current = () => STORY[G.profile.story.stage] || null;
export const storyDone = () => G.profile.story.stage >= STORY.length;

export function progressOf(q) {
  const s = G.profile.story, P = G.profile;
  if (!q) return null;
  if (q.obj.count) return { cur: Math.min(q.obj.n, s.counters[q.id] || 0), max: q.obj.n };
  if (q.obj.depths) return { cur: Math.min(q.obj.depths, (P.depths && P.depths.best) || 0), max: q.obj.depths };
  if (q.obj.wild) { const d = (P.wild && P.wild[q.obj.wild.realm] && P.wild[q.obj.wild.realm].depth) || 0; return { cur: Math.min(q.obj.wild.n - 1, Math.max(0, d - 1)), max: q.obj.wild.n - 1 }; }
  if (q.obj.hw) return { cur: Math.min(q.obj.hw, ((P.hw && P.hw.top) || 1) - 1), max: q.obj.hw };
  if (q.obj.wildStat) { const o = q.obj.wildStat; return { cur: Math.min(o.n, wildStat(o)), max: o.n }; }
  return null;
}
// счётчик побед по конкретному мобу похода (profile.wild[realm].stat, см. game/wild.js)
const wildStat = o => { const S = G.profile.wild && G.profile.wild[o.realm]; return (S && S.stat && S.stat[o.key]) || 0; };
export const isReady = () => { const q = current(); return !!(q && q.turnIn && G.profile.story.ready === q.id); }
// кому сдавать готовое задание: по умолчанию староста; «100 золота» — кузнецу Горану (он и просил деньги)
export const turnNpc = q => (q && q.turnTo) || 'elder';
export const TURN_NAME = { elder: 'старосте Эдрику', smith: 'кузнецу Горану' };
// цель выполнена, но награда — у старосты: ждём возвращения в деревню
function markReady(q) {
  const s = G.profile.story; if (s.ready === q.id) return;
  s.ready = q.id; bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save');
  bus.emit('toast', { text: 'Задание выполнено: ' + q.title, sub: G.zoneId === 'town' ? `Подойдите к ${TURN_NAME[turnNpc(q)]} — у него «?»` : `Вернитесь в деревню к ${TURN_NAME[turnNpc(q)]} за наградой`, kind: 'quest' });
}
function complete() {
  const P = G.profile, s = P.story, q = current(); if (!q) return;
  delete s.ready; s.done.push(q.id); s.stage++;
  while (STORY[s.stage] && s.done.includes(STORY[s.stage].id)) s.stage++;   // сборка 47: шаги переставлены — уже пройденные пропускаем
  bus.emit('questComplete', q); bus.emit('sfx', 'quest');
  grant(q.reward, q.title, { sub: 'Задание выполнено' });
  bus.emit('save');
  const n = current(), ch = q.chapter || 1;
  if (!n || (n.chapter || 1) !== ch) bus.emit('chapterDone', ch);   // глава закончилась — окно и переход к следующей
  if (n) { bus.emit('questNew', n); check(); }
}
export function grant(r, title, opts = {}) {
  const P = G.profile; const got = { title, sub: opts.sub || '', gold: 0, xp: 0, potions: 0, scrolls: 0, skillPts: 0, items: [] };
  if (r.gold) { P.gold += r.gold; got.gold = r.gold; }
  if (r.potions) { P.potions.hp += r.potions; got.potions = r.potions; }
  if (r.scrolls) { P.scrolls += r.scrolls; got.scrolls = r.scrolls; }
  if (r.skillPts) { P.skillPts += r.skillPts; got.skillPts = r.skillPts; }
  if (r.shards) { P.shards = (P.shards || 0) + r.shards; got.shards = r.shards; }
  for (const spec of r.items || []) {
    const it0 = rewardItem(spec); const entry = autoEquip(it0);   // выбор — в окне награды: надеть или оставить в сумке
    got.items.push(entry);
  }
  if (r.xp) { const x = opts.rawXP ? r.xp : questXP(r.xp); gainXP(x); got.xp = x; }
  bus.emit('reward', got); bus.emit('hud'); bus.emit('save');
}
const TIER = {
  warrior: { weapon: ['short_sword', 'long_sword', 'zweihander', 'knight_sword'] },
  archer: { weapon: ['short_bow', 'hunter_bow', 'long_bow', 'long_bow'] },
  mage: { weapon: ['oak_staff', 'oak_staff', 'rune_staff', 'rune_staff'] },
};
const ARMOR = { head: ['cap', 'cap', 'helm', 'helm'], chest: ['jerkin', 'jerkin', 'mail', 'plate'], amulet: ['amulet', 'amulet', 'amulet', 'amulet'] };
function rewardItem(spec) {
  const P = G.profile, cls = P.cls || 'warrior', lvl = Math.max(P.level, 2);
  let it;
  if (spec.epic) it = makeItem({ epic: pickEpic(cls), ilvl: lvl + 1, cls });
  else if (spec.set) { const own = Object.keys(SETS).filter(k => SETS[k].branch && SETS[k].cls.includes(cls)); it = makeSetItem(own[0], spec.slot, lvl + 1, cls); }   // Глава II собирает первый сет своей ветви
  else {
    const base = spec.slot === 'weapon' ? TIER[cls].weapon[spec.tier || 1] : ARMOR[spec.slot][spec.tier || 1];
    it = makeItem({ base, ilvl: lvl + (spec.tier || 1) - 1, rarity: spec.rarity ?? 1, cls });
    if (spec.names) it.name = spec.names[cls];
  }
  delete it.req;   // story rewards are always wearable
  return it;
}
// check objective against state (flags / counters / location)
export function check() {
  const q = current(); if (!q) return;
  const s = G.profile.story, o = q.obj;
  if (q.turnIn && s.ready === q.id) return;
  if (o.skill && hasSkill()) return complete();
  if (o.hwTry && (s.flags.hwLost || ((G.profile.hw && G.profile.hw.top) || 1) > 3)) { bus.emit('toast', { text: 'Сил пока маловато', sub: 'Развивайтесь: идите к наставнику Элвину за усилением', kind: 'quest' }); return complete(); }   // сборка 47: дальше 3-го этапа в начале не пускаем
  if (o.flag && s.flags[o.flag]) return q.turnIn ? markReady(q) : complete();
  if (o.count && (s.counters[q.id] || 0) >= o.n) return q.turnIn ? markReady(q) : complete();
  if (o.enter && G.zoneId === o.enter && G.zoneReady) return complete();
  const P = G.profile;
  if (o.depths && ((P.depths && P.depths.best) || 0) >= o.depths) return complete();
  if (o.wild && ((P.wild && P.wild[o.wild.realm] && P.wild[o.wild.realm].depth) || 0) >= o.wild.n) return complete();
  if (o.hw && ((P.hw && P.hw.top) || 1) > o.hw) return complete();
  if (o.wildStat && wildStat(o.wildStat) >= o.wildStat.n) return q.turnIn ? markReady(q) : complete();
  if (o.near && G.player && G.zone) {
    const t = G.zone.inter.find(i => i.id === o.near);
    if (t && Math.hypot(t.x - G.player.x, t.y - G.player.y) < 3.2) return complete();
  }
}
export function setFlag(f) { G.profile.story.flags[f] = true; check(); }
// страж печати повержен: флаг печати, осколок памяти, полная правда — на четвёртой
export function sealDown(realm) {
  const i = SEALS.findIndex(s => s.id === realm); if (i < 0) return;
  const F = G.profile.story.flags; if (F['seal_' + realm]) { check(); return; }
  setFlag('seal_' + realm);
  bus.emit('memory', 'seal' + (i + 1));
}
export function talked(npcId) {
  const q = current(); if (!q) return;
  if (q.turnIn && isReady() && npcId === turnNpc(q)) complete(); else if (q.obj.talk === npcId) complete();
}
function count(kind, n) {
  const q = current(); if (!q || !q.obj.count || q.obj.count !== kind || isReady()) return;
  const s = G.profile.story; s.counters[q.id] = (s.counters[q.id] || 0) + n; bus.emit('hud'); check();
}
// ---- event wiring
export function initQuests() {
  bus.on('kill', e => {
    const st = G.profile.stats; st.kills++;
    if (e.D.skeleton && !e.D.elite) { st.skeletons++; count('skeletons', 1); }
    if (e.D.elite || e.champion) st.elites++;
    if (e.story === 'elite') setFlag('eliteKilled');
    if (e.story === 'wildboss' && G.wild) sealDown(G.wild.realm);
    if (e.story === 'boss') { st.bossKills++; if (!G.diedThisRun) st.bossNoDeath++; const first = !G.profile.story.flags.bossKilled; setFlag('bossKilled'); if (first) sealDown('catacombs'); if (first) setTimeout(() => bus.emit('toast', { text: 'Открыты Глубины катакомб!', sub: 'Синий портал в деревне: бесконечные этажи, дары и рекорды', kind: 'quest' }), 5000); }
    repeatTick();
  });
  bus.on('gold', n => { if (G.zoneId !== 'town') count('gold', n); repeatTick(); });
  bus.on('chest', () => { G.profile.stats.chests++; repeatTick(); });
  bus.on('zoneEntered', () => check());
  bus.on('hwLost', () => { G.profile.story.flags.hwLost = true; });   // засчитается, когда окно Летописи закроется (игровой цикл зовёт check)
}

// ---- repeatables: progress = stat now − stat at acceptance
export function repState(r) {
  const R = G.profile.repeat[r.id]; const st = G.profile.stats;
  if (!R || !R.accepted) { G.profile.repeat[r.id] = { ...(R || {}), accepted: true, base: st[r.stat] || 0 }; return repState(r); }
  const cur = Math.min(r.n, Math.floor((st[r.stat] || 0) - R.base));
  return { accepted: true, cur, done: cur >= r.n, completions: R.completions || 0 };
}
export function acceptRep(id) {
  const r = REPEATABLE.find(x => x.id === id); const st = G.profile.stats;
  G.profile.repeat[id] = { ...(G.profile.repeat[id] || {}), accepted: true, base: st[r.stat] || 0 };
  bus.emit('toast', { text: 'Контракт принят', sub: r.title, kind: 'info' }); bus.emit('save'); bus.emit('hud');
}
export function claimRep(id) {
  const r = REPEATABLE.find(x => x.id === id); const s = repState(r); if (!s.done) return false;
  const R = G.profile.repeat[id]; R.completions = (R.completions || 0) + 1; R.base = G.profile.stats[r.stat] || 0; R.accepted = true;
  // rewards scale with player level and repeat count (kept modest to avoid inflation)
  const lv = G.profile.level; const rw = { ...r.reward };
  if (rw.gold) rw.gold = Math.round(rw.gold * (1 + 0.15 * (lv - 1)));
  if (rw.xp) rw.xp = Math.round(rw.xp * (1 + 0.2 * (lv - 1)));
  grant(rw, r.title, { sub: 'Контракт выполнен' }); bus.emit('save'); return true;
}
let repNotified = {};
function repeatTick() {
  for (const r of REPEATABLE) { const s = repState(r); if (s.accepted && s.done && !repNotified[r.id]) { repNotified[r.id] = 1; bus.emit('toast', { text: 'Контракт выполнен!', sub: r.title + ' — заберите награду у доски', kind: 'quest' }); } if (!s.done) repNotified[r.id] = 0; }
}
// walking meters are committed periodically by the game loop
export function addMeters(m) { G.profile.stats.meters += m; repeatTick(); }
