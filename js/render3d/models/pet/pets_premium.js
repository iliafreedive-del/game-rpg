// Особые питомцы (облики за рубли или за просмотры рекламы, js/data/cosmetics.js): те же правила, что у питомцев каравана
// (pets.js): процедурные, свой простой риг, клипы idle / walk / attack / hit / death / cast. Файлов не качают.
import { base, done, membrane, feathers } from './pets.js';

// Дракончик Бездны: тёмно-фиолетовый, перепончатые крылья, рожки, светящееся брюхо и пасть (выдыхает пламя при атаке)
function dragon(kit) {
  const b = base(kit, { rimColor: 0xd0a0ff }), { THREE } = b, { part, ball } = kit, C0 = 0x3a1a5a, C1 = 0x7a4ab0, BELLY = 0xffa040;
  const tor = b.M(b.body, [ball(0.13, C0, [0, 0, 0], [1, 0.95, 1.35], { top: C1 }), ball(0.09, BELLY, [0, -0.05, 0.05], [1, 0.8, 1.3], { emit: true }),
    ...[0.12, 0.02, -0.08, -0.18].map((z, i) => part(new THREE.ConeGeometry(0.03, 0.08 - i * 0.01, 4), C1, [0, 0.12 - i * 0.005, z], [-0.3, 0, 0]))], [0, 0.42, 0]);
  const head = b.M(tor, [ball(0.1, C0, [0, 0, 0], [1, 0.9, 1.2], { top: C1 }), ball(0.06, C0, [0, -0.03, 0.1], [1, 0.7, 1.2], { top: C1 }),
    ...[-1, 1].flatMap(s => [ball(0.022, 0xffe040, [s * 0.05, 0.03, 0.08], 1, { emit: true }), kit.tube([[s * 0.05, 0.06, -0.03], [s * 0.08, 0.14, -0.08], [s * 0.07, 0.2, -0.16]], 0.025, 0.006, 0xe8dcc0, { top: 0xffffff }, 5)]),
    ball(0.03, 0xff6a10, [0, -0.05, 0.17], [1.2, 0.6, 1], { emit: true })], [0, 0.12, 0.17]);
  const tail = b.M(tor, [kit.tube([[0, 0, 0], [0, -0.04, -0.15], [0.04, -0.1, -0.3], [0.02, -0.14, -0.42]], 0.07, 0.015, C0, { top: C1 }, 6), part(new THREE.ConeGeometry(0.04, 0.08, 3), C1, [0.02, -0.14, -0.45], [-Math.PI / 2, 0, 0])], [0, 0, -0.15]);
  const wL = membrane(kit, b, tor, -1, 0.42, C1, 0xb080f0, 0x2a1040, [-0.07, 0.1, 0.02]), wR = membrane(kit, b, tor, 1, 0.42, C1, 0xb080f0, 0x2a1040, [0.07, 0.1, 0.02]);
  const L = [[-0.08, 0.1], [0.08, 0.1], [-0.08, -0.1], [0.08, -0.1]].map(([x, z], i) => { const g = b.M(tor, [part(new THREE.CylinderGeometry(0.035, 0.025, 0.2, 5), C0, [0, -0.1, 0], 0, 1, { top: C1 }), ball(0.035, 0x1a0a2a, [0, -0.2, 0.015])], [x, -0.1, z]); g.ph = (i === 0 || i === 3) ? 0 : 1; return g; });
  const fire = b.M(head, [part(new THREE.ConeGeometry(0.06, 0.35, 6), 0xff8020, [0, 0, 0.18], [Math.PI / 2, 0, 0], 1, { emit: true }), part(new THREE.ConeGeometry(0.03, 0.25, 5), 0xfff0a0, [0, 0, 0.14], [Math.PI / 2, 0, 0], 1, { emit: true })], [0, -0.05, 0.17]);
  b.root.scale.setScalar(1.8);
  return done(b, { tor, head, tail, wL, wR, fire, l0: L[0], l1: L[1], l2: L[2], l3: L[3] }, (a, sp, k, dead) => {
    for (const g of L) g.rotation.x = Math.sin(a.t * 11 + g.ph * Math.PI) * 0.55 * (sp ? 1 : 0);
    const f = Math.sin(a.t * (sp ? 9 : 3)) * (sp ? 0.5 : 0.25) + 0.25; wL.rotation.z = f; wR.rotation.z = -f;
    tor.position.y = 0.42 + Math.sin(a.t * 2) * 0.015; tail.rotation.y = Math.sin(a.t * 2.4) * 0.4;
    head.rotation.x = -0.3 * k + Math.sin(a.t * 1.4) * 0.05; fire.visible = k > 0.15; fire.scale.setScalar(0.4 + k);
    b.body.rotation.z = dead ? 1.45 : 0; b.body.position.y = dead ? -0.2 : 0;
  }, { height: 0.8 });
}
// Феникс: огненная птица, парит у плеча; хвост из языков пламени, крылья светятся
function phoenix(kit) {
  const b = base(kit, { rim: 0.9, rimColor: 0xffd080 }), { THREE } = b, { part, ball } = kit, C0 = 0xff5a10, C1 = 0xffc040;
  const tor = b.M(b.body, [ball(0.11, C0, [0, 0, 0], [0.9, 0.95, 1.3], { top: C1, emit: true })], [0, 1.0, 0]);
  const head = b.M(tor, [ball(0.07, C0, [0, 0, 0], 1, { top: C1, emit: true }), part(new THREE.ConeGeometry(0.025, 0.09, 5), 0x6a3010, [0, -0.01, 0.08], [Math.PI / 2, 0, 0], 1, { top: 0xffe080 }),
    ...[0, 1, 2].map(i => part(new THREE.ConeGeometry(0.02, 0.14 - i * 0.02, 4), 0xffe060, [0, 0.07, -0.02 - i * 0.03], [-0.6 - i * 0.2, 0, 0], 1, { emit: true })),
    ...[-1, 1].map(s => ball(0.013, 0xffffff, [s * 0.035, 0.015, 0.05], 1, { emit: true }))], [0, 0.08, 0.13]);
  const tail = b.M(tor, [0, 1, 2, 3, 4].map(i => part(new THREE.ConeGeometry(0.035, 0.45 - Math.abs(i - 2) * 0.08, 4), i % 2 ? 0xffd060 : 0xff4a10, [(i - 2) * 0.04, -0.06, -0.24], [-Math.PI / 2 - 0.3, 0, (i - 2) * 0.15], 1, { emit: true })), [0, 0, -0.08]);
  const wL = feathers(kit, b, tor, -1, 0.42, 0xff5a10, 0xffd860, [-0.06, 0.04, 0.02]), wR = feathers(kit, b, tor, 1, 0.42, 0xff5a10, 0xffd860, [0.06, 0.04, 0.02]);
  b.root.scale.setScalar(1.7);
  return done(b, { tor, head, tail, wL, wR }, (a, sp, k, dead) => {
    const f = Math.sin(a.t * (sp ? 12 : 6)) * (sp ? 0.8 : 0.5); wL.rotation.z = f; wR.rotation.z = -f;
    tor.position.y = dead ? 0.15 : 1.0 + Math.sin(a.t * 2.2) * 0.06 - 0.2 * k; tor.rotation.x = 0.45 * k; tail.rotation.x = Math.sin(a.t * 3) * 0.12; tail.scale.z = 1 + Math.sin(a.t * 8) * 0.1;
  }, { height: 1.5, shadow: 0.4 });
}
// Призрачный волчонок: полупрозрачный голубой волк с гривой-дымкой, светящиеся глаза и следы
function spiritwolf(kit) {
  const b = base(kit, { rim: 1, rimColor: 0xa0e8ff }), { THREE } = b, { part, ball } = kit, C0 = 0x5a9ac8, C1 = 0xc8f0ff;
  const tor = b.M(b.body, [part(new THREE.CapsuleGeometry(0.12, 0.28, 4, 8), C0, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1.05, 1], { top: C1, tex: 'fur' }),
    ...[0, 1, 2, 3].map(i => part(new THREE.ConeGeometry(0.06, 0.16, 4), C1, [0, 0.1, 0.12 - i * 0.07], [-0.6, 0, 0], 1, { emit: true }))], [0, 0.36, 0]);
  const head = b.M(tor, [ball(0.11, C0, [0, 0, 0], [1, 0.95, 1.05], { top: C1, tex: 'fur' }), part(new THREE.CylinderGeometry(0.045, 0.06, 0.13, 6), C0, [0, -0.03, 0.12], [Math.PI / 2, 0, 0], 1, { top: C1 }), ball(0.022, 0x0a1a2a, [0, -0.02, 0.19]),
    ...[-1, 1].flatMap(s => [part(new THREE.ConeGeometry(0.045, 0.13, 4), C0, [s * 0.06, 0.12, -0.02], [0, 0, -s * 0.2], 1, { top: C1 }), ball(0.02, 0x80f0ff, [s * 0.045, 0.02, 0.09], 1, { emit: true })])], [0, 0.1, 0.24]);
  const tail = b.M(tor, [kit.tube([[0, 0, 0], [0, 0.08, -0.12], [0, 0.12, -0.26]], 0.06, 0.03, C1, { emit: true }, 7)], [0, 0.02, -0.2]);
  const L = [[-0.07, 0.13], [0.07, 0.13], [-0.07, -0.13], [0.07, -0.13]].map(([x, z], i) => { const g = b.M(tor, [part(new THREE.CylinderGeometry(0.035, 0.026, 0.26, 5), C0, [0, -0.13, 0], 0, 1, { top: C1 }), ball(0.03, C1, [0, -0.26, 0.01], 1, { emit: true })], [x, -0.06, z]); g.ph = (i === 0 || i === 3) ? 0 : 1; return g; });
  b.mat.transparent = true; b.mat.opacity = 0.82;
  b.root.scale.setScalar(1.8);
  return done(b, { tor, head, tail, l0: L[0], l1: L[1], l2: L[2], l3: L[3] }, (a, sp, k, dead) => {
    for (const g of L) g.rotation.x = Math.sin(a.t * 12 + g.ph * Math.PI) * 0.6 * (sp ? 1 : 0);
    tor.position.y = 0.36 + Math.sin(a.t * 1.8) * 0.02; tail.rotation.y = Math.sin(a.t * 4) * 0.4; head.rotation.x = -0.3 * k + Math.sin(a.t * 1.2) * 0.05; head.position.z = 0.24 + 0.08 * k;
    b.body.rotation.z = dead ? 1.45 : 0; b.body.position.y = dead ? -0.15 : 0;
  }, { height: 0.7 });
}
const FLY = { phoenix: 1 };
const MOTES = {
  dragon: { at: [0, 0.88, 0.9], rate: 5, colA: 0xffd060, colB: 0xff3000, grav: -1, size: 0.08, k: 2, sp: 0.1, up: 0.3 },
  phoenix: { at: [0, 1.65, -0.7], rate: 18, colA: 0xffe070, colB: 0xff2000, grav: -0.6, size: 0.13, k: 2.3, sp: 0.2, up: 0.1 },
  spiritwolf: { at: [0, 0.6, 0], rate: 8, colA: 0xd0f8ff, colB: 0x3080ff, grav: -0.6, size: 0.12, k: 1.4, sp: 0.35, up: 0.3, wobble: 0.3 },
};
const def = (id, fn) => ({ id: 'pet_' + id, kind: 'npc', outline: 'mob', fly: !!FLY[id], build: fn, motes: MOTES[id] });
export const PREMIUM_PET_MODELS = { dragon: def('dragon', dragon), phoenix: def('phoenix', phoenix), spiritwolf: def('spiritwolf', spiritwolf) };
