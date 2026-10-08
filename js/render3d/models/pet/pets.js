// Питомцы каравана (сборка 58, js/data/pets.js): восемь маленьких процедурных моделей на своих простых ригах.
// Вперёд — +Z. Летуны (ворон, огонёк, череп, мышь) висят в воздухе сами (тело поднято в модели, качается).
// Клипы: idle / walk / attack (укус или выстрел, hit 0.5) / hit / death / cast. Рост — с крупную кошку: сверху камеры их видно.
const CLIPS = { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.5, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1 }, cast: { dur: 0.5, fire: 0.5 } };

function base(kit, o = {}) {
  const { THREE, merge, group } = kit;
  const mat = kit.mat({ rim: o.rim ?? 0.6, rimColor: o.rimColor ?? 0xffe2b8 });
  const root = new THREE.Group(), body = group([0, 0, 0], root);
  const M = (parent, list, p = [0, 0, 0]) => { const g = group(p, parent); g.add(new THREE.Mesh(merge(list), mat)); return g; };
  return { THREE, mat, root, body, M };
}
const bite = k => Math.sin(Math.min(1, Math.max(0, k ?? 0)) * Math.PI);   // 0 → 1 (миг удара) → 0
function done(b, bones, anims, o = {}) {
  return { root: b.root, height: o.height ?? 0.7, radius: o.radius ?? 0.25, shadow: o.shadow ?? 0.7, materials: [b.mat], sockets: {}, bones, clips: CLIPS,
    anims: { idle: a => anims(a, 0, 0), walk: a => anims(a, Math.max(1, a.speed || 2), 0), attack: a => anims(a, 0, bite(a.k)), cast: a => anims(a, 0, bite(a.k)), hit: a => anims(a, 0, 0), death: a => anims(a, 0, 0, 1) } };
}
// шесть или четыре ножки-трубки, шагают диагональными парами
function legs(kit, b, parent, spots, len, color, top, drop) {
  return spots.map(([x, y, z], i) => { const sx = Math.sign(x); const g = b.M(parent, [kit.tube([[0, 0, 0], [sx * len * 0.55, len * 0.25, 0], [sx * len, -(drop ?? y) + 0.02, 0]], 0.025, 0.014, color, { top }, 5)], [x, y, z]); g.ph = i % 2; return g; });
}
const stepLegs = (L, a, sp) => { for (const g of L) g.rotation.y = Math.sin(a.t * 14 + g.ph * Math.PI) * 0.45 * (sp ? 1 : 0); };

// 2. Огненный фенек: рыжий лисёнок с огромными ушами, хвост горит
function fennec(kit) {
  const b = base(kit, { rimColor: 0xffc080 }), { THREE } = b, { part, ball } = kit;
  const tor = b.M(b.body, [part(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8), 0xd8782a, [0, 0, 0], [Math.PI / 2, 0, 0], 1, { top: 0xf0a860, tex: 'fur' }), ball(0.09, 0xf6e6c8, [0, -0.03, 0.12], [0.9, 0.8, 0.9])], [0, 0.3, 0]);
  const head = b.M(tor, [ball(0.1, 0xd8782a, [0, 0, 0], [1, 0.95, 1], { top: 0xf0a860, tex: 'fur' }), part(new THREE.ConeGeometry(0.055, 0.13, 6), 0xf6e6c8, [0, -0.03, 0.1], [Math.PI / 2, 0, 0]), ball(0.018, 0x101010, [0, -0.03, 0.165]),
    ...[-1, 1].flatMap(s => [part(new THREE.ConeGeometry(0.07, 0.24, 4), 0xd8782a, [s * 0.08, 0.15, -0.02], [0, 0, -s * 0.38], [1, 1, 0.45], { top: 0xf0a860 }), part(new THREE.ConeGeometry(0.045, 0.17, 4), 0xffd8c0, [s * 0.075, 0.13, 0.0], [0, 0, -s * 0.38], [1, 1, 0.3]), ball(0.02, 0x1a1008, [s * 0.045, 0.02, 0.085])])], [0, 0.08, 0.22]);
  const tail = b.M(tor, [kit.tube([[0, 0, 0], [0, 0.08, -0.12], [0, 0.2, -0.2]], 0.07, 0.05, 0xd8782a, { top: 0xf0a860, tex: 'fur' }, 7), ball(0.07, 0xff8a20, [0, 0.24, -0.22], [1, 1.3, 1], { emit: true }), ball(0.04, 0xfff0a0, [0, 0.27, -0.22], [1, 1.4, 1], { emit: true })], [0, 0.02, -0.18]);
  const L = [[-0.06, 0.12], [0.06, 0.12], [-0.06, -0.13], [0.06, -0.13]].map(([x, z], i) => { const g = b.M(tor, [part(new THREE.CylinderGeometry(0.03, 0.024, 0.22, 5), 0xc06a24, [0, -0.11, 0], 0, 1, { top: 0xd8782a }), ball(0.03, 0x2a1a10, [0, -0.22, 0.01])], [x, -0.06, z]); g.ph = (i === 0 || i === 3) ? 0 : 1; return g; });
  b.root.scale.setScalar(1.9);
  return done(b, { tor, head, tail, l0: L[0], l1: L[1], l2: L[2], l3: L[3] }, (a, sp, k, dead) => {
    for (const g of L) g.rotation.x = Math.sin(a.t * 12 + g.ph * Math.PI) * 0.6 * (sp ? 1 : 0);
    tor.position.y = 0.3 + Math.abs(Math.sin(a.t * 12)) * 0.02 * (sp ? 1 : 0); tail.rotation.y = Math.sin(a.t * 3) * 0.35; tail.rotation.x = 0.2 * Math.sin(a.t * 1.7);
    head.rotation.x = -0.25 * k + Math.sin(a.t * 1.3) * 0.05; head.position.z = 0.22 + 0.07 * k; tor.rotation.x = 0.15 * k;
    b.body.rotation.z = dead ? 1.45 : 0; b.body.position.y = dead ? -0.12 : 0;
  }, { height: 0.6 });
}
// крылья летунов: плоские пластины на шарнире у плеча
const wing = (kit, b, parent, s, w, d, color, top, p) => b.M(parent, [kit.part(new b.THREE.BoxGeometry(w, 0.02, d), color, [s * w / 2, 0, 0], 0, 1, { top, tex: 'cloth' }), kit.part(new b.THREE.BoxGeometry(w * 0.7, 0.018, d * 0.7), color, [s * w * 0.95, 0, -d * 0.15], [0, s * 0.3, 0], 1, { top })], p);
// 3. Ворон-ищейка: чёрный ворон, кружит у плеча героя
function crow(kit) {
  const b = base(kit, { rimColor: 0xb0c0ff }), { THREE } = b, { part, ball } = kit;
  const tor = b.M(b.body, [ball(0.12, 0x16161e, [0, 0, 0], [0.95, 0.9, 1.35], { top: 0x3a3a50 }), part(new THREE.BoxGeometry(0.16, 0.02, 0.18), 0x16161e, [0, -0.01, -0.2], [0.25, 0, 0], 1, { top: 0x2a2a3a })], [0, 0.85, 0]);
  const head = b.M(tor, [ball(0.075, 0x16161e, [0, 0, 0], 1, { top: 0x3a3a50 }), part(new THREE.ConeGeometry(0.03, 0.12, 5), 0x3a3a3a, [0, -0.01, 0.1], [Math.PI / 2, 0, 0], 1, { top: 0x8a8a8a }), ...[-1, 1].map(s => ball(0.014, 0xffd040, [s * 0.04, 0.02, 0.05], 1, { emit: true }))], [0, 0.08, 0.14]);
  const wL = wing(kit, b, tor, -1, 0.26, 0.16, 0x16161e, 0x40405a, [-0.08, 0.03, 0]), wR = wing(kit, b, tor, 1, 0.26, 0.16, 0x16161e, 0x40405a, [0.08, 0.03, 0]);
  b.root.scale.setScalar(1.8);
  return done(b, { tor, head, wL, wR }, (a, sp, k, dead) => {
    const f = Math.sin(a.t * (sp ? 16 : 10)) * (sp ? 0.9 : 0.6); wL.rotation.z = f; wR.rotation.z = -f;
    tor.position.y = dead ? 0.15 : 0.85 + Math.sin(a.t * 2.4) * 0.05 - 0.25 * k; tor.rotation.x = 0.5 * k; head.rotation.x = 0.3 * k;
  }, { height: 1.4, shadow: 0.5 });
}
// 4. Детёныш скорпида: песочно-красный, клешни, хвост дугой с жалом
function scorpid(kit) {
  const b = base(kit, { rimColor: 0xffc0a0 }), { THREE } = b, { part, ball } = kit, C0 = 0x8a3a1c, C1 = 0xd87a3a;
  const tor = b.M(b.body, [ball(0.15, C0, [0, 0, 0], [1, 0.55, 1.3], { top: C1 }), ball(0.11, C0, [0, 0.01, -0.17], [1, 0.55, 1], { top: C1 })], [0, 0.15, 0]);
  const tail = b.M(tor, [kit.tube([[0, 0, 0], [0, 0.1, -0.1], [0, 0.24, -0.1], [0, 0.32, 0.02]], 0.05, 0.03, C0, { top: C1 }, 6), part(new THREE.ConeGeometry(0.03, 0.1, 5), 0x2a0a06, [0, 0.31, 0.08], [1.9, 0, 0], 1, { top: 0xff5a2a }), ball(0.02, 0xff7a3a, [0, 0.29, 0.1], 1, { emit: true })], [0, 0.02, -0.25]);
  const claws = [-1, 1].map(s => b.M(tor, [kit.tube([[0, 0, 0], [s * 0.08, 0, 0.08], [s * 0.06, 0, 0.18]], 0.03, 0.025, C0, { top: C1 }, 5), ball(0.05, C0, [s * 0.06, 0, 0.22], [0.8, 0.6, 1.2], { top: C1 }), part(new THREE.ConeGeometry(0.018, 0.08, 4), 0x2a0a06, [s * 0.04, 0, 0.29], [Math.PI / 2, 0, 0])], [s * 0.08, 0, 0.15]));
  const L = legs(kit, b, tor, [[-0.11, 0, 0.05], [0.11, 0, 0.05], [-0.13, 0, -0.05], [0.13, 0, -0.05], [-0.11, 0, -0.14], [0.11, 0, -0.14]], 0.17, 0x5a2410, C0, 0.15);
  b.root.scale.setScalar(2.0);
  return done(b, { tor, tail, c0: claws[0], c1: claws[1], ...L }, (a, sp, k, dead) => {
    stepLegs(L, a, sp); tail.rotation.x = Math.sin(a.t * 2) * 0.08 + 0.9 * k; claws[0].rotation.y = 0.3 * Math.sin(a.t * 3) - 0.4 * k; claws[1].rotation.y = -0.3 * Math.sin(a.t * 3) + 0.4 * k;
    b.body.rotation.z = dead ? Math.PI * 0.9 : 0; b.body.position.y = dead ? 0.3 : 0;
  }, { height: 0.5 });
}
// 5. Блуждающий огонёк: светящийся шар с ядром и тремя искрами на орбите
function wisp(kit) {
  const b = base(kit, { rim: 1, rimColor: 0xd0ffd0 }), { ball } = kit;
  const core = b.M(b.body, [ball(0.16, 0x7af0a0, [0, 0, 0], 1, { emit: true }), ball(0.09, 0xf0fff0, [0, 0, 0], 1, { emit: true })], [0, 1.0, 0]);
  const orb = b.M(core, [ball(0.035, 0xc0ffd0, [0.24, 0, 0], 1, { emit: true }), ball(0.03, 0xc0ffd0, [-0.12, 0.08, 0.2], 1, { emit: true }), ball(0.028, 0xc0ffd0, [-0.12, -0.06, -0.21], 1, { emit: true })]);
  b.root.scale.setScalar(1.5);
  return done(b, { core, orb }, (a, sp, k, dead) => {
    core.position.y = dead ? 0.2 : 1.0 + Math.sin(a.t * 2.2) * 0.07; const s = 1 + Math.sin(a.t * 5) * 0.06 + 0.25 * k; core.scale.setScalar(dead ? 0.4 : s); orb.rotation.y = a.t * 3; orb.rotation.x = Math.sin(a.t) * 0.4;
  }, { height: 1.4, shadow: 0.4 });
}
// 7. Костяной череп: парит, зелёное пламя в глазницах, нижняя челюсть щёлкает
function skull(kit) {
  const b = base(kit, { rimColor: 0xb0ffb0 }), { THREE } = b, { part, ball } = kit, BN = 0xe8dcc0;
  const cr = b.M(b.body, [ball(0.16, BN, [0, 0, 0], [1, 0.95, 1.1], { top: 0xfff8e8 }), ...[-1, 1].flatMap(s => [ball(0.045, 0x101410, [s * 0.065, -0.01, 0.13], [1, 1.1, 0.5]), ball(0.024, 0x80ff70, [s * 0.065, -0.01, 0.15], 1, { emit: true })]), part(new THREE.ConeGeometry(0.025, 0.05, 3), 0x101410, [0, -0.06, 0.155], [Math.PI, 0, 0], [1, 1, 0.5]),
    ...[-1, 0, 1].map(s => part(new THREE.BoxGeometry(0.028, 0.03, 0.02), 0xfff8e8, [s * 0.034, -0.1, 0.14]))], [0, 0.9, 0]);
  const jaw = b.M(cr, [part(new THREE.BoxGeometry(0.15, 0.04, 0.12), BN, [0, -0.02, 0.05], 0, 1, { top: 0xfff8e8 }), ...[-1, 0, 1].map(s => part(new THREE.BoxGeometry(0.026, 0.03, 0.02), 0xfff8e8, [s * 0.034, 0.015, 0.1]))], [0, -0.12, 0.02]);
  const fl = b.M(cr, [part(new THREE.ConeGeometry(0.09, 0.26, 6), 0x40c040, [0, 0.2, -0.05], [-0.4, 0, 0], 1, { emit: true }), part(new THREE.ConeGeometry(0.05, 0.18, 5), 0xc0ffa0, [0, 0.17, -0.03], [-0.4, 0, 0], 1, { emit: true })]);
  b.root.scale.setScalar(1.7);
  return done(b, { cr, jaw, fl }, (a, sp, k, dead) => {
    cr.position.y = dead ? 0.2 : 0.9 + Math.sin(a.t * 2) * 0.06; cr.rotation.z = Math.sin(a.t * 1.3) * 0.1; jaw.rotation.x = 0.25 * k + Math.max(0, Math.sin(a.t * 6)) * 0.08; fl.scale.y = 1 + Math.sin(a.t * 9) * 0.15;
  }, { height: 1.5, shadow: 0.4 });
}
// 8. Василиск: зелёная ящерица с гребнем из шипов и жёлтыми глазами
function basilisk(kit) {
  const b = base(kit, { rimColor: 0xe0ffa0 }), { THREE } = b, { part, ball } = kit, C0 = 0x2a5a24, C1 = 0x8ac04a;
  const tor = b.M(b.body, [part(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), C0, [0, 0, 0], [Math.PI / 2, 0, 0], [1.2, 1, 0.8], { top: C1 }), ...[0.14, 0.04, -0.06, -0.16].map((z, i) => part(new THREE.ConeGeometry(0.035, 0.11 - i * 0.015, 4), 0xc0a020, [0, 0.1, z], [-0.3, 0, 0], 1, { top: 0xffe060 }))], [0, 0.17, 0]);
  const head = b.M(tor, [ball(0.09, C0, [0, 0, 0.05], [1, 0.7, 1.4], { top: C1 }), ...[-1, 1].map(s => ball(0.025, 0xffe020, [s * 0.06, 0.03, 0.08], 1, { emit: true })), part(new THREE.ConeGeometry(0.04, 0.14, 4), 0xc0a020, [0, 0.07, -0.02], [-0.6, 0, 0], 1, { top: 0xffe060 })], [0, 0.03, 0.26]);
  const tail = b.M(tor, [kit.tube([[0, 0, 0], [0.03, -0.03, -0.15], [-0.03, -0.08, -0.32]], 0.07, 0.015, C0, { top: C1 }, 6)], [0, 0, -0.22]);
  const L = [[-0.12, 0.12], [0.12, 0.12], [-0.12, -0.12], [0.12, -0.12]].map(([x, z], i) => { const s = Math.sign(x), g = b.M(tor, [kit.tube([[0, 0, 0], [s * 0.08, 0.02, 0], [s * 0.1, -0.13, 0.02]], 0.035, 0.022, C0, { top: C1 }, 5)], [x * 0.7, -0.02, z]); g.ph = (i === 0 || i === 3) ? 0 : 1; return g; });
  b.root.scale.setScalar(1.9);
  return done(b, { tor, head, tail, l0: L[0], l1: L[1], l2: L[2], l3: L[3] }, (a, sp, k, dead) => {
    for (const g of L) g.rotation.y = Math.sin(a.t * 12 + g.ph * Math.PI) * 0.5 * (sp ? 1 : 0);
    tor.rotation.y = Math.sin(a.t * 12) * 0.1 * (sp ? 1 : 0); tail.rotation.y = Math.sin(a.t * (sp ? 12 : 2)) * 0.35; head.rotation.x = -0.35 * k + Math.sin(a.t * 1.5) * 0.04; head.position.z = 0.26 + 0.06 * k;
    b.body.rotation.z = dead ? Math.PI * 0.9 : 0; b.body.position.y = dead ? 0.35 : 0;
  }, { height: 0.5 });
}
// 9. Летучая мышь Бездны: фиолетовая, большие перепончатые крылья, светящиеся глаза
function bat(kit) {
  const b = base(kit, { rimColor: 0xe0a0ff }), { THREE } = b, { part, ball } = kit, C0 = 0x2a1a3a, C1 = 0x6a3a8a;
  const tor = b.M(b.body, [ball(0.1, C0, [0, 0, 0], [1, 1.1, 1], { top: C1, tex: 'fur' }), ball(0.075, C0, [0, 0.11, 0.03], 1, { top: C1 }), ...[-1, 1].flatMap(s => [part(new THREE.ConeGeometry(0.035, 0.12, 4), C0, [s * 0.045, 0.2, 0.02], [0, 0, -s * 0.25], [1, 1, 0.5], { top: C1 }), ball(0.016, 0xff60d0, [s * 0.03, 0.12, 0.09], 1, { emit: true })]), part(new THREE.ConeGeometry(0.012, 0.03, 3), 0xffffff, [0.018, 0.07, 0.085], [Math.PI, 0, 0]), part(new THREE.ConeGeometry(0.012, 0.03, 3), 0xffffff, [-0.018, 0.07, 0.085], [Math.PI, 0, 0])], [0, 0.85, 0]);
  const memb = (s) => b.M(tor, [part(new THREE.BoxGeometry(0.2, 0.015, 0.2), C1, [s * 0.1, 0, -0.02], [0, 0, 0], 1, { top: 0x9a5ac0 }), part(new THREE.BoxGeometry(0.16, 0.012, 0.16), C1, [s * 0.26, 0, -0.06], [0, s * 0.5, 0], 1, { top: 0x9a5ac0 }), kit.tube([[0, 0.01, 0.08], [s * 0.2, 0.02, 0.06], [s * 0.36, 0.0, -0.12]], 0.014, 0.008, C0, { top: C1 }, 4)], [s * 0.07, 0.03, 0]);
  const wL = memb(-1), wR = memb(1);
  b.root.scale.setScalar(1.8);
  return done(b, { tor, wL, wR }, (a, sp, k, dead) => {
    const f = Math.sin(a.t * (sp ? 18 : 12)) * 0.9; wL.rotation.z = f; wR.rotation.z = -f;
    tor.position.y = dead ? 0.15 : 0.85 + Math.sin(a.t * 3) * 0.06 - 0.25 * k; tor.rotation.x = 0.4 * k;
  }, { height: 1.5, shadow: 0.5 });
}
// 10. Голем из песчаника: глыбы, светящаяся руна на груди, тяжёлые кулаки
function golem(kit) {
  const b = base(kit, { rimColor: 0xffd8a0 }), { THREE } = b, { part, ball, bbox } = kit, S0 = 0xa8603a, S1 = 0xd89a60;
  const tor = b.M(b.body, [bbox(0.38, 0.32, 0.26, 0.05, S0, [0, 0, 0], 0, { top: S1, tex: 'rock' }), bbox(0.3, 0.12, 0.22, 0.04, S0, [0, -0.2, 0], 0, { top: S1, tex: 'rock' }), part(new THREE.OctahedronGeometry(0.06), 0xffb040, [0, 0.03, 0.14], 0, [1, 1.3, 0.5], { emit: true })], [0, 0.55, 0]);
  const head = b.M(tor, [bbox(0.17, 0.14, 0.15, 0.03, S0, [0, 0, 0], 0, { top: S1, tex: 'rock' }), ...[-1, 1].map(s => ball(0.02, 0xffc050, [s * 0.04, 0.01, 0.075], 1, { emit: true }))], [0, 0.24, 0.02]);
  const arm = s => b.M(tor, [bbox(0.12, 0.26, 0.12, 0.03, S0, [0, -0.13, 0], [0, 0, s * 0.1], { top: S1, tex: 'rock' }), bbox(0.16, 0.14, 0.16, 0.04, S0, [s * 0.015, -0.32, 0.01], 0, { top: S1, tex: 'rock' })], [s * 0.26, 0.1, 0]);
  const aL = arm(-1), aR = arm(1);
  const leg = s => b.M(b.body, [bbox(0.13, 0.3, 0.14, 0.03, S0, [0, -0.15, 0], 0, { top: S1, tex: 'rock' }), bbox(0.15, 0.06, 0.2, 0.02, S0, [0, -0.3, 0.02], 0, { top: S1, tex: 'rock' })], [s * 0.1, 0.33, 0]);
  const gL = leg(-1), gR = leg(1);
  b.root.scale.setScalar(1.7);
  return done(b, { tor, head, aL, aR, gL, gR }, (a, sp, k, dead) => {
    const w = Math.sin(a.t * 7) * (sp ? 0.45 : 0); gL.rotation.x = w; gR.rotation.x = -w; aL.rotation.x = -w * 0.7; aR.rotation.x = w * 0.7 - 1.6 * k;
    tor.position.y = 0.55 + Math.abs(Math.sin(a.t * 7)) * 0.02 * (sp ? 1 : 0); tor.rotation.x = 0.2 * k; head.rotation.y = Math.sin(a.t * 0.8) * 0.2;
    b.body.rotation.x = dead ? -1.4 : 0; b.body.position.y = dead ? 0.1 : 0;
  }, { height: 1.1, shadow: 0.8, radius: 0.3 });
}

const FLY = { crow: 1, wisp: 1, skull: 1, bat: 1 };
const def = (id, fn) => ({ id: 'pet_' + id, kind: 'npc', outline: 'mob', fly: !!FLY[id], build: fn });
export const PET_MODELS = { fennec: def('fennec', fennec), crow: def('crow', crow), scorpid: def('scorpid', scorpid), wisp: def('wisp', wisp), skull: def('skull', skull), basilisk: def('basilisk', basilisk), bat: def('bat', bat), golem: def('golem', golem) };
