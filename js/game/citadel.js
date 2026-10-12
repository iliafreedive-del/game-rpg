// Правки 3: зачем ходить в Цитадель. Три зацепки:
//  1) «Поручения Цитадели» — своя цепочка (не сюжет): каждый шаг ведёт к новой комнате и платит осколками Бездны и золотом;
//  2) «Разлом Бездны» — раз в 8 часов в северном проходе Цитадели открывается разлом: три волны нежити, в конце осколки и золото;
//  3) зов в деревне — «!» над солнечной аркой и короткий тост при возвращении, когда в Цитадели что-то готово (не чаще раза в 90 минут).
import { G, bus, inCombat } from './ctx.js';
import * as CS from './castle.js';
import { ROOMS, DECOR } from '../data/upgrades.js';
import { grant } from './quests.js';
import { earlyLock } from './progress.js';
import { Enemy } from './entities.js';
import { rint } from '../core/util.js';

const H = 3600e3;
export const START_LVL = 40, RIFT_LVL = 40, RIFT_MS = 8 * H, NUDGE_MS = 90 * 60e3;   // перед релизом: Цитадель и её поручения — с 40 ур. (было 3 и 5): порталы открываются до 40-го
export const RIFT_POS = [17, 15.4];   // северный проход из зала к галерее (js/world/castlegen.js)
const cs = () => CS.C();
const n = k => cs()[k] || 0;
const can = id => () => CS.canUnlock(id).ok;   // П4-11: шаг можно сделать прямо сейчас (хватает золота/осколков) — только тогда «!» над аркой
const afford = c => G.profile.gold >= c.gold && (G.profile.shards || 0) >= c.shards;

// ---- поручения: выполняются по настоящему состоянию Цитадели, по порядку; шаг ждёт свой уровень
export const CQ = [
  { id: 'enter', lvl: 3, title: 'Войти в Цитадель Ордена', text: 'Эдрик: «Орден оставил стражу крепость. Солнечная арка в деревне ведёт в Цитадель — загляни».', done: () => n('visits') > 0, now: () => true, reward: { gold: 300, shards: 3 } },
  { id: 'altar', lvl: 3, title: 'Разжечь Алтарь золота', text: 'Откройте Алтарь золота в западном крыле: он копит золото до 8 часов, даже когда вас нет в игре.', done: () => n('altar') > 0, now: can('altar'), reward: { shards: 3 } },
  { id: 'take', lvl: 3, title: 'Забрать золото с алтаря', text: 'Алтарь уже копит. Вернитесь в Цитадель через час-другой и заберите золото.', done: () => n('taken') > 0, now: () => CS.altarStored() >= CS.altarRate(), reward: { gold: 100, shards: 2 } },
  { id: 'decor', lvl: 3, title: 'Обставить главный зал', text: 'Светящиеся круги в зале — места для украшений. Каждое украшение даёт постоянный бонус.', done: () => Object.keys(cs().decor || {}).length > 0, now: () => Object.values(DECOR).some(afford), reward: { shards: 3 } },
  { id: 'trial', lvl: 5, title: 'Открыть Зал испытаний', text: 'Восточное крыло: стражи прошлого бьются прямо в Цитадели — без спуска в подземелье.', done: () => n('trial') > 0, now: can('trial'), reward: { shards: 4 } },
  { id: 'trialwin', lvl: 5, title: 'Пройти испытание', text: 'Победите стража в Зале испытаний. Вход — печать испытаний, они восстанавливаются сами.', done: () => n('trialWins') > 0, now: () => CS.seals().n > 0, reward: { gold: 400, shards: 3 } },
  { id: 'rift', lvl: 5, title: 'Закрыть Разлом Бездны', text: 'В северном проходе Цитадели трещит Разлом Бездны. Подойдите к нему и отбейте три волны.', done: () => n('rifts') > 0, now: () => riftOpen(), reward: { shards: 4 } },
  { id: 'treasury', lvl: 7, title: 'Открыть Сокровищницу Бездны', text: 'Северо-западное крыло: сундуки за осколки Бездны, в них вещи вашего класса.', done: () => n('treasury') > 0, now: can('treasury'), reward: { shards: 8 } },
  { id: 'chest', lvl: 7, title: 'Открыть сундук Бездны', text: 'Сундук в Сокровищнице стоит 8 осколков. Внутри — вещь вашего класса, иногда эпическая.', done: () => n('chests') > 0, now: () => (G.profile.shards || 0) >= CS.CHEST_SHARDS, reward: { gold: 600 } },
  { id: 'trophyroom', lvl: 9, title: 'Открыть Зал трофеев', text: 'Северо-восточное крыло: трофеи дают постоянный бонус к урону и золоту.', done: () => n('trophy') > 0, now: can('trophy'), reward: { shards: 10 } },
  { id: 'trophy', lvl: 9, title: 'Поставить новый трофей', text: 'Улучшите трофей в Зале трофеев: +3% урона и +5% золота навсегда.', done: () => n('trophy') >= 2, now: () => afford(CS.trophyCost()), reward: { gold: 800, shards: 5 } },
];
const started = () => { const P = G.profile; return P && P.level >= START_LVL && !earlyLock('extra') && !!(P.story.flags.bossKilled || P.level >= 5); };
// старые сохранения (до правок 3 счётчика visits нет): что уже сделано — засчитываем без наград, иначе разом 11 окон наград
function qs() {
  const c = cs(); if (c.q == null) { let i = 0; if (!c.visits) while (CQ[i] && CQ[i].done()) i++; c.q = i; }
  return c.q;
}
export const cqCurrent = () => CQ[qs()] || null;
export const cqAvailable = () => { const q = cqCurrent(); return !!(q && started() && G.profile.level >= q.lvl); };
let busy = false;
function cqCheck() {
  if (busy || !started()) return; const q = cqCurrent(); if (!q || G.profile.level < q.lvl || !q.done()) return;
  busy = true; cs().q++; bus.emit('sfx', 'quest');
  grant(q.reward, q.title, { sub: 'Поручение Цитадели выполнено' });
  const nx = cqCurrent();
  setTimeout(() => { busy = false; if (nx && G.profile.level >= nx.lvl && !nx.done()) bus.emit('toast', { text: 'Поручение Цитадели', sub: nx.title, kind: 'quest' }); }, 1500);
}

// ---- Разлом Бездны
export const riftOpen = () => { const P = G.profile; return !!P && P.level >= RIFT_LVL && started() && Date.now() >= (cs().riftAt || 0); };
export const riftIn = () => Math.max(0, (cs().riftAt || 0) - Date.now());
const WAVES = [['skel_warrior', 'skel_warrior', 'ghoul', 'ghoul'], ['skel_archer', 'skel_warrior', 'skel_mage', 'ghoul', 'skel_warrior'], ['beast', 'skel_mage', 'ghoul', 'skel_warrior', 'skel_warrior*']];   // * — чемпион
export const RIFT_WAVES = WAVES.length;
export function startRift(it) {
  if (G.rift || G.zoneId !== 'castle') return;
  if (!riftOpen()) { bus.emit('toast', { text: 'Разлом закрыт', sub: riftIn() ? `Бездна снова прорвётся через ${Math.ceil(riftIn() / 60e3)} мин` : `Разломы — с ${RIFT_LVL} уровня`, kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
  G.rift = { wave: 0, x: it.x, y: it.y, it }; bus.emit('sfx', 'roar'); G.cam.kick(0.6);
  bus.emit('toast', { text: 'Разлом Бездны!', sub: G.auto ? 'Три волны. Автобой включён' : 'Три волны нежити. Нажмите АВТО — герой сразится сам', kind: 'quest' });
  setTimeout(spawnWave, 700);
}
function spawnWave() {
  const R = G.rift; if (!R || G.zoneId !== 'castle') return;
  const lvl = G.profile.level, list = WAVES[R.wave];
  list.forEach((t, i) => {
    const champ = t.endsWith('*'), a = (i / list.length) * Math.PI * 2 + R.wave;
    const [x, y] = G.zone.map.nearestFree(R.x + Math.cos(a) * 1.4, R.y + 1.2 + Math.sin(a) * 0.9, 0.4);
    const e = new Enemy(champ ? t.slice(0, -1) : t, x, y, lvl, { story: 'rift', champion: champ }); e.aggro = true; G.enemies.push(e);
  });
  G.zone.map.buildFlow(Math.floor(G.player.x), Math.floor(G.player.y), -1e9);
  bus.emit('float', { x: R.x, y: R.y, text: `Волна ${R.wave + 1}/${WAVES.length}`, color: '#d49bff', z: 2.8 });
}
function riftKill(e) {
  const R = G.rift; if (!R || e.story !== 'rift') return;
  if (G.enemies.some(x => !x.dead && x.story === 'rift')) return;
  R.wave++;
  if (R.wave < WAVES.length) { setTimeout(spawnWave, 1600); return; }
  G.rift = null; const P = G.profile, c = cs();
  c.rifts = (c.rifts || 0) + 1; c.riftAt = Date.now() + RIFT_MS;
  const it = R.it; if (it) { it.hidden = true; if (it.draw) it.draw.hidden = true; if (it.light) it.light.on = false; }
  bus.emit('sfx', 'rareDrop'); G.cam.kick(0.5);
  setTimeout(() => grant({ gold: 200 + 60 * P.level, shards: rint(5, 8) + Math.floor(P.level / 5) }, 'Разлом Бездны закрыт', { sub: 'Следующий прорыв — через 8 часов' }), 900);
}

// ---- зов в деревне: что в Цитадели готово прямо сейчас (по важности)
export function calls() {
  const P = G.profile; if (!P || !started()) return [];
  const c = cs(), out = [];
  if (cqAvailable() && cqCurrent().now()) out.push({ k: 'q' + c.q, text: 'Поручение Цитадели: ' + cqCurrent().title });
  if (riftOpen()) out.push({ k: 'rift' + (c.riftAt || 0), text: 'В Цитадель прорвалась Бездна: закройте разлом — осколки и золото' });
  if (c.altar && CS.altarStored() >= CS.altarRate() * 4) out.push({ k: 'altar', text: `Алтарь накопил ${CS.altarStored()} золота` });
  if (c.trial && CS.seals().n >= CS.SEAL_MAX && (P.story.flags.eliteKilled || P.story.flags.bossKilled)) out.push({ k: 'seals', text: 'Печати испытаний полны — стражи ждут в Зале испытаний' });
  if (c.treasury && (P.shards || 0) >= CS.CHEST_SHARDS * 2) out.push({ k: 'chest', text: 'Осколков хватает на сундуки в Сокровищнице' });
  for (const id of Object.keys(ROOMS)) if (!c[id] && CS.canUnlock(id).ok) { out.push({ k: 'room_' + id, text: 'Можно открыть: ' + ROOMS[id].name }); break; }
  return out;
}
// П4-11: внутри Цитадели стрелка ведёт к тому, ради чего звал «!»: к разлому, иначе к карте цитадели (там поручение и комнаты)
export function callTarget() {
  const L = calls(); if (!L.length || !G.zone) return null;
  return (/^rift/.test(L[0].k) && G.zone.inter.find(i => i.id === 'castle_rift' && !i.hidden)) || G.zone.inter.find(i => i.id === 'castle_guide') || null;
}
function nudge(tries = 0) {
  if (G.zoneId !== 'town') return;
  if (G.modalOpen || inCombat()) { if (tries < 6) setTimeout(() => nudge(tries + 1), 5000); return; }   // окно открыто (дары, награда) — позже, а не поверх
  const L = calls(); if (!L.length) return;
  const c = cs(), now = Date.now(), top = L[0];
  const ago = now - (c.nudgeAt || 0), fresh = /^(q|rift)/.test(top.k) && top.k !== c.nudgeK;
  if (!fresh && (top.k === c.nudgeK ? ago < NUDGE_MS : ago < 15 * 60e3)) return;   // новое поручение или разлом — сразу; то же самое — не чаще раза в 90 минут, другое — в 15
  c.nudgeAt = now; c.nudgeK = top.k;
  bus.emit('toast', { text: 'Цитадель Ордена зовёт', sub: top.text + ' — солнечная арка с «!»', kind: 'quest' }); bus.emit('save');
}

bus.on('zoneEntered', id => {
  G.rift = null;
  if (!G.profile) return;
  if (id === 'castle') { const c = cs(); c.visits = (c.visits || 0) + 1; }
  if (id === 'town') setTimeout(() => nudge(), 3500);
});
bus.on('kill', riftKill);
// раз в 0,3 с из игрового цикла: поручения и «!» над аркой Цитадели в деревне
export function tick() {
  if (!G.profile || !G.zone) return;
  cqCheck();
  if (G.zoneId === 'town') { const pc = G.zone.inter.find(i => i.id === 'portal_castle'); if (pc) pc.marker = G.profile.level >= START_LVL && calls().length ? '!' : null; }
  if (G.zoneId === 'castle') { const g = G.zone.inter.find(i => i.id === 'castle_guide'); if (g) g.plate = cqAvailable() && cqCurrent().now() ? 'Карта цитадели · поручение' : 'Карта цитадели'; }   // «!» над картой путался со Стеной врагов
  if (G.zoneId === 'castle') { const r = G.zone.inter.find(i => i.id === 'castle_rift'); if (r && !G.rift && !riftOpen() && !r.hidden) { r.hidden = true; if (r.draw) r.draw.hidden = true; if (r.light) r.light.on = false; } }
}
