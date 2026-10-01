// «Путь героя» — a flat, lazy auto-battle mini-game inside DARK ASCENT.
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

export const EN_MAX = 20, EN_MS = 6 * 60e3;
const CHAPTERS = [
  { name: 'Тропа мертвецов', sky: ['#3a4a6a', '#9a7a6a'], far: '#4a4a5a', mid: '#3a3a36', ground: ['#5a4a36', '#3a2e22'], dot: '#6a5a40', pool: ['skel_warrior', 'skel_archer', 'ghoul'] },
  { name: 'Ледяной перевал', sky: ['#5a8ac0', '#dfeaf4'], far: '#9ab0c8', mid: '#c8d8e8', ground: ['#e6eef6', '#b8c8d8'], dot: '#a8b8c8', pool: ['ghoul', 'beast', 'skel_warrior'] },
  { name: 'Пепельная долина', sky: ['#2a1010', '#a0401a'], far: '#3a1a14', mid: '#2a1410', ground: ['#3a2a24', '#1e1410'], dot: '#ff6a2a', pool: ['skel_mage', 'beast', 'skel_archer'] },
];
export const STAGES = 30;
const stageEnemy = s => {
  const ch = CHAPTERS[Math.floor((s - 1) / 10)], k = (s - 1) % 10;
  if (k === 9) return { type: 'boss', name: 'Палач Бездны', boss: true };
  if (k === 4) return { type: 'elite_guard', name: 'Страж тропы', boss: true };
  const type = ch.pool[s % ch.pool.length]; return { type, name: ENEMIES[type].name };
};
const enemyStats = s => { const e = stageEnemy(s); const m = e.boss ? (e.type === 'boss' ? 3.2 : 2.2) : 1; return { ...e, hp: Math.round(55 * Math.pow(1.17, s - 1) * m), dmg: 5.5 * Math.pow(1.14, s - 1) * (e.boss ? 1.3 : 1), aps: e.type === 'ghoul' ? 1.3 : e.boss ? 0.7 : 0.9, lvl: 1 + Math.floor(s * 0.6) }; };

// Painted parallax backdrop for each chapter (generated once per size, then only clouds/particles move).
function paintScene(ch, ci, W, H, seed0) {
  let seed = 7919 * (ci + 1); const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [far, f] = mk(), [near, n] = mk();
  const P = [
    { sky: ['#1c2440', '#5a5a78', '#d89a6a'], sun: ['#ffe2a8', 0.78, 0.22, 60], m: ['#58607a', '#434a60', '#2e3244'], mtip: null, trees: '#1c2418', ground: ['#4a5a2e', '#2c3a1a', '#1a220e'], fog: 'rgba(230,200,170,0.18)', part: { c: '#e8ff9a', n: 26, vy: -6, r: 1.8 } },
    { sky: ['#4a78b8', '#9cc4e8', '#eef6ff'], sun: ['#ffffff', 0.25, 0.2, 50], m: ['#a8bcd8', '#7890b4', '#5a6e94'], mtip: '#ffffff', trees: '#2e4a5a', ground: ['#eef4fa', '#c8d8e8', '#9ab0c8'], fog: 'rgba(255,255,255,0.22)', part: { c: '#ffffff', n: 60, vy: 28, r: 2 } },
    { sky: ['#1a0606', '#5a1a0c', '#c8501a'], sun: ['#ff7a2a', 0.7, 0.3, 80], m: ['#3a1a14', '#2a120e', '#1a0a08'], mtip: '#ff6a1a', trees: '#120605', ground: ['#3a2a24', '#241814', '#140c0a'], fog: 'rgba(255,90,30,0.15)', part: { c: '#ffa040', n: 40, vy: -18, r: 1.8 } },
  ][ci];
  // sky
  const g = f.createLinearGradient(0, 0, 0, H * 0.7); g.addColorStop(0, P.sky[0]); g.addColorStop(0.55, P.sky[1]); g.addColorStop(1, P.sky[2]); f.fillStyle = g; f.fillRect(0, 0, W, H);
  if (ci !== 1) { f.fillStyle = '#fff'; for (let k = 0; k < 70; k++) { f.globalAlpha = r() * 0.6 * (ci === 2 ? 0.3 : 1); f.fillRect(r() * W, r() * H * 0.35, 1.3, 1.3); } f.globalAlpha = 1; }
  const [sx, sy, sr] = [W * P.sun[1], H * P.sun[2], P.sun[3]];
  const sg = f.createRadialGradient(sx, sy, 0, sx, sy, sr * 4); sg.addColorStop(0, P.sun[0]); sg.addColorStop(0.18, P.sun[0] + 'cc'); sg.addColorStop(1, 'rgba(0,0,0,0)'); f.fillStyle = sg; f.fillRect(0, 0, W, H);
  f.fillStyle = P.sun[0]; f.beginPath(); f.arc(sx, sy, sr * 0.55, 0, 7); f.fill();
  // mountain ranges (3 layers, atmospheric perspective)
  const range = (ctx, base, amp, step, col, tip) => {
    const pts = []; for (let x = -step; x <= W + step; x += step * (0.6 + r() * 0.8)) pts.push([x, base - amp * (0.35 + r() * 0.65)]);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(W, H); ctx.fill();
    if (tip) { ctx.fillStyle = tip; for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]; if (y < base - amp * 0.7) { ctx.globalAlpha = ci === 2 ? 0.55 : 0.9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - amp * 0.12, y + amp * 0.16); ctx.lineTo(x - amp * 0.03, y + amp * 0.12); ctx.lineTo(x + amp * 0.05, y + amp * 0.18); ctx.lineTo(x + amp * 0.12, y + amp * 0.14); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; } } }
  };
  range(f, H * 0.52, H * 0.34, 90, P.m[0], P.mtip);
  f.fillStyle = P.fog; f.fillRect(0, H * 0.3, W, H * 0.3);
  range(f, H * 0.58, H * 0.24, 70, P.m[1], P.mtip);
  range(f, H * 0.64, H * 0.14, 50, P.m[2], null);
  // tree line
  f.fillStyle = P.trees;
  for (let x = -10; x < W + 10; x += 9 + r() * 14) {
    const h = H * (0.05 + r() * 0.07), y = H * 0.635 + r() * 6;
    if (ci === 2) { f.fillRect(x, y - h, 2, h); f.beginPath(); f.moveTo(x, y - h * 0.7); f.lineTo(x + 7, y - h); f.lineTo(x + 1, y - h * 0.6); f.fill(); }
    else { f.beginPath(); f.moveTo(x, y - h); f.lineTo(x - h * 0.28, y); f.lineTo(x + h * 0.28, y); f.fill(); }
  }
  // ground
  const gg = n.createLinearGradient(0, H * 0.62, 0, H); gg.addColorStop(0, P.ground[0]); gg.addColorStop(0.5, P.ground[1]); gg.addColorStop(1, P.ground[2]);
  n.fillStyle = gg; n.beginPath(); n.moveTo(0, H * 0.66); for (let x = 0; x <= W; x += 40) n.lineTo(x, H * (0.645 + Math.sin(x * 0.01 + ci) * 0.012)); n.lineTo(W, H); n.lineTo(0, H); n.fill();
  // path & ground details
  n.fillStyle = 'rgba(0,0,0,0.12)'; n.beginPath(); n.ellipse(W / 2, H * 0.83, W * 0.55, H * 0.07, 0, 0, 7); n.fill();
  for (let k = 0; k < 90; k++) { const x = r() * W, y = H * (0.67 + r() * 0.32); n.globalAlpha = 0.35; n.fillStyle = r() < 0.5 ? P.ground[2] : '#ffffff22'; n.beginPath(); n.ellipse(x, y, 3 + r() * 10, 1 + r() * 3, 0, 0, 7); n.fill(); }
  n.globalAlpha = 1;
  if (ci === 0) for (let k = 0; k < 60; k++) { const x = r() * W, y = H * (0.68 + r() * 0.3); n.strokeStyle = '#6a8a3a'; n.lineWidth = 1.2; n.beginPath(); n.moveTo(x, y); n.lineTo(x - 2, y - 6 - r() * 5); n.moveTo(x, y); n.lineTo(x + 3, y - 5 - r() * 5); n.stroke(); }
  if (ci === 2) for (let k = 0; k < 14; k++) { const x = r() * W, y = H * (0.7 + r() * 0.28); n.strokeStyle = 'rgba(255,110,30,0.8)'; n.lineWidth = 1.5; n.shadowColor = '#ff6a1a'; n.shadowBlur = 8; n.beginPath(); n.moveTo(x, y); for (let q = 0; q < 4; q++) n.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 12); n.stroke(); n.shadowBlur = 0; }
  // foreground rocks / bushes framing the stage
  const blob = (x, y, w, h, c) => { n.fillStyle = c; n.beginPath(); n.ellipse(x, y, w, h, 0, Math.PI, 0); n.fill(); };
  const fg = ci === 1 ? '#8aa0b8' : ci === 2 ? '#0c0605' : '#141c0e';
  blob(-20, H + 10, W * 0.16, H * 0.2, fg); blob(W + 20, H + 10, W * 0.18, H * 0.22, fg); blob(W * 0.12, H + 30, W * 0.08, H * 0.12, fg);
  if (ci === 1) { n.fillStyle = '#ffffff'; blob(-20, H + 12, W * 0.15, H * 0.17, '#f4f8fc'); blob(W + 20, H + 12, W * 0.17, H * 0.19, '#f4f8fc'); }
  // vignette
  const vg = n.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); n.fillStyle = vg; n.fillRect(0, 0, W, H);
  // cloud sprite
  const [cl, c] = [document.createElement('canvas'), null]; cl.width = 256; cl.height = 100; const cx = cl.getContext('2d');
  for (let k = 0; k < 7; k++) { const gx = cx.createRadialGradient(40 + k * 28, 55 - (k % 3) * 10, 0, 40 + k * 28, 55 - (k % 3) * 10, 38); gx.addColorStop(0, ci === 2 ? 'rgba(70,40,30,0.9)' : 'rgba(255,255,255,0.9)'); gx.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gx; cx.fillRect(0, 0, 256, 100); }
  const clouds = Array.from({ length: 5 }, () => ({ x: r() * W, y: H * (0.04 + r() * 0.22), w: 160 + r() * 220, v: 6 + r() * 12, a: ci === 2 ? 0.5 : 0.55 + r() * 0.3 }));
  const parts = Array.from({ length: P.part.n }, () => ({ x: r() * W, y: r() * H, vy: P.part.vy * (0.6 + r() * 0.8), r: P.part.r * (0.6 + r() * 0.8), c: P.part.c, a: 0.5 + r() * 0.5, f: 1 + r() * 2, o: r() * 6 }));
  return { far, near, cloud: cl, clouds, parts };
}
function HW() { const P = G.profile; P.hw = P.hw || { top: 1, stars: {}, en: { n: EN_MAX, at: Date.now() } }; const e = P.hw.en; const now = Date.now(); if (e.n < EN_MAX) { const k = Math.floor((now - e.at) / EN_MS); if (k > 0) { e.n = Math.min(EN_MAX, e.n + k); e.at = e.n >= EN_MAX ? now : e.at + k * EN_MS; } } else e.at = now; return P.hw; }
export const hwReady = () => { const h = HW(); return h.en.n >= 5; };

let root = null, page = 0, raf = 0;
export function openHeroPath() {
  if (root) return; HW(); G.paused = true; G.modalOpen = true; bus.emit('audioPause', false);
  root = el('div', 'hw-root'); document.body.appendChild(root);
  page = Math.min(2, Math.floor((HW().top - 1) / 10));
  showMap();
}
function close() { cancelAnimationFrame(raf); raf = 0; if (root) root.remove(); root = null; G.paused = false; G.modalOpen = false; bus.emit('hud'); bus.emit('save'); }

function header(title) {
  const h = HW(); const left = h.en.n >= EN_MAX ? 0 : Math.max(0, h.en.at + EN_MS - Date.now());
  const bar = el('div', 'hw-top', `<span class="hw-cur">⚡ ${h.en.n}/${EN_MAX}${left ? ` <small>+1 через ${Math.ceil(left / 60000)} мин</small>` : ''}</span><span class="hw-cur c-gold">${fmt(G.profile.gold)} зол.</span><span class="hw-cur c-shard">${G.profile.shards || 0}◆</span>`);
  const x = el('button', 'hw-back', '← В деревню'); x.onclick = close; bar.prepend(x);
  root.appendChild(bar);
  if (title) root.appendChild(el('div', 'hw-title', title));
}
function showMap() {
  cancelAnimationFrame(raf); root.innerHTML = ''; header();
  const h = HW(), ch = CHAPTERS[page];
  const card = el('div', 'hw-map', `<div class="hw-banner">Путь героя · ${esc(ch.name)}</div><div class="hw-sub">Бой идёт сам. Ваш герой, его вещи, закалка и улучшения — те же, что в подземелье.</div>`);
  const grid = el('div', 'hw-grid');
  for (let i = 1; i <= 10; i++) {
    const s = page * 10 + i, st = h.stars[s] || 0, locked = s > h.top, E = stageEnemy(s);
    const b = el('button', 'hw-stage' + (locked ? ' locked' : '') + (E.boss ? ' boss' : '') + (s === h.top ? ' cur' : ''), `<div class="hw-stars">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}</div><div class="hw-num">${locked ? '🔒' : s}</div>${E.boss ? '<div class="hw-tag">босс</div>' : ''}`);
    b.onclick = () => { if (!locked) showPrefight(s); };
    grid.appendChild(b);
  }
  card.appendChild(grid);
  const nav = el('div', 'hw-nav');
  const pv = el('button', 'btn', '◀'); pv.disabled = page === 0; pv.onclick = () => { page--; showMap(); };
  const nx = el('button', 'btn', '▶'); nx.disabled = page === 2 || h.top <= (page + 1) * 10; nx.onclick = () => { page++; showMap(); };
  const ad = adButton('+10 ⚡', 'hw_en', 30 * 60e3, () => { h.en.n = Math.min(EN_MAX + 10, h.en.n + 10); }, showMap);
  nav.append(pv, el('span', 'hw-page', `Глава ${page + 1}/3`), nx); card.appendChild(nav);
  if (h.top >= page * 10 + 1 && h.top <= page * 10 + 10) { const go = el('button', 'btn gold hw-go', `⚔ В бой · этап ${h.top}`); go.onclick = () => showPrefight(h.top); card.appendChild(go); }
  const adr = el('div', 'hw-nav'); adr.appendChild(ad); card.appendChild(adr);
  root.appendChild(card);
}
function heroSummary() {
  const S = G.stats; return { hp: S.maxHP, dmg: (S.dmgMin + S.dmgMax) / 2 * (S.ranged ? 1 : 1), aps: Math.min(2.2, S.aps), crit: S.critChance, critMult: S.critMult, armor: S.armor, spell: S.spellPower };
}
function showPrefight(s) {
  root.innerHTML = ''; header();
  const E = enemyStats(s), H = heroSummary(); const h = HW();
  const power = Math.round(H.dmg * H.aps * 10 + H.hp), foe = Math.round(E.dmg * E.aps * 10 + E.hp);
  const card = el('div', 'hw-map hw-pre', `<div class="hw-banner">Этап ${s}${E.boss ? ' · босс' : ''}</div>
    <div class="hw-vs"><div><b>Вы</b><span>Сила ${fmt(power)}</span><span>♥ ${fmt(H.hp)} · ⚔ ${Math.round(H.dmg)}</span></div><div class="hw-vsx">VS</div><div><b>${esc(E.name)}</b><span>Сила ${fmt(foe)}</span><span>♥ ${fmt(E.hp)} · ⚔ ${Math.round(E.dmg)}</span></div></div>
    <p class="${power >= foe ? 'good' : 'bad'}" style="text-align:center">${power >= foe * 1.3 ? 'Лёгкий бой' : power >= foe ? 'Равный бой' : 'Враг сильнее — улучшите героя у наставника или кузнеца'}</p>`);
  const row = el('div', 'hw-nav');
  const back = el('button', 'btn', 'К карте'); back.onclick = showMap;
  const go = el('button', 'btn gold', 'В бой · 1 ⚡'); go.disabled = h.en.n <= 0;
  go.onclick = () => { if (h.en.n <= 0) return; if (h.en.n >= EN_MAX) h.en.at = Date.now(); h.en.n--; fight(s); };
  row.append(back, go); if (h.en.n <= 3) row.appendChild(adButton('+10 ⚡', 'hw_en', 30 * 60e3, () => { h.en.n = Math.min(EN_MAX + 10, h.en.n + 10); }, () => showPrefight(s))); card.appendChild(row); root.appendChild(card);
}

// ------------------------------------------------------------------ battle
function fight(s) {
  root.innerHTML = ''; header();
  const cv = document.createElement('canvas'); cv.className = 'hw-canvas'; root.appendChild(cv);
  const ctx = cv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
  const resize = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; };
  resize();
  let speed = G.profile.hwSpeed === 2 ? 2 : 1; const speedB = el('button', 'hw-speed', '×' + speed); speedB.onclick = () => { speed = speed === 1 ? 2 : 1; G.profile.hwSpeed = speed; speedB.textContent = '×' + speed; }; root.appendChild(speedB);
  const ch = CHAPTERS[Math.floor((s - 1) / 10)];
  const H = heroSummary(), E = enemyStats(s);
  const hero = { hp: H.hp, max: H.hp, t: 0.6, anim: 'idle', at: 0, flash: 0, x: 0, skillT: 3.5 };
  const foe = { hp: E.hp, max: E.hp, t: 1.1, anim: 'idle', at: 0, flash: 0, x: 0, dead: 0 };
  const nums = []; let time = 0, over = null, last = performance.now();
  const cls = G.profile.cls || 'warrior', wt = G.profile.gear.weapon ? G.profile.gear.weapon.wt : 'sword';
  const heroAtlas = cls !== 'warrior' && getAtlas(`hero_${cls}_body`) ? [`hero_${cls}_body`, `hero_${cls}_${cls === 'archer' ? 'bow' : 'staff'}`] : ['hero_body', 'hero_' + wt].concat(wt === 'sword' || wt === 'axe' ? ['hero_shield'] : []);
  const heroClip = wt === 'bow' ? 'bowrel' : wt === 'staff' ? 'cast' : wt === 'greatsword' ? 'chop2' : 'slash1';
  const HNF = { idle: 4, slash1: 7, chop2: 9, bowrel: 3, cast: 6, hit: 3, death: 8 };
  const redu = H.armor / (H.armor + 50 + 10 * E.lvl);
  const hitFoe = (mul, label) => {
    let d = H.dmg * mul * rrange(0.85, 1.15), crit = rand() < H.crit; if (crit) d *= H.critMult; d = Math.round(d);
    foe.hp -= d; foe.flash = 0.15; foe.anim = 'hit'; foe.at = 0;
    nums.push({ x: 0.66, y: 0.42, t: 0, s: crit ? `${d}!` : String(d), c: label ? '#ffb86a' : crit ? '#ffd24a' : '#fff', big: crit || label });
    if (label) nums.push({ x: 0.5, y: 0.25, t: 0, s: label, c: '#9fe38e', big: 1 });
    bus.emit('sfx', crit ? 'heavy' : 'hit');
  };
  const skillName = { warrior: 'Сокрушение!', archer: 'Залп!', mage: 'Огненный шар!' }[cls];
  function step(dt) {
    if (over) return;
    time += dt; hero.at += dt; foe.at += dt; hero.flash -= dt; foe.flash -= dt;
    hero.t -= dt; foe.t -= dt; hero.skillT -= dt;
    if (hero.t <= 0) { hero.t = 1 / H.aps; hero.anim = heroClip; hero.at = 0; setTimeout(() => !over && hitFoe(1), 180 / speed); }
    if (hero.skillT <= 0) { hero.skillT = 6; hero.anim = heroClip; hero.at = 0; setTimeout(() => { if (over) return; if (cls === 'archer') { hitFoe(0.7, skillName); setTimeout(() => !over && hitFoe(0.7), 120 / speed); setTimeout(() => !over && hitFoe(0.7), 240 / speed); } else hitFoe(cls === 'mage' ? 2.4 * H.spell / 1.2 : 2.5, skillName); }, 220 / speed); }
    if (foe.t <= 0 && foe.hp > 0) { foe.t = 1 / E.aps; foe.anim = 'attack'; foe.at = 0; setTimeout(() => { if (over || foe.hp <= 0) return; const d = Math.round(E.dmg * rrange(0.85, 1.15) * (1 - redu)); hero.hp -= d; hero.flash = 0.15; nums.push({ x: 0.34, y: 0.42, t: 0, s: '-' + d, c: '#ff6a5a' }); bus.emit('sfx', 'hurt'); }, 300 / speed); }
    if (foe.hp <= 0 && !foe.dead) { foe.dead = 1; foe.anim = 'death'; foe.at = 0; bus.emit('sfx', 'bones'); setTimeout(() => end(true), 1100 / speed); over = 'win-pending'; }
    else if (hero.hp <= 0) { hero.anim = 'death'; hero.at = 0; over = 'lose-pending'; setTimeout(() => end(false), 1100 / speed); }
    for (const n of nums) n.t += dt; while (nums.length && nums[0].t > 1) nums.shift();
  }
  let bgCache = null, bgKey = '';
  function drawBg(W, Hh) {
    const key = W + 'x' + Hh; if (key !== bgKey) { bgKey = key; bgCache = paintScene(ch, Math.floor((s - 1) / 10), W, Hh, s); }
    ctx.drawImage(bgCache.far, 0, 0, W, Hh);
    // drifting clouds
    for (const c of bgCache.clouds) { const x = ((c.x + time * c.v) % (W + 400)) - 200; ctx.globalAlpha = c.a; ctx.drawImage(bgCache.cloud, x, c.y, c.w, c.w * 0.4); } ctx.globalAlpha = 1;
    ctx.drawImage(bgCache.near, 0, 0, W, Hh);
    // ambient particles: fireflies / snow / embers
    const P = bgCache.parts; for (const p of P) { p.y += p.vy * 0.016 * speed; p.x += Math.sin(time * p.f + p.o) * 0.3; if (p.y > Hh) p.y = -5; if (p.y < -5) p.y = Hh; ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(time * 3 + p.o)); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
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
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now;
    if (cv.clientWidth * dpr !== cv.width) resize();
    step(dt);
    const W = cv.width / dpr, Hh = cv.height / dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBg(W, Hh);
    const gy = Hh * 0.8, sc = Math.min(1.3, Hh / 330) * 1.0;
    // shadows
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (const px of [W * 0.34, W * 0.66]) { ctx.beginPath(); ctx.ellipse(px, gy, 44 * sc, 12 * sc, 0, 0, 7); ctx.fill(); }
    const hNF = HNF[hero.anim] || 4; if (hero.anim !== 'idle' && hero.anim !== 'death' && hero.at * 12 > hNF) hero.anim = 'idle';
    const lunge = hero.anim !== 'idle' && hero.anim !== 'death' && heroClip !== 'bowrel' && heroClip !== 'cast' ? Math.sin(Math.min(1, hero.at * 3) * Math.PI) * 30 : 0;
    drawUnit(heroAtlas, hero.anim, hNF, hero.anim === 'idle' ? 5 : 12, hero.at + (hero.anim === 'idle' ? time : 0), W * 0.34 + lunge, gy, sc * 1.25, false, 7, hero.flash, hero.anim === 'idle');
    const A = getAtlas(ENEMIES[E.type].atlas);
    if (A) {
      const nf = c => (A.clips[c] || [4])[0];
      if (foe.anim !== 'idle' && foe.anim !== 'death' && foe.at * 11 > nf(foe.anim)) foe.anim = 'idle';
      const fl = foe.anim === 'attack' ? Math.sin(Math.min(1, foe.at * 2.5) * Math.PI) * -26 : 0;
      drawUnit([ENEMIES[E.type].atlas], foe.anim, nf(foe.anim), foe.anim === 'idle' ? 5 : 11, foe.at + (foe.anim === 'idle' ? time : 0), W * 0.66 + fl, gy, sc * (E.type === 'boss' ? 1.0 : 1.45), false, 3, foe.flash, foe.anim === 'idle');
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
    if (root && root.contains(cv)) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  function end(win) {
    cancelAnimationFrame(raf); raf = 0; speedB.remove(); over = win ? 'win' : 'lose';
    const h = HW(), P = G.profile; const first = win && s >= h.top;
    const pct = hero.hp / hero.max; const stars = win ? (pct > 0.7 ? 3 : pct > 0.35 ? 2 : 1) : 0;
    let gold = 0, xp = 0, shards = 0;
    if (win) {
      gold = Math.round((15 + s * 8) * (first ? 3 : 1) * (1 + (stars - 1) * 0.2)); xp = Math.round((10 + s * 6) * (first ? 2 : 1));
      if (E.boss && first) shards = E.type === 'boss' ? 5 : 3; else if (rand() < 0.1) shards = 1;
      P.gold += gold; gainXP(xp); if (shards) addShards(shards);
      h.stars[s] = Math.max(h.stars[s] || 0, stars); if (first) h.top = Math.min(STAGES, s + 1);
    }
    bus.emit('save');
    const ov = el('div', 'hw-result ' + (win ? 'win' : 'lose'), `<div class="hw-rt">${win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</div>${win ? `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.3}s">★</span>`).join('')}</div><div class="rw-loot"><span class="goldc">+${gold} золота</span> · <span style="color:#b8e3ff">+${xp} опыта</span>${shards ? ` · <span class="c-shard">+${shards}◆</span>` : ''}</div>` : '<p>Улучшите героя у наставника, закалите оружие у кузнеца — и возвращайтесь.</p>'}`);
    const row = el('div', 'hw-nav');
    const map = el('button', 'btn', 'Карта'); map.onclick = async () => { await maybeInterstitial('hw'); showMap(); };
    const again = el('button', 'btn', 'Повтор · 1 ⚡'); again.onclick = () => { if (h.en.n <= 0) return; if (h.en.n >= EN_MAX) h.en.at = Date.now(); h.en.n--; fight(s); };
    row.append(map, again);
    if (win && s < STAGES && h.top > s) { const nx = el('button', 'btn gold', `Этап ${s + 1} ▶`); nx.onclick = () => showPrefight(s + 1); row.appendChild(nx); }
    ov.appendChild(row); root.appendChild(ov);
    const top = root.querySelector('.hw-top'); if (top) { top.remove(); const tmp = root.firstChild; header(); root.insertBefore(root.lastChild, tmp); }
  }
}
