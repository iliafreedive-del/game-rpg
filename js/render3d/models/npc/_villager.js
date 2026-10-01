// Общая заготовка жителя деревни (не модель, а функция для моделей npc_*): простой гуманоид с цветами и мелкими атрибутами.
// Полный набор клипов нужен по формату, поэтому тут есть и attack/cast/death — простые.
export function villager(kit, o = {}) {
  const { THREE, PAL, part, merge, ball, group, rig, pivot } = kit;
  const { smooth, lerp, clamp } = rig;
  const mat = kit.mat({ rim: 0.55, rimColor: o.rim ?? 0xffe2b8 });
  const M = g => new THREE.Mesh(g, mat);
  const H = o.height ?? 1.7, k = H / 1.7;
  const root = new THREE.Group(); const { spin, body: rg } = pivot(root, 0.5);
  const skin = o.skin ?? 0xd9a77e, cloth = o.cloth ?? 0x6a4a2a, clothTop = o.clothTop ?? 0x9a7a4a, pants = o.pants ?? 0x2c2a30;
  const hips = group([0, 0.85 * k, 0], rg);
  const torso = group([0, 0.05, 0], hips);
  torso.add(M(merge([
    part(new THREE.CapsuleGeometry(0.2 * (o.girth ?? 1), 0.4 * k, 4, 10), cloth, [0, 0.32 * k, 0], 0, [1.1, 1, 0.85], { top: clothTop }),
    part(new THREE.CylinderGeometry(0.24 * (o.girth ?? 1), 0.3 * (o.girth ?? 1), 0.5 * k, 10), cloth, [0, -0.05, 0], 0, 1, { top: clothTop }),
    part(new THREE.CylinderGeometry(0.235, 0.235, 0.06, 12), PAL.brassD, [0, 0.12, 0], 0, [1.05, 1, 0.85]),
    ...(o.apron ? [part(new THREE.BoxGeometry(0.32, 0.5 * k, 0.04), o.apron, [0, 0.0, 0.2], 0, 1, { top: 0x6a5a4a })] : []),
    ...(o.sash ? [part(new THREE.BoxGeometry(0.1, 0.62 * k, 0.04), o.sash, [0.1, 0.34 * k, 0.17], [0, 0, 0.5])] : []),
  ])));
  const head = group([0, 0.78 * k, 0], torso);
  head.add(M(merge([
    ball(0.17, skin, [0, 0.16, 0], [1, 1.08, 1.02], { top: 0xf2c8a4 }),
    ball(0.025, 0x1a1218, [0.065, 0.18, 0.15]), ball(0.025, 0x1a1218, [-0.065, 0.18, 0.15]),
    ...(o.hair !== undefined ? [part(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hair, [0, 0.2, -0.015], 0, [1, 1, 1.05], { top: o.hairTop ?? o.hair })] : []),
    ...(o.beard ? [part(new THREE.ConeGeometry(0.13, 0.3, 8), o.beard, [0, 0.0, 0.08], [Math.PI * 0.95, 0, 0], [1, 1, 0.8], { top: 0xffffff })] : []),
    ...(o.hat === 'pointed' ? [part(new THREE.ConeGeometry(0.2, 0.34, 8), o.hatColor ?? 0x6a3fd0, [0, 0.48, 0], [0.1, 0, 0]), part(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12), o.hatColor ?? 0x6a3fd0, [0, 0.32, 0])] : []),
    ...(o.hat === 'cap' ? [part(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), o.hatColor ?? 0x3a3a46, [0, 0.22, 0], 0, [1, 1, 1.05]), part(new THREE.BoxGeometry(0.26, 0.03, 0.12), o.hatColor ?? 0x3a3a46, [0, 0.2, 0.17])] : []),
  ])));
  const arm = s => {
    const g = group([s * 0.3, 0.55 * k, 0], torso);
    g.add(M(part(new THREE.CapsuleGeometry(0.06, 0.24 * k, 3, 6), o.sleeve ?? cloth, [0, -0.17 * k, 0])));
    const el = group([0, -0.36 * k, 0], g);
    el.add(M(merge([part(new THREE.CapsuleGeometry(0.052, 0.22 * k, 3, 6), o.sleeve ?? cloth, [0, -0.15 * k, 0]), ball(0.065, skin, [0, -0.33 * k, 0])])));
    g.elbow = el; return g;
  };
  const armR = arm(-1), armL = arm(1);
  const handR = group([0, -0.33 * k, 0.02], armR.elbow), handL = group([0, -0.33 * k, 0.02], armL.elbow);
  handR.rotation.x = 1.2;
  const leg = s => {
    const g = group([s * 0.12, 0.85 * k, 0], rg);
    g.add(M(part(new THREE.CapsuleGeometry(0.075, 0.55 * k, 3, 8), pants, [0, -0.38 * k, 0])));
    g.add(M(part(new THREE.BoxGeometry(0.15, 0.1, 0.28), 0x241a14, [0, -0.8 * k, 0.05])));
    return g;
  };
  const legL = leg(1), legR = leg(-1);
  let ph = 0;
  const pose = (a, walk, extra = {}) => {
    const sp = walk ? a.speed : 0; ph += a.dt * sp * 2.6; const s = Math.sin(ph) * clamp(sp, 0, 1.5) * 0.5;
    legL.rotation.x = s; legR.rotation.x = -s; hips.position.y = 0.85 * k + Math.abs(s) * 0.03;
    const br = Math.sin(a.t * 1.8) * 0.012;
    torso.rotation.set(br + (extra.lean || 0), 0, 0); head.rotation.set(-br * 2 + (extra.nod || 0), extra.turn || 0, 0);
    armL.rotation.set(-s + (extra.al || 0), 0, 0.1); armR.rotation.set(s + (extra.ar || 0), 0, -0.1);
    armL.elbow.rotation.x = -0.15 - (extra.ael || 0); armR.elbow.rotation.x = -0.15 - (extra.aer || 0);
    spin.rotation.set(0, 0, 0); spin.position.y = 0.5;
  };
  const anims = {
    idle: a => pose(a, false),
    walk: a => pose(a, true),
    talk: a => { const g = Math.sin(a.t * 3.1) * 0.5 + 0.5; pose(a, false, { nod: Math.sin(a.t * 4.2) * 0.06, ar: -0.6 - g * 0.5, aer: 0.7 + g * 0.3, turn: Math.sin(a.t * 1.3) * 0.15 }); },
    attack: a => { const w = smooth(a.k / 0.4) * (1 - smooth((a.k - 0.4) / 0.3)); pose(a, false, { ar: -2.4 * w + 1.2 * smooth((a.k - 0.4) / 0.3) * (1 - smooth((a.k - 0.7) / 0.3)), lean: 0.2 * smooth((a.k - 0.4) / 0.3) }); },
    hit: a => pose(a, false, { lean: -0.3 * (1 - a.k), nod: 0.3 * (1 - a.k) }),
    cast: a => pose(a, false, { ar: -1.8 * smooth(a.k / 0.5), al: -1.4 * smooth(a.k / 0.5), aer: 0.4 }),
    death: a => { const e = smooth(a.k ?? 1); pose(a, false); spin.rotation.x = -Math.PI / 2 * 0.95 * e; spin.position.y = lerp(0.5, 0.2, e); },
  };
  return {
    root, height: H, radius: 0.32, shadow: 1.1, materials: [mat],
    sockets: { handR, handL, head },
    bones: { spin, hips, torso, head, armR, armL, elR: armR.elbow, elL: armL.elbow, legL, legR },
    clips: { idle: { loop: true }, walk: { loop: true }, talk: { loop: true }, attack: { dur: 0.6, hit: 0.4 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 0.7, fire: 0.5 } },
    anims,
  };
}
