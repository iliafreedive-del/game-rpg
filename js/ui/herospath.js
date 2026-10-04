// «Летопись битв» — a flat, lazy auto-battle mini-game inside DARK ASCENT.
// Same hero, same stats and gear: everything you upgrade in the main game makes you stronger here, and rewards
// (gold, experience, Abyss shards) flow back. Stamina restores by itself → a reason to come back.
import { G, bus } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { getAtlas, drawFrame } from '../core/assets.js';
import { ENEMIES } from '../data/enemies.js';
import { gainXP } from '../game/loot.js';
import { addShards } from '../game/castle.js';
import { watchRewarded, offerToken, maybeInterstitial } from '../platform/monetize.js';
import { rand, rrange, clamp } from '../core/util.js';
import { adButton } from './adbtn.js';
import { gate } from '../game/progress.js';
import { paintScene } from './hwscenes.js';

export const EN_MAX = 20, EN_MS = 9 * 60e3;   // полный запас — 3 часа
// энергия тратится на повторы пройденных этапов и на поражение; первая победа на новом этапе — бесплатно (сборка 16)
const spendEn = h => { if (h.en.n >= EN_MAX) h.en.at = Date.now(); h.en.n = Math.max(0, h.en.n - 1); };
function tryFight(s) { const h = HW(); if (h.en.n <= 0) return; if (s < h.top) spendEn(h); fight(s); }
// 4 главы по 30 этапов, у каждой свой фон (hwscenes.js): подземелье → лес → снега → скалы
const CHAPTERS = [
  { name: 'Подземелья Ордена', pool: ['skel_warrior', 'skel_archer', 'ghoul', 'skel_mage'] },
  { name: 'Старый Лес', pool: ['beast', 'ghoul', 'skel_archer', 'skel_warrior'] },
  { name: 'Фьорды Скъёльда', pool: ['skel_warrior', 'beast', 'skel_mage', 'ghoul'] },
  { name: 'Пепельные скалы', pool: ['elite_guard', 'beast', 'skel_mage', 'ghoul'] },
];
export const PER_CH = 30, STAGES = PER_CH * CHAPTERS.length;
const chOf = s => Math.min(CHAPTERS.length - 1, Math.floor((s - 1) / PER_CH));
const stageEnemy = s => {
  const ch = CHAPTERS[chOf(s)], k = (s - 1) % 10;
  if (k === 9) return { type: 'boss', name: 'Палач Бездны', boss: true };
  if (k === 4) return { type: 'elite_guard', name: 'Страж тропы', boss: true };
  const type = ch.pool[s % ch.pool.length]; return { type, name: ENEMIES[type].name };
};
const enemyStats = s => {
  const e = stageEnemy(s), m = e.boss ? (e.type === 'boss' ? 3.2 : 2.2) : 1, a = Math.min(s, 30) - 1, b = Math.max(0, s - 30);
  return { ...e, hp: Math.round(55 * Math.pow(1.17, a) * Math.pow(1.095, b) * m), dmg: 5.5 * Math.pow(1.14, a) * Math.pow(1.075, b) * (e.boss ? 1.3 : 1),   /* после 30-го этапа — круче (было ×1,06/×1,05 за этап) */ aps: e.type === 'ghoul' ? 1.3 : e.boss ? 0.7 : 0.9, lvl: 1 + Math.floor(s * 0.6) };
};

function HW() { const P = G.profile; P.hw = P.hw || { top: 1, stars: {}, en: { n: EN_MAX, at: Date.now() } }; const e = P.hw.en; const now = Date.now(); if (e.n < EN_MAX) { const k = Math.floor((now - e.at) / EN_MS); if (k > 0) { e.n = Math.min(EN_MAX, e.n + k); e.at = e.n >= EN_MAX ? now : e.at + k * EN_MS; } } else e.at = now; return P.hw; }
export const hwReady = () => { const h = HW(); return h.en.n >= 5; };

let root = null, page = 0, raf = 0, curStage = null;
const disposeStage = () => { if (curStage) { try { curStage.dispose(); } catch { } curStage = null; } };
export function openHeroPath() {
  if (root) return; HW(); G.paused = true; G.modalOpen = true; bus.emit('audioPause', false);
  root = el('div', 'hw-root'); document.body.appendChild(root);
  page = chOf(HW().top);
  showMap();
}
function close() { cancelAnimationFrame(raf); raf = 0; disposeStage(); if (root) root.remove(); root = null; G.paused = false; G.modalOpen = false; bus.emit('hud'); bus.emit('save'); }

function header(title) {
  const h = HW(); const left = h.en.n >= EN_MAX ? 0 : Math.max(0, h.en.at + EN_MS - Date.now());
  const bar = el('div', 'hw-top', `<span class="hw-cur">⚡ ${h.en.n}/${EN_MAX}${left ? ` <small>+1 через ${Math.ceil(left / 60000)} мин</small>` : ''}</span><span class="hw-cur c-gold">${fmt(G.profile.gold)} зол.</span><span class="hw-cur c-shard">${G.profile.shards || 0}◆</span>`);
  const x = el('button', 'hw-back', '← В деревню'); x.onclick = close; bar.prepend(x);
  root.appendChild(bar);
  if (title) root.appendChild(el('div', 'hw-title', title));
}
function showMap() {
  cancelAnimationFrame(raf); disposeStage(); root.innerHTML = ''; header();
  const h = HW(), ch = CHAPTERS[page];
  const card = el('div', 'hw-map', `<div class="hw-banner">Летопись битв · ${esc(ch.name)}</div><div class="hw-sub">Бой идёт сам. Ваш герой, его вещи, закалка и улучшения — те же, что в подземелье.</div>`);
  const grid = el('div', 'hw-grid');
  for (let i = 1; i <= PER_CH; i++) {
    const s = page * PER_CH + i, st = h.stars[s] || 0, locked = s > h.top || !!gate('hw', s), E = stageEnemy(s);
    const b = el('button', 'hw-stage' + (locked ? ' locked' : '') + (E.boss ? ' boss' : '') + (s === h.top ? ' cur' : ''), `<div class="hw-stars">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</div><div class="hw-num">${locked ? '🔒' : s}</div>${E.boss ? '<div class="hw-tag">босс</div>' : ''}`);
    b.onclick = () => { if (locked) return; const g = gate('hw', s); if (g) { bus.emit('toast', { ...g, kind: 'warn' }); return; } showPrefight(s); };
    grid.appendChild(b);
  }
  card.appendChild(grid);
  const nav = el('div', 'hw-nav');
  const pv = el('button', 'btn', '◀'); pv.disabled = page === 0; pv.onclick = () => { page--; showMap(); };
  const nx = el('button', 'btn', '▶'); nx.disabled = page === CHAPTERS.length - 1 || h.top <= (page + 1) * PER_CH; nx.onclick = () => { page++; showMap(); };
  const ad = adButton('+10 ⚡', 'hw_en', 30 * 60e3, () => { h.en.n = Math.min(EN_MAX + 10, h.en.n + 10); }, showMap);
  nav.append(pv, el('span', 'hw-page', `Глава ${page + 1}/${CHAPTERS.length}`), nx); card.appendChild(nav);
  if (h.top >= page * PER_CH + 1 && h.top <= (page + 1) * PER_CH && !gate('hw', h.top)) { const go = el('button', 'btn gold hw-go', `⚔ В бой · этап ${h.top}`); go.onclick = () => showPrefight(h.top); card.appendChild(go); }
  const adr = el('div', 'hw-nav'); adr.appendChild(ad); card.appendChild(adr);
  root.appendChild(card);
}
function heroSummary() {
  const S = G.stats; const cls = G.profile.cls || 'warrior'; return { hp: S.maxHP, dmg: (S.dmgMin + S.dmgMax) / 2 * (cls === 'mage' ? Math.max(1, S.spellPower * 0.85) : 1), aps: Math.min(2.2, S.aps), crit: S.critChance, critMult: S.critMult, armor: S.armor, spell: S.spellPower };
}
function showPrefight(s) {
  disposeStage(); cancelAnimationFrame(raf);
  root.innerHTML = ''; header();
  const E = enemyStats(s), H = heroSummary(); const h = HW();
  const power = Math.round(H.dmg * H.aps * 10 + H.hp), foe = Math.round(E.dmg * E.aps * 10 + E.hp);
  const card = el('div', 'hw-map hw-pre', `<div class="hw-banner">Этап ${s}${E.boss ? ' · босс' : ''}</div>
    <div class="hw-vs"><div><b>Вы</b><span>Сила ${fmt(power)}</span><span>♥ ${fmt(H.hp)} · ⚔ ${Math.round(H.dmg)}</span></div><div class="hw-vsx">VS</div><div><b>${esc(E.name)}</b><span>Сила ${fmt(foe)}</span><span>♥ ${fmt(E.hp)} · ⚔ ${Math.round(E.dmg)}</span></div></div>
    <p class="${power >= foe ? 'good' : 'bad'}" style="text-align:center">${power >= foe * 1.3 ? 'Лёгкий бой' : power >= foe ? 'Равный бой' : 'Враг сильнее — улучшите героя у наставника или кузнеца'}</p>`);
  const row = el('div', 'hw-nav');
  const back = el('button', 'btn', 'К карте'); back.onclick = showMap;
  const fresh = s >= h.top, go = el('button', 'btn gold', fresh ? 'В бой · ⚡ только при поражении' : 'В бой · 1 ⚡'); go.disabled = h.en.n <= 0;
  go.onclick = () => tryFight(s);
  row.append(back, go); if (h.en.n <= 3) row.appendChild(adButton('+10 ⚡', 'hw_en', 30 * 60e3, () => { h.en.n = Math.min(EN_MAX + 10, h.en.n + 10); }, () => showPrefight(s))); card.appendChild(row); root.appendChild(card);
}

// ------------------------------------------------------------------ battle
async function fight(s) {
  disposeStage(); cancelAnimationFrame(raf); root.innerHTML = ''; header();
  // три слоя: 2D-фон (hwscenes.js) → 3D-бойцы (render3d/hwstage.js, те же модели, что в игре) → 2D-полосы, цифры и дуги ударов
  const stack = el('div', 'hw-stack'), bgcv = document.createElement('canvas'), glcv = document.createElement('canvas'), cv = document.createElement('canvas');
  stack.append(bgcv, glcv, cv); root.appendChild(stack);
  const ctx = cv.getContext('2d'), bctx = bgcv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
  let stage = null;
  const resize = () => { cv.width = bgcv.width = Math.round(cv.clientWidth * dpr); cv.height = bgcv.height = Math.round(cv.clientHeight * dpr); if (stage) stage.resize(cv.clientWidth, cv.clientHeight); };
  resize();
  let speed = G.profile.hwSpeed === 2 ? 2 : 1; const speedB = el('button', 'hw-speed', '×' + speed); speedB.onclick = () => { speed = speed === 1 ? 2 : 1; G.profile.hwSpeed = speed; speedB.textContent = '×' + speed; }; root.appendChild(speedB);
  const ch = CHAPTERS[chOf(s)];
  const H = heroSummary(), E = enemyStats(s);
  const hero = { hp: H.hp, max: H.hp, t: 0.6, anim: 'idle', at: 0, flash: 0, x: 0, skillT: 3.5, invul: 0 };
  const foe = { hp: E.hp, max: E.hp, t: 1.1, anim: 'idle', at: 0, flash: 0, x: 0, dead: 0 };
  const nums = []; let time = 0, over = null, last = performance.now();
  // хореография: бойцы держат дистанцию, сближаются на удар; герой иногда перекатывается или пролетает рывком сквозь врага — стороны меняются
  const sw = 1; hero.dash = 0; hero.roll = 0; const ghosts = [];
  const sideT = () => [0.5 - sw * 0.24, 0.5 + sw * 0.24];
  // стили ударов: каждый атакующий выбирает свой — сверху вниз (прыжок), тычок (быстрый выпад), наотмашь (боковой замах), обычный; промах = заносит вперёд, противник уходит
  const STYLES = { slash: { d: 0.55, imp: 0.3, m: 1 }, overhead: { d: 0.8, imp: 0.55, m: 1.35 }, thrust: { d: 0.4, imp: 0.2, m: 0.85 }, sweep: { d: 0.62, imp: 0.36, m: 1.05 }, shoot: { d: 0.5, imp: 0.3, m: 1 }, cast: { d: 0.65, imp: 0.4, m: 1 }, stumble: { d: 0.7, imp: 9, m: 0 }, evade: { d: 0.45, imp: 9, m: 0 }, swing: { d: 0.7, imp: 0.42, m: 1 }, lunge: { d: 0.55, imp: 0.3, m: 1 }, leap: { d: 0.85, imp: 0.6, m: 1.2 } };
  const startAct = (who, kind, extra = {}) => { const S = STYLES[kind]; who.act = { k: kind, t: 0, d: S.d, imp: S.imp, m: S.m, fired: false, ...extra }; };
  const bell = p => Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);
  // поза по стилю: off — смещение к сопернику (доли ширины), hop — подскок, rot — наклон вперёд, sx — растяжение
  const pose = who => {
    const a = who.act; if (!a || a.t >= a.d) return { off: 0, hop: 0, rot: 0, sx: 1 };
    const p = a.t / a.d, b = bell(p);
    switch (a.k) {
      case 'overhead': case 'leap': return { off: 0.11 * bell(p * 1.1), hop: (p < 0.6 ? bell(p / 0.6) : 0) * 60, rot: p < 0.35 ? -0.3 * (p / 0.35) : p < 0.62 ? -0.3 + 0.85 * ((p - 0.35) / 0.27) : 0.55 * (1 - (p - 0.62) / 0.38), sx: 1 };
      case 'thrust': case 'lunge': return { off: 0.2 * (p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7)), hop: 0, rot: 0.12 * b, sx: 1 + 0.14 * (p < 0.4 ? b : 0) };
      case 'sweep': case 'swing': return { off: 0.12 * b, hop: 8 * b, rot: 0.34 - 0.7 * p, sx: 1 };
      case 'stumble': return { off: 0.1 * b, hop: 0, rot: 0.5 * bell(p * 0.9), sx: 1 };
      case 'evade': return { off: -0.1 * b, hop: 10 * b, rot: -0.3 * b, sx: 1 };
      case 'shoot': return { off: -0.03 * b, hop: 0, rot: -0.1 * b, sx: 1 };
      case 'cast': return { off: 0, hop: 14 * b, rot: -0.12 * b, sx: 1 };
      default: return { off: 0.15 * b, hop: 0, rot: 0.1 * b, sx: 1 };
    }
  };
  const slashes = [];   // дуги ударов на экране
  const cls = G.profile.cls || 'warrior', wt = G.profile.gear.weapon ? G.profile.gear.weapon.wt : 'sword';
  const heroAtlas = cls !== 'warrior' && getAtlas(`hero_${cls}_body`) ? [`hero_${cls}_body`, `hero_${cls}_${cls === 'archer' ? 'bow' : 'staff'}`] : ['hero_body', 'hero_' + wt].concat(wt === 'sword' || wt === 'axe' ? ['hero_shield'] : []);
  const heroClip = wt === 'bow' ? 'bowrel' : wt === 'staff' ? 'cast' : wt === 'greatsword' ? 'chop2' : 'slash1';
  const HNF = { idle: 4, slash1: 7, chop2: 9, bowrel: 3, cast: 6, hit: 3, death: 8 };
  const redu = H.armor / (H.armor + 50 + 10 * E.lvl);
  // длина боя: сильные против слабого всё равно дерутся несколько заходов (≈12 ударов героя), а не 5 секунд: здоровье обеих сторон и урон врага растут одинаково
  const dmgEff = Math.max(1, E.dmg * (1 - redu)), nHits = Math.min(E.hp / Math.max(1, H.dmg * 0.95), H.hp / dmgEff), KT = Math.min(25, Math.max(1, 12 / Math.max(0.5, nHits)));
  E.hp = Math.round(E.hp * KT); hero.hp = hero.max = Math.round(H.hp * KT); foe.hp = foe.max = E.hp;
  const hitFoe = (mul, label) => {
    let d = H.dmg * mul * rrange(0.85, 1.15), crit = rand() < H.crit; if (crit) d *= H.critMult; d = Math.round(d);
    foe.hp -= d; foe.flash = 0.15; foe.anim = 'hit'; foe.at = 0;
    nums.push({ x: foe.bx, y: 0.42, t: 0, s: crit ? `${d}!` : String(d), c: label ? '#ffb86a' : crit ? '#ffd24a' : '#fff', big: crit || label });
    if (label) nums.push({ x: 0.5, y: 0.25, t: 0, s: label, c: '#9fe38e', big: 1 });
    bus.emit('sfx', crit ? 'heavy' : 'hit');
  };
  const skillName = { warrior: 'Сокрушение!', archer: 'Залп!', mage: 'Огненный шар!' }[cls];
  // ---- ход боя: бойцы всё время лицом друг к другу; сближаются шагами, после ударов пятятся (шаг назад лицом к врагу), давят вперёд,
  // стрелок и маг держат дистанцию — отступают на ходу и стреляют. Без разворотов спиной и «разошлись по углам».
  const BASE = [0.2, 0.8], WALK = 0.2;
  const ranged = cls === 'archer' || cls === 'mage', foeRanged = E.type === 'skel_archer' || E.type === 'skel_mage';
  const reachH = cls === 'archer' ? 0.46 : cls === 'mage' ? 0.4 : 0.15, reachF = foeRanged ? 0.42 : E.boss ? 0.19 : 0.15;
  const clampX = x => Math.min(0.88, Math.max(0.12, x));
  let phase = 'approach', phaseT = 0, seq = ['h', 'f'], waitT = 0.4, kiteT = 0;
  hero.dirF = 1; foe.dirF = -1; hero.bx = BASE[0]; foe.bx = BASE[1]; hero.tx = hero.bx; foe.tx = foe.bx;
  const gap = () => foe.bx - hero.bx;
  // идти к цели tx; бойцы не проходят друг сквозь друга (минимум 0.1 ширины)
  const walk = (o, dt, isHero) => {
    const d = o.tx - o.bx; if (Math.abs(d) < 0.002) return true;
    const m = Math.sign(d) * Math.min(Math.abs(d), WALK * (ranged && isHero ? 1.15 : 1) * dt); let nb = o.bx + m;
    if (isHero) nb = Math.min(nb, foe.bx - 0.1); else nb = Math.max(nb, hero.bx + 0.1);
    o.bx = nb; return false;
  };
  const heroTurn = () => {
    if (hero.skillT <= 0) { hero.skillT = 7; startAct(hero, cls === 'warrior' ? 'overhead' : cls === 'archer' ? 'shoot' : 'cast', { skill: true }); return; }
    const kinds = cls === 'archer' ? ['shoot'] : cls === 'mage' ? ['cast'] : ['slash', 'overhead', 'thrust', 'sweep'];
    let kind = kinds[(rand() * kinds.length) | 0]; if (kind === hero.lastKind && kinds.length > 1) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length]; hero.lastKind = kind;
    startAct(hero, kind, { miss: !E.boss && rand() < 0.12 });
  };
  const foeTurn = () => { const fk = E.boss ? ['swing', 'leap', 'lunge'] : ['swing', 'lunge', 'swing']; startAct(foe, fk[(rand() * fk.length) | 0]); foe.anim = 'attack'; foe.at = 0; };
  function step(dt) {
    if (over) return;
    time += dt; hero.at += dt; foe.at += dt; hero.flash -= dt; foe.flash -= dt; phaseT += dt;
    if (hero.act) hero.act.t += dt; if (foe.act) foe.act.t += dt;
    if (hero.skillT > 0) hero.skillT -= dt * (phase === 'exchange' ? 1 : 0.5);
    const busy = (hero.act && hero.act.t < hero.act.d) || (foe.act && foe.act.t < foe.act.d);
    if (foe.hp > 0 && hero.hp > 0) {
      walk(hero, dt, true); walk(foe, dt, false); kiteT -= dt;
      if (phase === 'approach') {   // шагом навстречу, пока не окажутся на дистанции боя
        hero.tx = clampX(foe.bx - reachH * 0.85); foe.tx = clampX(hero.bx + reachF * 0.85);
        if (gap() <= Math.max(reachH, reachF) + 0.02 && !busy) { phase = 'exchange'; phaseT = 0; waitT = 0.3; }
      } else {
        // стрелок: враг подошёл слишком близко — отступает на ходу (и стреляет дальше)
        if (ranged && kiteT <= 0 && gap() < reachH * 0.55 && hero.bx > 0.16) { hero.tx = clampX(hero.bx - rrange(0.1, 0.16)); kiteT = 1.4; }
        waitT -= dt;
        if (!busy && waitT <= 0) {
          const who = seq[0], g = gap();
          if (who === 'h') {
            if (g > reachH + 0.01) { hero.tx = clampX(foe.bx - reachH * 0.85); waitT = 0.12; }   // подойти на дистанцию удара
            else { seq.shift(); seq.push('h'); heroTurn(); waitT = 0.28 + rand() * 0.2;
              if (ranged ? rand() < 0.45 : rand() < 0.4) hero.tx = clampX(hero.tx - rrange(0.03, 0.07));   // после удара — шаг назад лицом к врагу
              else if (!ranged && rand() < 0.35) hero.tx = clampX(Math.min(foe.bx - 0.11, hero.tx + rrange(0.02, 0.05))); }   // или нажим вперёд
          } else {
            if (g > reachF + 0.01) { foe.tx = clampX(hero.bx + reachF * 0.85); waitT = 0.12; }
            else { seq.shift(); seq.push('f'); foeTurn(); waitT = 0.28 + rand() * 0.2;
              if (!foeRanged && rand() < 0.3) foe.tx = clampX(foe.tx + rrange(0.03, 0.06));   // враг тоже иногда отступает на шаг
              else if (foeRanged && g < 0.3) foe.tx = clampX(foe.tx + rrange(0.05, 0.1)); }
          }
        }
      }
    }
    // исполнение ударов
    if (hero.act && !hero.act.fired && hero.act.t >= hero.act.imp) {
      const a = hero.act; a.fired = true;
      if (a.miss) { nums.push({ x: foe.bx, y: 0.42, t: 0, s: 'Мимо!', c: '#cfd8e6', big: 1 }); startAct(foe, 'evade'); if (a.k !== 'shoot' && a.k !== 'cast') startAct(hero, 'stumble'); bus.emit('sfx', 'swing'); }
      else if (a.skill) { if (cls === 'archer') { hitFoe(0.8, skillName); setTimeout(() => !over && hitFoe(0.8), 160 / speed); setTimeout(() => !over && hitFoe(0.8), 320 / speed); } else hitFoe(cls === 'mage' ? 2.4 * H.spell / 1.2 : 2.5, skillName); slashes.push({ side: 'foe', k: a.k, t: 0 }); }
      else { hitFoe(a.m); slashes.push({ side: 'foe', k: a.k, t: 0 }); }
    }
    if (foe.act && !foe.act.fired && foe.act.t >= foe.act.imp && foe.hp > 0) {
      const a = foe.act; a.fired = true;
      if (rand() < 0.2) { startAct(hero, 'evade'); startAct(foe, 'stumble'); nums.push({ x: 0.5, y: 0.3, t: 0, s: 'Уворот!', c: '#9fe38e', big: 1 }); bus.emit('sfx', 'dodge'); }
      else { const d = Math.round(E.dmg * KT * rrange(0.85, 1.15) * (1 - redu) * a.m); hero.hp -= d; hero.flash = 0.15; nums.push({ x: hero.bx, y: 0.42, t: 0, s: '-' + d, c: '#ff6a5a' }); slashes.push({ side: 'hero', k: a.k, t: 0 }); bus.emit('sfx', 'hurt'); }
    }
    if (foe.hp <= 0 && !foe.dead) { foe.dead = 1; foe.anim = 'death'; foe.at = 0; bus.emit('sfx', 'bones'); setTimeout(() => end(true), 1300 / speed); over = 'win-pending'; }
    else if (hero.hp <= 0) { hero.anim = 'death'; hero.at = 0; over = 'lose-pending'; setTimeout(() => end(false), 1300 / speed); }
    for (const n of nums) n.t += dt; while (nums.length && nums[0].t > 1) nums.shift();
  }
  try {   // 3D-бойцы; если WebGL нет или он упал — прежние спрайты
    const M = await import('../render3d/hwstage.js');
    if (M.webglOK() && !(new URLSearchParams(location.search).get('render') === '2d')) { stage = M.createStage(glcv, { cls, wt, enemyType: E.type, boss: E.type === 'boss', ci: chOf(s) }); curStage = stage; resize(); }
  } catch (e) { console.warn('[hw] 3D недоступно, спрайты', e); stage = null; }
  if (!root || !root.contains(stack)) { disposeStage(); return; }
  glcv.style.display = stage ? 'block' : 'none';
  let bgCache = null, bgKey = '';
  function drawBg(W, Hh) {
    const key = W + 'x' + Hh; if (key !== bgKey) { bgKey = key; bgCache = paintScene(chOf(s), W, Hh); }
    bctx.drawImage(bgCache.far, 0, 0, W, Hh);
    // drifting clouds
    for (const c of bgCache.clouds) { const x = ((c.x + time * c.v) % (W + 400)) - 200; bctx.globalAlpha = c.a; bctx.drawImage(bgCache.cloud, x, c.y, c.w, c.w * 0.4); } bctx.globalAlpha = 1;
    bctx.drawImage(bgCache.near, 0, 0, W, Hh);
    // ambient particles: fireflies / snow / embers
    const P = bgCache.parts; for (const p of P) { p.y += p.vy * 0.016 * speed; if (p.home && p.y < p.home[1] - 70) { p.y = p.home[1]; p.x = p.home[0] + (Math.random() - 0.5) * 14; } p.x += Math.sin(time * p.f + p.o) * 0.3; if (p.y > Hh) p.y = -5; if (p.y < -5) p.y = Hh; bctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(time * 3 + p.o)); bctx.fillStyle = p.c; bctx.beginPath(); bctx.arc(p.x, p.y, p.r, 0, 7); bctx.fill(); }
    bctx.globalAlpha = 1;
  }
  function drawUnit(names, clip, nf, fps, t, x, y, sc, flip, dir, flash, loop) {
    let fr = Math.floor(t * fps); fr = loop ? fr % nf : Math.min(nf - 1, fr);
    for (const n of names) { const A = getAtlas(n); if (!A) continue; drawFrame(ctx, A, `${clip}_${dir}_${fr}`, x, y, sc, flip); }
    if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash * 4; for (const n of names.slice(0, 1)) { const A = getAtlas(n); if (A) drawFrame(ctx, A, `${clip}_${dir}_${fr}`, x, y, sc, flip); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  function bar(x, y, w, v, max, col, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 2, y - 2, w + 4, 22); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v / max, 0, 1), 18);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${13 * dpr / dpr}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`${Math.max(0, Math.ceil(v))} / ${max}`, x + w / 2, y + 14);
    ctx.textAlign = 'left'; ctx.font = '600 13px Georgia'; ctx.fillStyle = '#f0dca8'; ctx.fillText(label, x, y - 6);
  }
  // состояние бойца для 3D: клип модели и прогресс из текущего «акта» хореографии
  const clipOf = (who, isHero) => {
    if (who.dead || (isHero && over === 'lose-pending')) return { clip: 'death', k: Math.min(1, who.at / 0.9) };
    const a = who.act;
    if (isHero && hero.dash > 0) return { clip: 'dodge', k: 1 - hero.dash / 0.5 };
    if (a && a.t < a.d) {
      const k = a.t / a.d, impact = a.imp < a.d ? a.imp / a.d : undefined;
      if (a.k === 'stumble') return { clip: 'hit', k };
      if (a.k === 'evade') return isHero ? { clip: 'dodge', k } : { clip: 'hit', k };
      if (isHero) return { clip: (a.k === 'shoot' || a.k === 'cast') ? 'cast' : 'attack', k, impact, combo: hero.lastKind === 'sweep' || hero.lastKind === 'thrust' ? 1 : 0 };
      const ranged = E.type === 'skel_archer' || E.type === 'skel_mage';
      return { clip: ranged ? 'cast' : a.k === 'leap' ? 'slam' : a.k === 'lunge' && E.type === 'boss' ? 'attack2' : 'attack', k, impact };
    }
    if (who.flash > 0) return { clip: 'hit', k: Math.min(1, 1 - who.flash / 0.15) };
    return {};
  };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now;
    if (cv.clientWidth * dpr !== cv.width) resize();
    step(dt);
    const W = cv.width / dpr, Hh = cv.height / dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
    drawBg(W, Hh);
    const gy = Hh * 0.8, sc = stage ? stage.pxPerM() / 95 : Math.min(1.3, Hh / 330) * 1.0;
    const hP = pose(hero), fP = pose(foe), hx = hero.bx + hP.off * sw, fx = foe.bx - fP.off * sw;
    // тени под бойцами — на слое фона, под моделями
    bctx.fillStyle = 'rgba(0,0,0,0.32)'; for (const [f, big] of [[hx, 1], [fx, E.type === 'boss' ? 1.8 : 1.2]]) { bctx.beginPath(); bctx.ellipse(W * f, gy, 46 * sc * big, 11 * sc * big, 0, 0, 7); bctx.fill(); }
    const hDir = hero.dirF > 0 ? 7 : 3, fDir = foe.dirF > 0 ? 7 : 3;
    if (stage) {
      const hc = clipOf(hero, true), fc = clipOf(foe, false);
      stage.draw(dt, { x: hx, hop: hP.hop / 55, rot: hP.rot, sx: hP.sx, lean: hero.dirF, face: hero.dirF, ...hc, flash: Math.max(0, hero.flash) * 6 }, { x: fx, hop: fP.hop / 55, rot: fP.rot, sx: fP.sx, lean: foe.dirF, face: foe.dirF, ...fc, flash: Math.max(0, foe.flash) * 6 });
    } else {
      const hNF = HNF[hero.anim] || 4; if (hero.anim !== 'idle' && hero.anim !== 'death' && hero.at * 12 > hNF) hero.anim = 'idle';
      const hy = gy - hP.hop * sc;
      for (const g of ghosts) { g.t += 0.016 * speed; } while (ghosts.length && ghosts[0].t > 0.4) ghosts.shift();
      for (const g of ghosts) { ctx.globalAlpha = Math.max(0, 0.35 - g.t * 0.9); drawUnit(heroAtlas, g.anim, HNF[g.anim] || 4, 12, g.at, W * g.x, gy, sc * 1.25, false, g.sw > 0 ? 7 : 3, 0.4, false); } ctx.globalAlpha = 1;
      const unit = (names, clip, nf, fps, t, x, y, scl, dir, flash, loop, P, lean) => { ctx.save(); ctx.translate(x, y); ctx.rotate(P.rot * lean); ctx.scale(P.sx, 1 / Math.sqrt(P.sx)); drawUnit(names, clip, nf, fps, t, 0, 0, scl, false, dir, flash, loop); ctx.restore(); };
      unit(heroAtlas, hero.anim, hNF, hero.anim === 'idle' ? 5 : 12, hero.at + (hero.anim === 'idle' ? time : 0), W * hx, hy, sc * 1.25, hDir, hero.flash, hero.anim === 'idle', hP, sw);
      const A = getAtlas(ENEMIES[E.type].atlas);
      if (A) {
        const nf = c => (A.clips[c] || [4])[0];
        if (foe.anim !== 'idle' && foe.anim !== 'death' && foe.at * 11 > nf(foe.anim)) foe.anim = 'idle';
        unit([ENEMIES[E.type].atlas], foe.anim, nf(foe.anim), foe.anim === 'idle' ? 5 : 11, foe.at + (foe.anim === 'idle' ? time : 0), W * fx, gy - fP.hop * sc, sc * (E.type === 'boss' ? 1.0 : 1.45), fDir, foe.flash, foe.anim === 'idle', fP, -sw);
      }
    }
    // дуги ударов: по цели рисуем полумесяц или линию в стиле удара
    for (let i = slashes.length - 1; i >= 0; i--) {
      const q = slashes[i]; q.t += 0.016 * speed; if (q.t > 0.28) { slashes.splice(i, 1); continue; }
      const tx = W * (q.side === 'foe' ? fx : hx), ty = gy - 62 * sc * (stage ? 1.3 : 1), p = q.t / 0.28, dirS = q.side === 'foe' ? sw : -sw;
      ctx.save(); ctx.translate(tx, ty); ctx.globalAlpha = 1 - p; ctx.strokeStyle = q.side === 'foe' ? '#fff3c0' : '#ff9a8a'; ctx.lineWidth = 5 * (1 - p) + 1; ctx.lineCap = 'round';
      ctx.beginPath();
      if (q.k === 'thrust' || q.k === 'lunge') { ctx.moveTo(-dirS * 70 * sc, 0); ctx.lineTo(dirS * 30 * sc, 0); }
      else if (q.k === 'overhead' || q.k === 'leap') { ctx.moveTo(-dirS * 10, -90 * sc); ctx.quadraticCurveTo(dirS * 30 * sc, -10, -dirS * 5, 60 * sc); }
      else if (q.k === 'shoot') { ctx.moveTo(-dirS * 220 * sc * (1 - p), 0); ctx.lineTo(-dirS * 140 * sc * (1 - p), 0); }
      else if (q.k === 'cast') { ctx.arc(0, 0, 18 + 50 * p, 0, 7); }
      else { ctx.arc(0, 0, 70 * sc, dirS > 0 ? -2.2 : -0.9, dirS > 0 ? -0.2 : 1.2); }
      ctx.stroke(); ctx.restore();
    }
    const bw = Math.min(260, W * 0.36);
    bar(W * 0.04, 34, bw, hero.hp, hero.max, '#c8302a', 'Вы');
    bar(W * 0.96 - bw, 34, bw, foe.hp, foe.max, E.boss ? '#9a3ad8' : '#c8302a', E.name);
    // skill cooldown ring
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W * 0.04 + 18, 80, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.max(0, hero.skillT) / 6)); ctx.stroke();
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#ddd'; ctx.fillText('умение', W * 0.04 + 38, 84);
    ctx.textAlign = 'center';
    for (const n of nums) { ctx.globalAlpha = 1 - n.t; ctx.font = `bold ${n.big ? 30 : 22}px Georgia`; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; const y = Hh * n.y - n.t * 40; ctx.strokeText(n.s, W * n.x, y); ctx.fillStyle = n.c; ctx.fillText(n.s, W * n.x, y); }
    ctx.globalAlpha = 1;
    if (time < 1.0) { ctx.font = `bold ${Math.round(48 * (1.4 - time * 0.4))}px Georgia`; ctx.fillStyle = `rgba(255,220,140,${1 - time})`; ctx.fillText('БОЙ!', W / 2, Hh * 0.3); }
    if (root && root.contains(stack)) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  function end(win) {
    cancelAnimationFrame(raf); raf = 0; speedB.remove(); over = win ? 'win' : 'lose';
    const h = HW(), P = G.profile; const first = win && s >= h.top;
    if (!win) bus.emit('hwLost');   // сборка 43: задание «Испытать себя в Летописи битв»
    if (!win && s >= h.top) spendEn(h);   // новый этап: энергия уходит только за поражение
    const pct = hero.hp / hero.max; const stars = win ? (pct > 0.7 ? 3 : pct > 0.35 ? 2 : 1) : 0;
    let gold = 0, xp = 0, shards = 0;
    if (win) {
      gold = Math.round((10 + s * 4) * (first ? 2.5 : 0.25) * (1 + (stars - 1) * 0.15)); xp = Math.round((8 + s * 4) * (first ? 1.6 : 0.3));   // повторы почти не платят: деньги — из подземелий и походов, а не из фарма одного этапа
      if (E.boss && first) shards = E.type === 'boss' ? 5 : 3; else if (rand() < 0.1) shards = 1;
      P.gold += gold; gainXP(xp); if (shards) addShards(shards);
      h.stars[s] = Math.max(h.stars[s] || 0, stars); if (first) h.top = Math.min(STAGES, s + 1);
    }
    bus.emit('save');
    const ov = el('div', 'hw-result ' + (win ? 'win' : 'lose'), `<div class="hw-rt">${win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</div>${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.3}s">★</span>`).join('')}</div><div class="rw-loot"><span class="goldc">+${gold} золота</span> · <span style="color:#b8e3ff">+${xp} опыта</span>${shards ? ` · <span class="c-shard">+${shards}◆</span>` : ''}</div>` : '<p>Улучшите героя у наставника, закалите оружие у кузнеца — и возвращайтесь.</p>'}`);
    const row = el('div', 'hw-nav');
    const map = el('button', 'btn', 'Карта'); map.onclick = async () => { await maybeInterstitial('hw'); showMap(); };
    const again = el('button', 'btn', s >= h.top ? 'Ещё раз · ⚡ при поражении' : 'Повтор · 1 ⚡'); again.onclick = () => tryFight(s);
    row.append(map, again);
    if (win && s < STAGES && h.top > s) { const nx = el('button', 'btn gold', `Этап ${s + 1} ▶`); nx.onclick = () => showPrefight(s + 1); row.appendChild(nx); }
    ov.appendChild(row); root.appendChild(ov);
    const top = root.querySelector('.hw-top'); if (top) { top.remove(); const tmp = root.firstChild; header(); root.insertBefore(root.lastChild, tmp); }
  }
}
