// Звуки природы и голоса мобов (сборка 60): у каждого места свой ветер и свои птицы, звери и мобы ворчат, рычат,
// замечая героя, и кричат при смерти. Звучит из точки: тише вдали, слева/справа по экрану, дальние — гулче (реверб).
// Синтез голосов — core/voices.js; общий звук (шина «Звуки») — core/audio.js. Подключается одной строкой в main.js.
import { G, bus, inCombat } from '../game/ctx.js';
import { audioBus } from './audio.js';
import { MOB, BIRD, BUG, Bed, BEDS, makeReverb } from './voices.js';

// ---------- кто каким голосом ----------
const VOICE = {
  ghoul: 'ghoul', beast: 'beast', boss: 'boss', bone_wolf: 'wolf',
  w_boar: 'boar', w_wolf: 'wolf', w_poacher: 'human', w_leshy: 'leshy', w_bear: 'bear', w_ataman: 'human', w_boss: 'giant',
  f_draugr: 'draugr', f_wolf: 'wolf', f_berserk: 'berserk', f_hag: 'hag', f_jotun: 'giant', f_jarl: 'berserk', f_boss: 'giant',
  b_raider: 'human', b_thrower: 'human', b_hyena: 'hyena', b_boar: 'boar', b_shaman: 'hag', b_scorpid: 'scorpion', b_chief: 'berserk', b_boss: 'boss',
  t_hound: 'wolf', t_boar: 'boar', t_lion: 'lion', t_stag: 'stag', t_priest: 'spirit', t_golem: 'giant', t_mb_relic: 'lion', t_mb_paladin: 'stag',
};
const FROM = { beast: 'beast', ghoul: 'ghoul', boss: 'boss', elite: 'skeleton', skel_warrior: 'skeleton', skel_archer: 'skeleton', skel_mage: 'skeleton' };
function voiceOf(e) {
  if (e._voice !== undefined) return e._voice;
  const D = e.D || {}, k = e.type;
  let v = VOICE[k] || (D.realm === 'temple' ? 'stone' : null) || (D.skeleton ? 'skeleton' : null) || FROM[D.from] || FROM[k] || (D.boss ? 'boss' : null);
  if (D.realm === 'temple' && v && v !== 'stone' && /^t_/.test(k)) e._stone = true;   // каменный зверь: голос ниже + скрежет
  const size = D.size || 1;
  e._pitch = Math.pow(1 / size, 0.5) * (e._stone ? 0.8 : 1) * (D.boss ? 0.85 : D.elite ? 0.92 : 1) * (0.94 + Math.random() * 0.12);
  return e._voice = v || null;
}

// ---------- места: ветер, птицы, насекомые ----------
// birds: [вид, сколько особей]; far: редкие дальние голоса (кукушка, вой); every — средняя пауза, с
const PLACES = {
  town: { bed: 'town', birds: [['sparrow', 3], ['tit', 1], ['blackbird', 1]], every: 5, far: [['crow', 25]] },
  forest: { bed: 'forest', birds: [['chaffinch', 2], ['tit', 1], ['warbler', 2], ['blackbird', 1]], every: 3.5, far: [['cuckoo', 30], ['wolfhowl', 45]] },
  fjord: { bed: 'fjord', birds: [], every: 0, far: [['gull', 9], ['crow', 40]] },
  bones: { bed: 'bones', birds: [], every: 0, far: [['hawk', 22], ['crow', 18], ['cicada', 8], ['hyenaFar', 40]] },
  temple: { bed: 'temple', birds: [['warbler', 1]], every: 9, far: [['crow', 16], ['hawk', 40]] },
  cave: { bed: 'cave', birds: [], every: 0, far: [['drip', 1.6], ['moan', 35]], cave: true },
  survival: { bed: 'bones', birds: [], every: 0, far: [['crow', 14]] },
};
const placeOf = () => {
  const z = G.zoneId;
  if (z === 'wild') return (G.wild && PLACES[G.wild.realm]) ? G.wild.realm : 'forest';
  if (z === 'depths' || z === 'catacombs' || z === 'castle') return 'cave';
  return PLACES[z] ? z : 'town';
};
const FAR = {
  wolfhowl: (ac, o, t, r) => MOB.wolf.idle(ac, o, t, 0.95 + r() * 0.1, r),
  hyenaFar: (ac, o, t, r) => MOB.hyena.idle(ac, o, t, 1, r),
  moan: (ac, o, t, r) => MOB.draugr.idle(ac, o, t, 0.9, r),
  cicada: (ac, o, t, r) => BUG.cicada(ac, o, t, 0.95 + r() * 0.1, r),
  drip: (ac, o, t, r) => BUG.drip(ac, o, t, 0.75 + r() * 0.6, r),
};
// громкость дальних голосов и доля реверба
const FAR_LVL = { cuckoo: [0.32, 0.7], wolfhowl: [0.2, 0.9], gull: [0.4, 0.4], crow: [0.35, 0.5], hawk: [0.35, 0.6], cicada: [0.12, 0.2], hyenaFar: [0.18, 0.85], drip: [0.3, 0.8], moan: [0.22, 0.9] };

// ---------- граф: природа → amb, голоса → mob, оба на шину «Звуки»; общий реверб ----------
let A = null, place = null, bed = null, singers = [], fars = [], nextMob = 0, lastAlert = 0, voicesLive = 0, tickT = 0;
const R = Math.random;
function graph() {
  const B = audioBus(); if (!B) return null;
  if (A && A.ac === B.ac) return A;
  const ac = B.ac, amb = ac.createGain(), mob = ac.createGain(), wetIn = ac.createGain(), wetOut = ac.createGain();
  amb.gain.value = 0.9; mob.gain.value = 0.85; wetOut.gain.value = 0.5;
  amb.connect(B.sfx); mob.connect(B.sfx); wetOut.connect(B.sfx);
  return A = { ac, amb, mob, wetIn, wetOut, rev: null };
}
function setReverb(cave) {   // пещера — длинный тёмный хвост, улица — короткий
  const ac = A.ac; if (A.rev) { try { A.wetIn.disconnect(); A.rev.disconnect(); } catch { } }
  A.rev = cave ? makeReverb(ac, 2.8, 2.2, 0.7) : makeReverb(ac, 1.4, 3.5, 0.4);
  A.wetIn.connect(A.rev); A.rev.connect(A.wetOut);
}
// точка звучания: громкость, панорама, посыл в реверб
function spot(dest, gain, pan, send) {
  const ac = A.ac, g = ac.createGain(); g.gain.value = gain;
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-0.85, Math.min(0.85, pan)); g.connect(p); p.connect(dest); } else g.connect(dest);
  if (send > 0) { const s = ac.createGain(); s.gain.value = send; g.connect(s); s.connect(A.wetIn); }
  setTimeout(() => { try { g.disconnect(); } catch { } }, 6000);   // голоса не длиннее пары секунд
  return g;
}
// мировая точка → громкость и панорама относительно героя/экрана
const HEAR = 18;
function at(x, y) {
  const P = G.player; if (!P) return null;
  const d = Math.hypot(x - P.x, y - P.y); if (d > HEAR) return null;
  let pan = 0; try { const [sx] = G.cam.toScreen(x, y); pan = (sx / (G.cam.w || innerWidth) - 0.5) * 1.6; } catch { }
  const k = 1 - d / HEAR; return { gain: 0.15 + 0.85 * k * k, pan, send: 0.12 + 0.55 * (1 - k) };
}

// ---------- голоса мобов ----------
function say(e, kind, boost = 1) {
  const v = voiceOf(e); if (!v || !MOB[v] || !MOB[v][kind]) return false;
  if (voicesLive >= 3) return false;   // не больше трёх голосов разом, иначе каша
  const s = at(e.x, e.y); if (!s) return false;
  const ac = A.ac, o = spot(A.mob, s.gain * boost, s.pan, s.send), t = ac.currentTime + 0.02;
  let d = 1; try { d = MOB[v][kind](ac, o, t, e._pitch, R) || 1; if (e._stone && v !== 'stone') MOB.stone.idle(ac, o, t, 1, R); } catch { return false; }
  voicesLive++; setTimeout(() => voicesLive--, d * 1000);
  return true;
}
bus.on('aggro', e => {   // заметил героя; стая — не хором, один-два голоса
  if (!live() || !e || e.dead) return;
  const now = performance.now(); if (now - lastAlert < 450) return;
  if (say(e, 'alert', 1.1)) { lastAlert = now; e._said = G.time; }
});
bus.on('kill', e => { if (live() && e) say(e, 'death', 1); });

// ---------- живность деревни ----------
function critters(ac) {
  const list = (G.zone && G.zone.json && G.zone.json.critters) || [];
  for (const c of list) {
    if (c._next === undefined) c._next = ac.currentTime + 2 + R() * 10;
    if (ac.currentTime < c._next) continue;
    const P = G.player, near = P && Math.hypot(c.x - P.x, c.y - P.y) < 5;
    c._next = ac.currentTime + (c.k === 'dog' ? (near ? 5 : 14) : 7) + R() * (c.k === 'dog' ? 14 : 12);
    const s = at(c.x, c.y); if (!s) continue;
    const v = c.k === 'dog' ? MOB.dog : c.k === 'chicken' ? MOB.chicken : null; if (!v) continue;
    v.idle(ac, spot(A.amb, s.gain * 0.7, s.pan, s.send), ac.currentTime + 0.02, c.k === 'dog' ? (c.coat ? 1.05 : 0.85) : 0.95 + R() * 0.1, R);
  }
}

// ---------- смена места ----------
function enter() {
  const ac = A.ac, id = placeOf(); if (id === place) return; place = id;
  const P = PLACES[id];
  if (bed) bed.stop(1.5);
  bed = new Bed(ac, A.amb, BEDS[P.bed], R);
  setReverb(!!P.cave);
  // у каждой птицы свой голос (высота) и своё место (панорама) — так стая звучит живой
  singers = []; for (const [sp, n] of P.birds) for (let i = 0; i < n; i++) singers.push({ sp, k: 0.92 + R() * 0.16, pan: (R() - 0.5) * 1.6, g: 0.25 + R() * 0.25, next: ac.currentTime + 1 + R() * 6 });
  fars = P.far.map(([sp, every]) => ({ sp, every, next: ac.currentTime + every * (0.3 + R()) }));
  for (const c of (G.zone && G.zone.json && G.zone.json.critters) || []) delete c._next;
}
bus.on('zoneEntered', () => { place = null; });

const live = () => { const B = audioBus(); return !!(B && B.live && graph()); };
function tick() {
  if (!live()) return;
  const ac = A.ac, now = ac.currentTime;
  if (!G.zone || !G.player) return;
  enter();
  bed.schedule(now + 6);
  // бой: природа тише на 6 дБ, чтобы не спорить с ударами (ducking)
  A.amb.gain.setTargetAtTime(inCombat() ? 0.45 : 0.9, now, 0.6);
  const busy = inCombat();
  for (const s of singers) if (now >= s.next) {
    s.next = now + PLACES[place].every * (0.6 + R() * 1.4) * singers.length * (busy ? 2 : 1);
    BIRD[s.sp](ac, spot(A.amb, s.g, s.pan, 0.25), now + 0.05, s.k, R);
  }
  for (const f of fars) if (now >= f.next) {
    f.next = now + f.every * (0.6 + R() * 0.9);
    const [g, send] = FAR_LVL[f.sp] || [0.3, 0.5], o = spot(A.amb, g, (R() - 0.5) * 1.6, send);
    (FAR[f.sp] ? FAR[f.sp](ac, o, now + 0.05, R) : BIRD[f.sp](ac, o, now + 0.05, 0.95 + R() * 0.1, R));
  }
  if (place === 'town') critters(ac);
  // бродячие мобы рядом изредка подают голос; в бою — рычат, но реже
  if (now >= nextMob) {
    nextMob = now + 2.5 + R() * 4;
    const P = G.player, near = G.enemies.filter(e => !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < HEAR - 2 && voiceOf(e));
    if (near.length) {
      const e = near[Math.floor(R() * near.length)];
      if (!e.aggro) say(e, 'idle', 0.8);
      else if (G.time - (e._said || -99) > 6 && R() < 0.5) { if (say(e, 'alert', 0.8)) e._said = G.time; }
    }
  }
}
setInterval(() => { try { tick(); } catch (e) { if (tickT++ < 3) console.warn('nature', e); } }, 250);
