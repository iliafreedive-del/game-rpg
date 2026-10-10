// Звуки природы (сборка 60): у каждого места свой ветер и свои птицы — лес, фьорды, пустоши, храм, пещеры.
// Деревня, звери и голоса мобов пока не включены: голоса уже есть в core/voices.js (MOB), ждут прослушивания.
// Синтез — core/voices.js; общий звук (шина «Звуки») — core/audio.js. Подключается одной строкой в main.js.
import { G, bus, inCombat } from '../game/ctx.js';
import { audioBus } from './audio.js';
import { BIRD, BUG, Bed, BEDS, makeReverb } from './voices.js';

// birds: [вид, сколько особей] — поют по очереди, every — средняя пауза, с; far: редкие дальние голоса [вид, раз в N с]
const PLACES = {
  forest: { bed: 'forest', birds: [['chaffinch', 2], ['tit', 1], ['warbler', 2], ['blackbird', 1]], every: 3.5, far: [['cuckoo', 30]] },
  fjord: { bed: 'fjord', birds: [], far: [['gull', 9], ['crow', 40]] },
  bones: { bed: 'bones', birds: [], far: [['hawk', 22], ['crow', 18], ['cicada', 8]] },
  temple: { bed: 'temple', birds: [['warbler', 1]], every: 9, far: [['crow', 16], ['hawk', 40]] },
  cave: { bed: 'cave', birds: [], far: [['drip', 1.6]], cave: true },
  survival: { bed: 'bones', birds: [], far: [['crow', 14]] },
};
const placeOf = () => {
  const z = G.zoneId;
  if (z === 'wild') return (G.wild && PLACES[G.wild.realm]) ? G.wild.realm : 'forest';
  if (z === 'depths' || z === 'catacombs' || z === 'castle') return 'cave';
  return PLACES[z] ? z : null;   // деревня — пока тишина
};
const FAR = {
  cicada: (ac, o, t, r) => BUG.cicada(ac, o, t, 0.95 + r() * 0.1, r),
  drip: (ac, o, t, r) => BUG.drip(ac, o, t, 0.75 + r() * 0.6, r),
};
// громкость дальних голосов и доля реверба
const FAR_LVL = { cuckoo: [0.32, 0.7], gull: [0.4, 0.4], crow: [0.35, 0.5], hawk: [0.35, 0.6], cicada: [0.12, 0.2], drip: [0.3, 0.8] };

// ---------- граф: природа → amb → шина «Звуки»; общий реверб для дальних ----------
let A = null, place, bed = null, singers = [], fars = [], errs = 0;
const R = Math.random;
function graph() {
  const B = audioBus(); if (!B) return null;
  if (A && A.ac === B.ac) return A;
  const ac = B.ac, amb = ac.createGain(), wetIn = ac.createGain(), wetOut = ac.createGain();
  amb.gain.value = 0.9; wetOut.gain.value = 0.5; amb.connect(B.sfx); wetOut.connect(amb);
  return A = { ac, amb, wetIn, wetOut, rev: null };
}
function setReverb(cave) {   // пещера — длинный тёмный хвост, улица — короткий
  if (A.rev) { try { A.wetIn.disconnect(); A.rev.disconnect(); } catch { } }
  A.rev = cave ? makeReverb(A.ac, 2.8, 2.2, 0.7) : makeReverb(A.ac, 1.4, 3.5, 0.4);
  A.wetIn.connect(A.rev); A.rev.connect(A.wetOut);
}
// точка звучания: громкость, панорама, посыл в реверб
function spot(gain, pan, send) {
  const ac = A.ac, g = ac.createGain(); g.gain.value = gain;
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-0.85, Math.min(0.85, pan)); g.connect(p); p.connect(A.amb); } else g.connect(A.amb);
  if (send > 0) { const s = ac.createGain(); s.gain.value = send; g.connect(s); s.connect(A.wetIn); }
  setTimeout(() => { try { g.disconnect(); } catch { } }, 8000);   // самая длинная песня — пара секунд
  return g;
}

// ---------- смена места ----------
function enter() {
  const id = placeOf(); if (id === place) return; place = id;
  if (bed) { bed.stop(1.5); bed = null; }
  singers = []; fars = [];
  const P = PLACES[id]; if (!P) return;
  const ac = A.ac;
  bed = new Bed(ac, A.amb, BEDS[P.bed], R); setReverb(!!P.cave);
  // у каждой птицы свой голос (высота) и своё место (панорама) — так стая звучит живой
  for (const [sp, n] of P.birds) for (let i = 0; i < n; i++) singers.push({ sp, k: 0.92 + R() * 0.16, pan: (R() - 0.5) * 1.6, g: 0.25 + R() * 0.25, next: ac.currentTime + 1 + R() * 6 });
  fars = P.far.map(([sp, every]) => ({ sp, every, next: ac.currentTime + every * (0.3 + R()) }));
}
bus.on('zoneEntered', () => { place = undefined; });

function tick() {
  const B = audioBus(); if (!B || !B.live || !graph() || !G.zone || !G.player) return;
  const ac = A.ac, now = ac.currentTime;
  enter(); if (!bed) return;
  bed.schedule(now + 6);
  const busy = inCombat();
  A.amb.gain.setTargetAtTime(busy ? 0.45 : 0.9, now, 0.6);   // бой: природа тише на 6 дБ, не спорит с ударами
  for (const s of singers) if (now >= s.next) {
    s.next = now + PLACES[place].every * (0.6 + R() * 1.4) * singers.length * (busy ? 2 : 1);
    BIRD[s.sp](ac, spot(s.g, s.pan, 0.25), now + 0.05, s.k, R);
  }
  for (const f of fars) if (now >= f.next) {
    f.next = now + f.every * (0.6 + R() * 0.9);
    const [g, send] = FAR_LVL[f.sp] || [0.3, 0.5], o = spot(g, (R() - 0.5) * 1.6, send);
    (FAR[f.sp] ? FAR[f.sp](ac, o, now + 0.05, R) : BIRD[f.sp](ac, o, now + 0.05, 0.95 + R() * 0.1, R));
  }
}
setInterval(() => { try { tick(); } catch (e) { if (errs++ < 3) console.warn('nature', e); } }, 250);
