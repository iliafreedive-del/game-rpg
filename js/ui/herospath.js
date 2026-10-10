// «Летопись битв» — a flat, lazy auto-battle mini-game inside DARK ASCENT.
// Same hero, same stats and gear: everything you upgrade in the main game makes you stronger here, and rewards
// (gold, experience, Abyss shards) flow back. Stamina restores by itself → a reason to come back.
import { G, bus } from '../game/ctx.js';
import { $, el, esc, fmt, ICO } from '../core/util.js';
import { getAtlas, drawFrame } from '../core/assets.js';
import { ENEMIES } from '../data/enemies.js';
import { gainXP, xpMul } from '../game/loot.js';
import { addShards, torches, spendEnergy, TORCH_MAX, TORCH_MS, nextIn } from '../game/castle.js';
import { watchRewarded, offerToken, maybeInterstitial } from '../platform/monetize.js';
import { rand, rrange, clamp } from '../core/util.js';
import { adButton } from './adbtn.js';
import { CODEX } from '../data/story.js';
import { gate } from '../game/progress.js';
import { paintScene } from './hwscenes.js';
import { ART, artImg } from './art.js';
import { makeBattle, stageFoes, arenaView, setArenaLayout, relayoutBattle, hwSkill } from '../game/hwbattle.js';
import { current as curQuest } from '../game/quests.js';
import { xpToNext } from '../game/stats.js';
import { SKILLS } from '../data/skills.js';

// сборка 60: первая Летопись — шаг обучения «Испытать себя» (П8, П10)
const tut = () => { const q = G.profile && G.profile.story && curQuest(); return !!(q && q.id === 'hw_try'); };
// нарисованный фон арены этапа (П5): тот же выбор, что в бою, — чтобы заранее загрузить картинку
const arenaSrc = (s, port) => ART.arena(chOf(s) + 1, 'abc'[Math.min(2, Math.floor(((s - 1) % PER_CH) / 10))], port);
const portNow = () => innerWidth < innerHeight;

// сборка 47: энергия общая с Глубинами и Жатвой (game/castle.js); каждый бой стоит 1 ⚡ — и победа, и поражение
export const EN_MAX = TORCH_MAX;
const enN = () => torches().n;
function tryFight(s) { if (!spendEnergy(1)) { bus.emit('toast', { text: 'Нет энергии ⚡', sub: '+1 каждые 20 минут или «Получить энергию»', kind: 'warn' }); bus.emit('openEnergy'); return; } fight(s); }
// 4 главы по 30 этапов, у каждой свой фон (hwscenes.js): подземелье → лес → снега → скалы
const CHAPTERS = [
  { name: 'Подземелья Ордена', pool: ['skel_warrior', 'skel_archer', 'ghoul', 'skel_mage'] },
  { name: 'Старый Лес', pool: ['beast', 'ghoul', 'skel_archer', 'skel_warrior'] },
  { name: 'Фьорды Скъёльда', pool: ['skel_warrior', 'beast', 'skel_mage', 'ghoul'] },
  { name: 'Пепельные скалы', pool: ['elite_guard', 'beast', 'skel_mage', 'ghoul'] },
];
export const PER_CH = 30, STAGES = PER_CH * CHAPTERS.length;
const chOf = s => Math.min(CHAPTERS.length - 1, Math.floor((s - 1) / PER_CH));
// враг-«лицо» этапа для карты: босс ряда или первый в отряде
const stageEnemy = s => { const L = stageFoes(s), b = L.find(f => f.boss); return b ? { ...b, boss: true } : { ...L[0], boss: false }; };

// Страницы летописи Ордена: каждые 10 пройденных этапов — кусочек истории (js/data/story.js CODEX)
function codexPage(s) {
  const P = G.profile; const page = CODEX.find(c => c.at === s); if (!page) return;
  P.story.codex = P.story.codex || {}; if (P.story.codex[s]) return; P.story.codex[s] = 1;
  setTimeout(() => bus.emit('toast', { text: page.title, sub: page.text, kind: 'quest' }), 2200);
}
function HW() { const P = G.profile; P.hw = P.hw || { top: 1, stars: {}, en: { n: EN_MAX, at: Date.now() } }; const e = P.hw.en; const now = Date.now(); if (e.n < EN_MAX) { const k = Math.floor((now - e.at) / EN_MS); if (k > 0) { e.n = Math.min(EN_MAX, e.n + k); e.at = e.n >= EN_MAX ? now : e.at + k * EN_MS; } } else e.at = now; return P.hw; }
export const hwReady = () => { HW(); return enN() >= 5; };

let root = null, page = 0, raf = 0, curStage = null;
const disposeStage = () => { if (curStage) { try { curStage.dispose(); } catch { } curStage = null; } };
export function openHeroPath() {
  if (root) return; HW(); G.paused = true; G.modalOpen = true; G.hwOpen = true; bus.emit('audioPause', false);
  { const h = HW(); h.seenAt = G.profile.stats.playTime || 0; G.hwRemind = false; artImg(arenaSrc(h.top, portNow())); }   // П5: фон ближайшего боя грузится, пока игрок смотрит карту
  root = el('div', 'hw-root'); document.body.appendChild(root);
  page = chOf(HW().top);
  showMap();
}
function close() { bus.emit('music'); cancelAnimationFrame(raf); raf = 0; disposeStage(); if (root) root.remove(); root = null; G.paused = false; G.modalOpen = false; G.hwOpen = false; bus.emit('hud'); bus.emit('save'); }

function header(title) {
  const n = enN(), left = nextIn(torches(), TORCH_MS);
  const bar = el('div', 'hw-top', `<span class="hw-cur">${ICO.energy}${n}/${EN_MAX}${left ? ` <small>+1 через ${Math.ceil(left / 60000)} мин</small>` : ''}</span><span class="hw-cur c-gold">${ICO.gold}${fmt(G.profile.gold)}</span><span class="hw-cur c-shard">${ICO.shard}${G.profile.shards || 0}</span>`);
  const x = el('button', 'hw-back', '← В деревню'); x.onclick = close; bar.prepend(x);
  const en = el('button', 'btn gold sm hw-en', '⚡ Получить энергию'); en.onclick = () => bus.emit('openEnergy', () => { if (root) showMap(); }); bar.appendChild(en);   // сборка 47: на виду, сверху
  root.appendChild(bar);
  if (title) root.appendChild(el('div', 'hw-title', title));
}
function showMap() {
  cancelAnimationFrame(raf); disposeStage(); root.innerHTML = ''; header();
  const h = HW(), ch = CHAPTERS[page];
  const card = el('div', 'hw-map', `<div class="hw-pano"><img src="${ART.banner(page + 1)}" alt="" onerror="this.parentNode.remove()"></div><div class="hw-banner">Летопись битв · ${esc(ch.name)}</div><div class="hw-sub">Бой идёт сам. Ваш герой, его вещи, закалка и улучшения — те же, что в подземелье.</div>`);
  const grid = el('div', 'hw-grid');
  for (let i = 1; i <= PER_CH; i++) {
    const s = page * PER_CH + i, st = h.stars[s] || 0, locked = s > h.top || !!gate('hw', s), E = stageEnemy(s);
    const b = el('button', 'hw-stage' + (locked ? ' locked' : '') + (E.boss ? ' boss' : '') + (s === h.top ? ' cur' : ''), `<div class="hw-stars">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</div><div class="hw-num">${locked ? '🔒' : s}</div>${E.boss ? '<div class="hw-tag">босс</div>' : ''}`);
    b.onclick = () => { const g = gate('hw', s); if (g) { bus.emit('toast', { ...g, kind: 'warn' }); return; } if (s > h.top) { bus.emit('toast', { text: 'Этап закрыт', sub: `Сначала победите на этапе ${h.top}`, kind: 'warn' }); return; } showPrefight(s); };
    grid.appendChild(b);
  }
  card.appendChild(grid);
  const nav = el('div', 'hw-nav');
  const pv = el('button', 'btn', '◀'); pv.disabled = page === 0; pv.onclick = () => { page--; showMap(); };
  const nx = el('button', 'btn', '▶'); nx.disabled = page === CHAPTERS.length - 1 || h.top <= (page + 1) * PER_CH; nx.onclick = () => { page++; showMap(); };
  nav.append(pv, el('span', 'hw-page', `Глава ${page + 1}/${CHAPTERS.length}`), nx); card.appendChild(nav);
  if (h.top >= page * PER_CH + 1 && h.top <= (page + 1) * PER_CH && !gate('hw', h.top)) { const go = el('button', 'btn gold hw-go' + (h.top <= 3 ? ' nudge' : ''), `⚔ В бой · этап ${h.top}`); go.onclick = () => showPrefight(h.top); card.appendChild(go); }
  root.appendChild(card);
}
// П9: умение для Летописи — выбранное перед боем из выученных активных (P.hwSkill), иначе первое на кнопках
function hwSkillPick() {
  const P = G.profile, list = Object.keys(P.skills || {}).filter(k => P.skills[k] && SKILLS[k] && SKILLS[k].kind === 'active');
  const id = list.includes(P.hwSkill) ? P.hwSkill : (P.slots || []).find(k => list.includes(k)) || list[0] || null;
  return { id, list };
}
function heroSummary() {
  const S = G.stats; const cls = G.profile.cls || 'warrior', sid = hwSkillPick().id; return { skill: hwSkill(cls, sid, sid ? G.profile.skills[sid] : 1, sid ? SKILLS[sid].name : null), hp: S.maxHP, dmg: (S.dmgMin + S.dmgMax) / 2 * (cls === 'mage' ? Math.max(1, S.spellPower * 0.85) : 1), aps: Math.min(2.2, S.aps), crit: S.critChance, critMult: S.critMult, armor: S.armor, spell: S.spellPower };
}
const power = (hp, dmg, aps) => Math.round(dmg * aps * 10 + hp);
function showPrefight(s) {
  disposeStage(); cancelAnimationFrame(raf);
  root.innerHTML = ''; header();
  const L = stageFoes(s), H = heroSummary(), h = HW();
  const me = power(H.hp, H.dmg, H.aps), foe = L.reduce((n, f) => n + power(f.hp, f.dmg, f.aps), 0) * (1 + (L.length - 1) * 0.15);
  const names = {}; for (const f of L) names[f.name] = (names[f.name] || 0) + 1;
  const list = Object.entries(names).map(([n, k]) => esc(n) + (k > 1 ? ' ×' + k : '')).join('<br>');
  const card = el('div', 'hw-map hw-pre', `<div class="hw-banner">Этап ${s}${L.some(f => f.boss) ? ' · босс' : ''}</div>
    <div class="hw-vs"><div><b>Вы · ур. ${G.profile.level}</b><span>Сила ${fmt(me)}</span><span>♥ ${fmt(H.hp)} · ⚔ ${Math.round(H.dmg)}</span></div><div class="hw-vsx">VS</div><div><b>Врагов: ${L.length}</b><span>Сила ${fmt(Math.round(foe))}</span><span style="font-size:12px">${list}</span></div></div>
    <p class="${me >= foe ? 'good' : 'bad'}" style="text-align:center">${me >= foe * 1.3 ? 'Лёгкий бой' : me >= foe * 0.85 ? 'Равный бой' : 'Враг сильнее — прокачайтесь в катакомбах, улучшите вещи у кузнеца'}</p>`);
  // П9: выбор умения перед боем (их будет несколько) и как часто оно срабатывает
  { const pk = hwSkillPick(), box = el('div', 'hw-sk', `<b>Умение в бою:</b>`);
    if (!pk.list.length) box.appendChild(el('span', 'muted', ` ${esc(H.skill.name)} · раз в ${H.skill.every} хода (выучите умение у Элвина — сможете выбрать)`));
    for (const id of pk.list) { const sk = hwSkill(G.profile.cls || 'warrior', id, G.profile.skills[id], SKILLS[id].name), b = el('button', 'btn sm' + (id === pk.id ? ' gold' : ''), `${esc(sk.name)} <small>· раз в ${sk.every} хода</small>`);
      b.onclick = () => { G.profile.hwSkill = id; bus.emit('save'); showPrefight(s); }; box.appendChild(b); }
    card.appendChild(box); }
  if (tut() && s < 3) card.appendChild(el('p', 'muted', 'Первые два боя — без отступления. «Сбежать» появится с третьего.'));
  const row = el('div', 'hw-nav');
  const back = el('button', 'btn', 'К карте'); back.onclick = showMap;
  const go = el('button', 'btn gold', 'В бой · 1 ⚡');
  go.onclick = () => tryFight(s);
  // правки мамы (М7): «В бой» видно, но нажать не хотелось и было неясно, что дальше — в первых боях кнопка пульсирует и есть пояснение
  if (tut() || s <= 3) { go.classList.add('nudge'); card.appendChild(el('p', 'goldc', '☟ Нажмите «В бой» — бой пойдёт сам: герой и враги ходят по очереди, вам ничего делать не нужно.')); }
  row.append(back, go); card.appendChild(row); root.appendChild(card);
  artImg(arenaSrc(s, portNow()));   // П5
}

// ------------------------------------------------------------------ battle
// сборка 44: герой против отряда из 2–4 врагов на широкой арене (логика — game/hwbattle.js). Слои: 2D-фон → 3D-бойцы → 2D-полосы, имена, цифры, снаряды.
async function fight(s) {
  bus.emit('music', 'battle');   // сборка 60: боевая тема Летописи
  disposeStage(); cancelAnimationFrame(raf); root.innerHTML = ''; header();
  const stack = el('div', 'hw-stack'), bgcv = document.createElement('canvas'), glcv = document.createElement('canvas'), cv = document.createElement('canvas');
  stack.append(bgcv, glcv, cv); root.appendChild(stack);
  const ctx = cv.getContext('2d'), bctx = bgcv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
  let stage = null, view = null;
  let B = null;
  const resize = () => { if (B) relayoutBattle(B, stack.clientWidth < stack.clientHeight * 1.1); cv.width = bgcv.width = Math.round(cv.clientWidth * dpr); cv.height = bgcv.height = Math.round(cv.clientHeight * dpr); view = arenaView(cv.clientWidth, cv.clientHeight); if (stage) stage.resize(cv.clientWidth, cv.clientHeight); };
  resize();
  let speed = G.profile.hwSpeed === 2 ? 2 : 1; const speedB = el('button', 'hw-speed', '×' + speed); speedB.onclick = () => { speed = speed === 1 ? 2 : 1; G.profile.hwSpeed = speed; speedB.textContent = '×' + speed; }; root.appendChild(speedB);
  // сборка 47: «Сбежать» — прервать бой (энергия уже потрачена, награды нет)
  // сборка 60 (П8): в первой Летописи «Сбежать» — с 3-го боя, и отступление честно завершает шаг обучения (раньше — только гибель)
  const fleeB = el('button', 'hw-speed hw-flee', 'Сбежать'); fleeB.onclick = () => { ended = true; bus.emit('music'); cancelAnimationFrame(raf); raf = 0; speedB.remove(); fleeB.remove(); bus.emit('save'); if (tut()) fled(); else showMap(); };
  if (!(tut() && s < 3)) root.appendChild(fleeB);
  const ci = chOf(s), cls = G.profile.cls || 'warrior', wt = G.profile.gear.weapon ? G.profile.gear.weapon.wt : 'sword';
  setArenaLayout(stack.clientWidth < stack.clientHeight * 1.1);   // сборка 50: телефон вертикально — арена уже, бойцы крупнее
  B = makeBattle({ ...heroSummary(), cls }, stageFoes(s)); const Hu = B.H, foes = B.foes; stack.battle = B;   // stack.battle — для автотестов
  const nums = [], fx = [], labels = []; let time = 0, last = performance.now(), ended = false;
  // П5: нарисованный фон ждём (до 1,5 с) вместе с загрузкой 3D — иначе на долю секунды мелькала прежняя процедурная арена
  const artWait = new Promise(r => { const a = artImg(ART.arena(chOf(s) + 1, 'abc'[Math.min(2, Math.floor(((s - 1) % PER_CH) / 10))], stack.clientWidth < stack.clientHeight)); if (a.ok || a.bad) r(); else { a.wait.push(() => r()); a.im.addEventListener('error', () => r(), { once: true }); setTimeout(r, 1500); } });
  try {   // 3D-бойцы; если WebGL нет или он упал — прежние спрайты
    const M = await import('../render3d/hwstage.js');
    if (M.webglOK() && !(new URLSearchParams(location.search).get('render') === '2d')) { stage = M.createStage(glcv, { cls, wt, foes, ci }); curStage = stage; resize(); }
  } catch (e) { console.warn('[hw] 3D недоступно, спрайты', e); stage = null; }
  await artWait;
  if (!root || !root.contains(stack)) { disposeStage(); return; }
  glcv.style.display = stage ? 'block' : 'none';
  let bgCache = null, bgKey = '';
  // сборка 58: нарисованный задник главы (3 варианта на главу: этапы 1–10 → a, 11–20 → b, 21–30 → c); горизонт картинки (~50% высоты) — на горизонт арены
  const variant = 'abc'[Math.min(2, Math.floor(((s - 1) % PER_CH) / 10))];
  // сборка 59: картинка выбирается один раз на бой. Вертикальный и горизонтальный варианты нарисованы разными сценами — при повороте
  // телефона фон менялся на совсем другую картинку (а пока та грузилась — ещё и на процедурную стену). Теперь та же картинка, обрезанная под экран
  const arenaArt = port => artImg(ART.arena(ci + 1, variant, port)), artPort = stack.clientWidth < stack.clientHeight;
  arenaArt(artPort);
  function drawArt(W, Hh) {
    const r = arenaArt(artPort); if (!r.ok) return false;
    const im = r.im, iw = im.naturalWidth, ih = im.naturalHeight, hz = view.horizon * Hh, IH = 0.5;
    const k = Math.max(W / iw, Hh / ih, hz / (IH * ih), (Hh - hz) / ((1 - IH) * ih)), w = iw * k, h = ih * k;
    bctx.drawImage(im, (W - w) / 2, hz - IH * h, w, h); return true;
  }
  function drawBg(W, Hh) {
    const key = W + 'x' + Hh; if (key !== bgKey) { bgKey = key; bgCache = paintScene(ci, W, Hh, view.horizon); }
    const art = drawArt(W, Hh);
    if (!art && !arenaArt(artPort).bad && time < 4) { bctx.fillStyle = '#120d14'; bctx.fillRect(0, 0, W, Hh); }   // П5: картинка ещё в пути — тёмный фон, без старой арены
    else if (!art) {   // картинка не загрузилась — прежний процедурный фон
      bctx.drawImage(bgCache.far, 0, 0, W, Hh);
      for (const c of bgCache.clouds) { const x = ((c.x + time * c.v) % (W + 400)) - 200; bctx.globalAlpha = c.a; bctx.drawImage(bgCache.cloud, x, c.y, c.w, c.w * 0.4); } bctx.globalAlpha = 1;
      bctx.drawImage(bgCache.near, 0, 0, W, Hh);
    }
    const P = bgCache.parts; for (const p of P) { if (art && p.home) continue; p.y += p.vy * 0.016 * speed; if (p.home && p.y < p.home[1] - 70) { p.y = p.home[1]; p.x = p.home[0] + (Math.random() - 0.5) * 14; } p.x += Math.sin(time * p.f + p.o) * 0.3; if (p.y > Hh) p.y = -5; if (p.y < -5) p.y = Hh; bctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(time * 3 + p.o)); bctx.fillStyle = p.c; bctx.beginPath(); bctx.arc(p.x, p.y, p.r, 0, 7); bctx.fill(); }
    bctx.globalAlpha = 1;
  }
  const heightOf = u => u === Hu ? 2.0 : u.type === 'boss' ? 3.0 : u.big ? 2.4 : 1.9;
  // состояние бойца для 3D: клип и прогресс из текущего действия
  function state(u) {
    const a = u.act, d = { x: u.x, z: u.z, yaw: u.yaw, hop: 0, flash: (u.flash || 0) * 2.5 };
    if (u === Hu ? (B.over === 'lose' || Hu.hp <= 0) : u.dead) return { ...d, clip: 'death', k: Math.min(1, (u.deadT || 0) / 0.9) };
    if (a) {
      if (a.kind === 'melee') {
        if (a.ph === 'hit') return { ...d, clip: a.skill && u === Hu ? 'attack' : u.type === 'boss' ? 'attack2' : 'attack', k: a.t / a.dur, impact: a.imp, combo: Hu.n % 2, hop: a.skill ? Math.sin(Math.min(1, a.t / (a.dur * a.imp)) * Math.PI) * 0.9 : 0 };
        if (a.ph === 'back') { const k = Math.min(1, a.t / 0.4); return { ...d, clip: 'idle', hop: Math.sin(k * Math.PI) * 0.45 }; }
        return d;   // бег к цели — клип ходьбы по скорости
      }
      return { ...d, clip: 'cast', k: a.t / (a.dur || 0.5), impact: a.imp || 0.55 };
    }
    if (u.dodge > 0) return { ...d, hop: Math.sin((1 - u.dodge / 0.35) * Math.PI) * 0.35 };
    if (u.hitT > 0) return { ...d, clip: 'hit', k: 1 - u.hitT / 0.28 };
    return d;
  }
  const P = (x, y, z) => view.toScreen(x, y, z);
  function bar(u) {
    if (u.dead) return; const [x, y] = P(u.x, 0, u.z), w = u.boss ? 110 : 76, yy = y + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - w / 2 - 2, yy - 2, w + 4, 11);
    ctx.fillStyle = u === Hu ? '#3fae3a' : u.boss ? '#a03ad8' : '#c8302a'; ctx.fillRect(x - w / 2, yy, w * clamp(u.hp / u.max, 0, 1), 7);
    ctx.font = '600 12px Georgia'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    if (u.act && u.act.kind === 'melee') return;   // подбежал к цели — имя не налезает на её подпись
    const t = u === Hu ? `Вы ур.${G.profile.level}` : `${u.name} ур.${u.lvl}`; names.push({ t, x, y: yy + 22, w: ctx.measureText(t).width, c: u === Hu ? '#9fd0ff' : u.boss ? '#e0b0ff' : '#f0dca8' });
  }
  // сборка 50: подписи не налезают друг на друга — пересекающуюся сдвигаем ниже
  const names = [];
  function drawNames() {
    ctx.font = '600 12px Georgia'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    names.sort((a, b) => a.y - b.y); const put = [];
    const Wc = cv.width / dpr; for (const n of names) {
      n.x = clamp(n.x, n.w / 2 + 4, Wc - n.w / 2 - 4);
      for (let k = 0; k < 4 && put.some(p => Math.abs(p.x - n.x) < (p.w + n.w) / 2 + 4 && Math.abs(p.y - n.y) < 14); k++) n.y += 14;
      put.push(n); ctx.strokeText(n.t, n.x, n.y); ctx.fillStyle = n.c; ctx.fillText(n.t, n.x, n.y);
    }
    names.length = 0;
  }
  // П9: строка перезарядки умения — сколько ходов героя до следующего применения
  function cdLine(W) {
    if (Hu.hp <= 0 || B.over) return; const sk = B.sk, n = B.skillEvery, got = n - B.skillIn, narrow = W < 620, x = 12, y = narrow ? 84 : 24, w = 112;
    ctx.save(); ctx.textAlign = 'left'; ctx.font = '600 13px Georgia'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    const ic = { smash: '⚔', volley: '➶', ball: '✹' }[sk.fx] || '✦', t = `${ic} ${sk.name}`; ctx.strokeText(t, x, y); ctx.fillStyle = '#ffd77a'; ctx.fillText(t, x, y);
    const sw = (w - (n - 1) * 3) / n; for (let i = 0; i < n; i++) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x + i * (sw + 3) - 1, y + 6, sw + 2, 9); ctx.fillStyle = i < got ? (B.skillIn <= 1 ? '#ffd24a' : '#c8962e') : '#3a2f28'; ctx.fillRect(x + i * (sw + 3), y + 7, sw, 7); }
    const ready = B.skillIn <= 1, lt = ready ? 'на следующем ходу!' : `через ${B.skillIn} хода`; ctx.font = '600 11px Georgia'; ctx.strokeText(lt, x + w + 8, y + 14); ctx.fillStyle = ready ? '#ffe9a0' : '#d8c8a8'; ctx.fillText(lt, x + w + 8, y + 14);
    ctx.restore();
  }
  const PROJ = { arrow: ['#f4e6c0', 3], bolt: ['#7fd0ff', 7], fireball: ['#ff8a2a', 13], shadow: ['#b070ff', 8] };
  function drawProj(p) {
    if (p.t < 0) return; const [c, r] = PROJ[p.k] || PROJ.bolt;
    const sx = p.src.x, sz = p.src.z, k = p.k01 || 0, arc = Math.sin(k * Math.PI) * (p.k === 'arrow' ? 0.8 : 0.3);
    const [x, y] = P(p.x, 1.15 + arc, p.z), [x0, y0] = P(sx + (p.x - sx) * Math.max(0, k - 0.12), 1.15 + Math.sin(Math.max(0, k - 0.12) * Math.PI) * (p.k === 'arrow' ? 0.8 : 0.3), sz + (p.z - sz) * Math.max(0, k - 0.12));
    if (p.k === 'arrow') { ctx.strokeStyle = c; ctx.lineWidth = r; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); return; }
    const g = ctx.createLinearGradient(x0, y0, x, y); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c); ctx.strokeStyle = g; ctx.lineWidth = r * 1.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2); rg.addColorStop(0, '#fff8e0'); rg.addColorStop(0.35, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  function frame(now) {
    if (G.awayPause) { last = now; raf = requestAnimationFrame(frame); return; }   // правки 2 (П12): вкладка свёрнута — бой Летописи ждёт «Продолжить» (main.js)
    const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now; time += dt;
    if (cv.clientWidth * dpr !== cv.width || cv.clientHeight * dpr !== cv.height) resize();
    B.step(dt); if (Hu.hp <= 0) Hu.deadT = (Hu.deadT || 0) + dt;
    for (const e of B.ev.splice(0)) {
      if (e.k === 'num') nums.push({ u: e.u, s: e.s, c: e.c, big: e.big, t: 0, dx: (Math.random() - 0.5) * 30 });
      else if (e.k === 'label') labels.push({ u: e.u, s: e.s, t: 0 });
      else if (e.k === 'slash') fx.push({ k: 'slash', u: e.u, dir: e.from.x < e.u.x ? 1 : -1, t: 0 });
      else if (e.k === 'boom') fx.push({ k: 'boom', x: e.x, z: e.z, c: e.c, t: 0 });
      else if (e.k === 'sfx') bus.emit('sfx', e.id);
    }
    const W = cv.width / dpr, Hh = cv.height / dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
    drawBg(W, Hh);
    bctx.fillStyle = 'rgba(0,0,0,0.33)';   // тени под бойцами — на слое фона
    for (const u of [Hu, ...foes]) { const [x, y] = P(u.x, 0, u.z), r = view.pxPerM * (u.type === 'boss' ? 1.1 : u.big ? 0.85 : 0.6); bctx.beginPath(); bctx.ellipse(x, y, r, r * 0.38, 0, 0, 7); bctx.fill(); }
    if (stage) stage.draw(dt, state(Hu), foes.map(state));
    else {   // без WebGL: спрайты из атласов в тех же точках арены
      const sc = view.pxPerM / 70, units = [Hu, ...foes].sort((a, b) => a.z - b.z);
      for (const u of units) {
        const [x, y] = P(u.x, state(u).hop || 0, u.z);
        const names = u === Hu ? ['hero_body', 'hero_' + wt] : [ENEMIES[u.type] && ENEMIES[u.type].atlas]; const st = state(u);
        const clip = st.clip === 'death' ? 'death' : st.clip === 'attack' || st.clip === 'attack2' || st.clip === 'cast' ? (u === Hu ? 'slash1' : 'attack') : st.clip === 'hit' ? 'hit' : 'idle';
        for (const n of names) { const A = n && getAtlas(n); if (!A) continue; const nf = (A.clips && A.clips[clip] || [4])[0]; const fr = clip === 'idle' ? Math.floor(time * 5) % nf : Math.min(nf - 1, Math.floor((st.k || 0) * nf)); drawFrame(ctx, A, `${clip}_${Math.cos(u.yaw) > 0 || Math.sin(u.yaw) > 0 ? 7 : 3}_${fr}`, x, y, sc * (u === Hu ? 1.25 : u.type === 'boss' ? 1 : 1.4), false); }
      }
    }
    // удары, взрывы, снаряды
    for (let i = fx.length - 1; i >= 0; i--) {
      const q = fx[i]; q.t += dt; const D = q.k === 'boom' ? 0.5 : 0.25; if (q.t > D) { fx.splice(i, 1); continue; } const p = q.t / D;
      if (q.k === 'slash') { if (!q.u) continue; const [x, y] = P(q.u.x, 1.1, q.u.z), R = view.pxPerM * 0.8; ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = q.u === Hu ? '#ff9a8a' : '#fff3c0'; ctx.lineWidth = 6 * (1 - p) + 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, R, q.dir > 0 ? -2.4 + p * 0.6 : -0.7 - p * 0.6, q.dir > 0 ? -0.4 + p * 0.6 : 1.3 - p * 0.6); ctx.stroke(); ctx.restore(); }
      else { const [x, y] = P(q.x, 0.2, q.z), R = view.pxPerM * (0.6 + 2.2 * p); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,240,180,${0.9 * (1 - p)})`); g.addColorStop(0.4, q.c === 'gold' ? `rgba(255,200,80,${0.6 * (1 - p)})` : `rgba(255,110,30,${0.7 * (1 - p)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.6, 0, 0, 7); ctx.fill(); ctx.restore(); }
    }
    for (const p of B.projs) drawProj(p);
    for (const u of [Hu, ...foes]) bar(u);
    drawNames();
    cdLine(W);
    ctx.textAlign = 'center';
    for (let i = labels.length - 1; i >= 0; i--) {   // название умения над героем, как в автобоях: золотом, с подчёркиванием
      const L = labels[i]; L.t += dt; if (L.t > 1.4) { labels.splice(i, 1); continue; }
      const [x, y] = P(L.u.x, heightOf(L.u) + 1.1, L.u.z); ctx.globalAlpha = Math.min(1, (1.4 - L.t) * 3); ctx.font = 'bold 22px Georgia'; ctx.lineWidth = 4; ctx.strokeStyle = '#2a1608'; ctx.strokeText(L.s.toUpperCase(), x, y - L.t * 10); ctx.fillStyle = '#ffd77a'; ctx.fillText(L.s.toUpperCase(), x, y - L.t * 10);
      ctx.fillStyle = '#c8962e'; ctx.fillRect(x - 70, y + 6 - L.t * 10, 140, 2); ctx.globalAlpha = 1;
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += dt; if (n.t > 1.1) { nums.splice(i, 1); continue; }
      const [x, y] = P(n.u.x, heightOf(n.u) + 0.2, n.u.z), pop = n.t < 0.12 ? 1 + (0.12 - n.t) * 4 : 1;
      ctx.globalAlpha = Math.min(1, (1.1 - n.t) * 2.5); ctx.font = `bold ${Math.round((n.big === 2 ? 34 : n.big ? 28 : 22) * pop)}px Georgia`; ctx.lineWidth = 5; ctx.strokeStyle = '#1a0a00';
      const yy = y - n.t * 46; ctx.strokeText(n.s, x + n.dx, yy); ctx.fillStyle = n.c; ctx.fillText(n.s, x + n.dx, yy);
    }
    ctx.globalAlpha = 1;
    // табличка этапа сверху по центру, как «Окраины» в автобоях; живых врагов — справа
    // сборка 50: на узком экране заголовок ужимается по ширине, а «Врагов» уходит строкой ниже, а не поверх названия
    const ttl = `${CHAPTERS[ci].name} · этап ${s}`, narrowT = W < 620; ctx.font = 'bold 20px Georgia'; const tw = ctx.measureText(ttl).width, fs = Math.max(13, Math.min(20, Math.floor(20 * (W - 28) / tw)));
    ctx.font = `bold ${fs}px Georgia`; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(ttl, W / 2, 30); ctx.fillStyle = '#f0dca8'; ctx.fillText(ttl, W / 2, 30);
    const uw = Math.min(300, W - 40); ctx.fillStyle = '#c8962e'; ctx.fillRect(W / 2 - uw / 2, 38, uw, 2);
    const left = foes.filter(f => !f.dead).length, en = `Врагов: ${left}/${foes.length}`; ctx.font = '600 14px Georgia'; ctx.lineWidth = 3;
    if (narrowT) { ctx.textAlign = 'center'; ctx.strokeText(en, W / 2, 58); ctx.fillStyle = '#ffb0a0'; ctx.fillText(en, W / 2, 58); }
    else { ctx.textAlign = 'right'; ctx.strokeText(en, W - 14, 26); ctx.fillStyle = '#ffb0a0'; ctx.fillText(en, W - 14, 26); }
    ctx.textAlign = 'center';
    if (B.time < 1.0) { const bf = Math.round(52 * (1.4 - B.time * 0.4)); ctx.font = `bold ${bf}px Georgia`; ctx.fillStyle = `rgba(255,220,140,${1 - B.time})`; ctx.fillText('БОЙ!', W / 2, Math.max(Hh * 0.3, (narrowT ? 66 : 46) + bf)); }   // сборка 59: не наезжает на название этапа
    if (B.over && !ended) { ended = true; setTimeout(() => end(B.over === 'win'), 1500 / speed); }
    if (root && root.contains(stack)) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  function end(win) {
    if (!root || !root.contains(stack)) return;
    cancelAnimationFrame(raf); raf = 0; speedB.remove(); fleeB.remove(); bus.emit('music');
    const h = HW(), P = G.profile; const first = win && s >= h.top, lvl0 = P.level, isTut = tut(); let bonus = false;
    if (!win) bus.emit('hwLost');   // сборка 43: задание «Испытать себя в Летописи битв»
    const pct = Hu.hp / Hu.max; const stars = win ? (pct > 0.6 ? 3 : pct > 0.3 ? 2 : 1) : 0;
    let gold = 0, xp = 0, shards = 0;
    if (win) {
      // сборка 44: опыта меньше (было (8 + 4·этап)·1,6) — уровни идут из катакомб и походов, Летопись — проверка силы, а не прокачка
      gold = Math.round((10 + s * 4) * (first ? 2 : 0.25) * (1 + (stars - 1) * 0.15)); xp = Math.round((5 + s * 2.5) * (first ? 1 : 0.25));
      // сборка 60 (П10): в первой Летописи третья победа — 2-й уровень (первые две заполняют полосу опыта), уровень здесь, а не тихо в деревне
      if (isTut && first && P.level === 1) { const need = Math.max(1, xpToNext(1) - P.xp); xp = s >= 3 ? Math.ceil(need / Math.min(1, xpMul() || 1)) : Math.max(1, Math.min(need - 1, Math.round(need * (s === 1 ? 0.3 : 0.45)))); }
      if (h.bonus) { gold *= 2; h.bonus = 0; bonus = true; }   // П49: «Зов Летописи» — первая победа после напоминания с двойным золотом
      if (foes.some(f => f.boss) && first) shards = foes.some(f => f.type === 'boss') ? 5 : 3; else if (rand() < 0.1) shards = 1;
      P.gold += gold; gainXP(xp); if (shards) addShards(shards); bus.emit('hwWin');
      h.stars[s] = Math.max(h.stars[s] || 0, stars); if (first) { h.top = Math.min(STAGES, s + 1); codexPage(s); }
    }
    bus.emit('save');
    const up = P.level > lvl0;
    const loseTxt = isTut ? 'Отряд оказался сильнее. Это не беда: наставник Элвин подскажет, как стать сильнее, — идите к нему.' : 'Отряд оказался сильнее. Наберитесь опыта в катакомбах, улучшите вещи у кузнеца — и возвращайтесь.';
    const ov = el('div', 'hw-result ' + (win ? 'win' : 'lose') + (up ? ' up' : ''), `${up ? lvlBlock(P.level) : `<img class="hw-rimg" src="${ART.hwResult(win)}" alt="" onerror="this.remove()">`}<div class="hw-rt">${win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</div>${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.3}s">★</span>`).join('')}</div><div class="rw-loot"><span class="goldc">+${gold} золота${bonus ? ' (×2, зов Летописи)' : ''}</span> · <span style="color:#b8e3ff">+${xp} опыта</span>${shards ? ` · <span class="c-shard">+${shards}◆</span>` : ''}</div>${isTut && !up && P.level === 1 ? `<div class="hw-xpbar"><i style="width:${Math.round(P.xp / xpToNext(1) * 100)}%"></i><span>до 2-го уровня: ${Math.max(0, xpToNext(1) - P.xp)} опыта</span></div>` : ''}` : `<p>${loseTxt}</p>`}`);
    if (up) { bus.emit('sfx', 'epicDrop'); setTimeout(() => bus.emit('sfx', 'levelup'), 380); }
    const row = el('div', 'hw-nav');
    const map = el('button', 'btn', 'Карта'); map.onclick = async () => { await maybeInterstitial('hw'); showMap(); };
    const again = el('button', 'btn', 'Ещё раз · 1 ⚡'); again.onclick = () => tryFight(s);
    if (isTut && !win) { const home = el('button', 'btn gold', 'В деревню — к Элвину'); home.onclick = close; row.append(home); }   // П8: шаг обучения закончен — прямо в деревню
    else row.append(map, again);
    if (win && s < STAGES && h.top > s && !gate('hw', s + 1)) { const nx = el('button', 'btn gold', `Этап ${s + 1} ▶`); nx.onclick = () => showPrefight(s + 1); row.appendChild(nx); }
    ov.appendChild(row); root.appendChild(ov);
    const top = root.querySelector('.hw-top'); if (top) { top.remove(); const tmp = root.firstChild; header(); root.insertBefore(root.lastChild, tmp); }
  }
}

// сборка 60 (П10): новый уровень в Летописи — торжественно, как первый питомец: лучи, крупная цифра, что дал уровень и куда идти
function lvlBlock(L) {
  const pts = G.profile.skillPts | 0;
  return `<div class="rw-head hw-lvl"><div class="rw-rays r3"></div><div class="hw-lvl-ic">⬆</div><div class="hw-lvl-n">Уровень ${L}!</div><div class="hw-lvl-g">+1 очко навыка${pts > 1 ? ` (всего ${pts})` : ''} · здоровье и урон выросли</div><div class="hw-lvl-e">Наставник Элвин ждёт: очко навыка — на новый ранг умения</div></div>`;
}
// П8: отступление в первой Летописи — отдельный итог и путь в деревню (шаг обучения засчитывается после выхода)
function fled() {
  bus.emit('hwFled');
  const ov = el('div', 'hw-result lose', `<div class="hw-rt" style="color:#ffcf8a">ОТСТУПЛЕНИЕ</div><p>Вы вышли из боя — энергия потрачена, награды за этот бой нет. ${G.profile.level >= 2 ? 'Новый уровень уже ваш: идите к наставнику Элвину.' : 'Наставник Элвин подскажет, как стать сильнее.'}</p>`);
  const row = el('div', 'hw-nav'), home = el('button', 'btn gold', 'В деревню — к Элвину'); home.onclick = close; row.appendChild(home); ov.appendChild(row); root.appendChild(ov);
}

// ---------------------------------------------------------------- П49: напоминание о Летописи
// Игрок забывал про Летопись до 6 уровня. Раз в 15 минут игры (если ⚡ хватает на бои и Летопись уже знакома) в деревне:
// тост, «!» над аркой и «Зов Летописи» — первая победа после напоминания приносит двойное золото.
const REMIND_S = 15 * 60;
function remindTick() {
  const P = G.profile; if (!P || !P.story || root || G.zoneId !== 'town' || !G.zoneReady || G.cinema) return;
  const h = HW(); if (!(P.story.done || []).includes('hw_try') || P.level < 2 || gate('hw', h.top)) { G.hwRemind = false; return; }
  const now = P.stats.playTime || 0; if (h.seenAt == null) { h.seenAt = now; return; }
  if (G.hwRemind || now - h.seenAt < REMIND_S || enN() < 3 || G.modalOpen) return;
  G.hwRemind = true; h.bonus = 1; bus.emit('save');
  bus.emit('toast', { text: '⚔ Летопись битв зовёт!', sub: `⚡ ${enN()} — хватит на бои. Первая победа сейчас — двойное золото. Арка на площади (значок «!»)`, kind: 'quest' });
}
setInterval(remindTick, 4000);
