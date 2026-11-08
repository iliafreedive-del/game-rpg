// Общая заготовка жителя деревни (не модель, а функция для моделей npc_*): простой гуманоид с цветами и мелкими атрибутами.
// Полный набор клипов нужен по формату, поэтому тут есть и attack/cast/death — простые.
export function villager(kit, o = {}) {
  const { THREE, PAL, part, merge, ball, group, rig, pivot } = kit;
  const { smooth, lerp, clamp } = rig;
  const mat = kit.mat({ rim: 0.55, rimColor: o.rim ?? 0xffe2b8 });
  const M = g => new THREE.Mesh(g, mat);
  const H = o.height ?? 1.7, k = H / 1.7;
  const root = new THREE.Group(); const { spin, body: rg } = pivot(root, 0.5);
  const skin = o.skin ?? 0xd9a77e, skinTop = o.skinTop ?? 0xf2c8a4, cloth = o.cloth ?? 0x6a4a2a, clothTop = o.clothTop ?? 0x9a7a4a, pants = o.pants ?? 0x2c2a30;
  const hips = group([0, 0.85 * k, 0], rg);
  const torso = group([0, 0.05, 0], hips);
  torso.add(M(merge([
    part(new THREE.CapsuleGeometry(0.2 * (o.girth ?? 1), 0.4 * k, 4, 10), cloth, [0, 0.32 * k, 0], 0, [1.1, 1, 0.85], { top: clothTop, tex: 'cloth' }),
    part(new THREE.TorusGeometry(0.12, 0.035, 4, 10), o.collar ?? clothTop, [0, 0.62 * k, 0], [Math.PI / 2, 0, 0], [1.1, 0.9, 1], { tex: 'cloth' }),
    part(new THREE.CylinderGeometry(0.24 * (o.girth ?? 1), 0.31 * (o.girth ?? 1), 0.5 * k, 12), cloth, [0, -0.05, 0], 0, 1, { top: clothTop, tex: 'cloth' }),
    part(new THREE.CylinderGeometry(0.235, 0.235, 0.06, 12), 0x3a2418, [0, 0.12, 0], 0, [1.05, 1, 0.85], { top: 0x6a4428, tex: 'cloth' }),
    kit.bbox(0.08, 0.07, 0.03, 0.01, PAL.brassD, [0, 0.12, 0.2], 0, { top: PAL.brass }),
    kit.bbox(0.12, 0.13, 0.07, 0.02, 0x5a3a22, [0.18, 0.04, 0.12], [0, -0.6, 0], { top: 0x8a6a40, tex: 'leather' }),
    ...(o.apron ? [part(new THREE.BoxGeometry(0.32, 0.5 * k, 0.04), o.apron, [0, 0.0, 0.2], 0, 1, { top: 0x6a5a4a, tex: 'cloth' })] : []),
    ...(o.dress ? [kit.lathe([[0.27, 0.05], [0.33, -0.2 * k], [0.42, -0.62 * k], [0.47, -0.82 * k]], o.dress.c, [0, 0, 0], 0, [1.05, 1, 0.95], { top: o.dress.top ?? o.dress.c, tex: 'cloth' }, 14),
      kit.lathe([[0.465, -0.8 * k], [0.47, -0.82 * k]], o.dress.trim ?? 0xd6a548, [0, 0, 0], 0, [1.05, 1, 0.95], { top: 0xf0c868 }, 14),
      kit.bbox(0.1, 0.78 * k, 0.03, 0.01, o.dress.trim ?? 0xd6a548, [0, -0.38 * k, 0.3], [0.1, 0, 0], { top: 0xf0c868 })] : []),
    ...(o.necklace ? [part(new THREE.TorusGeometry(0.13, 0.016, 4, 12), 0xf0c868, [0, 0.56 * k, 0.05], [Math.PI / 2 + 0.5, 0, 0], [1, 1, 1], { top: 0xffe890 })] : []),
    ...(o.sash ? [part(new THREE.BoxGeometry(0.1, 0.62 * k, 0.04), o.sash, [0.1, 0.34 * k, 0.17], [0, 0, 0.5], 1, { tex: 'cloth' })] : []),
  ])));
  const head = group([0, 0.78 * k, 0], torso);
  head.add(M(merge([
    ball(0.17, skin, [0, 0.16, 0], [1, 1.08, 1.02], { top: skinTop }),
    // нарисованное лицо: белки с радужкой и зрачком, блик, брови, румянец, ноздри, складка рта
    ...[-1, 1].flatMap(sx => [ball(0.036, 0xf4eee2, [sx * 0.065, 0.18, 0.138], [1.1, 0.9, 0.55]), ball(0.022, o.eye ?? 0x4a6a8a, [sx * 0.065, 0.18, 0.152], [1, 1, 0.5]), ball(0.012, 0x0c0a10, [sx * 0.065, 0.18, 0.158], [1, 1, 0.5]),
      ball(0.006, 0xffffff, [sx * 0.06, 0.188, 0.162], 1, { emit: true }), kit.bbox(0.07, 0.014, 0.02, 0.004, o.hair ?? 0x3a2a1c, [sx * 0.065, 0.225, 0.145], [0, 0, -sx * 0.18]),
      ball(0.03, o.blush ?? 0xe0907c, [sx * 0.1, 0.12, 0.125], [1, 0.7, 0.4]), ball(0.007, 0x3a1a14, [sx * 0.014, 0.115, 0.18])]),
    part(new THREE.ConeGeometry(0.035, 0.08, 5), skin, [0, 0.13, 0.17], [Math.PI / 2, 0, 0], 1, { top: skinTop }),
    ...[-1, 1].map(sx => ball(0.04, skin, [sx * 0.165, 0.16, 0], [0.5, 1, 0.8])),
    kit.bbox(0.1, 0.012, 0.02, 0.004, 0x5a3028, [0, 0.07, 0.155]),
    ...(o.hair !== undefined ? [part(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), o.hair, [0, 0.2, -0.015], 0, [1, 1, 1.05], { top: o.hairTop ?? o.hair, tex: 'bark' })] : []),
    ...(o.beard ? [part(new THREE.ConeGeometry(0.13, 0.3, 8), o.beard, [0, 0.0, 0.08], [Math.PI * 0.95, 0, 0], [1, 1, 0.8], { top: o.beardTop ?? 0xffffff })] : []),
    ...(o.scarf ? [part(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), o.scarf, [0, 0.2, -0.01], 0, [1, 1, 1.06], { top: o.scarfTop ?? o.scarf, tex: 'cloth' }),
      part(new THREE.TorusGeometry(0.19, 0.03, 4, 14), o.scarfTrim ?? 0xf0c868, [0, 0.2, 0.0], [Math.PI / 2, 0, 0], [1, 1, 1.05], { top: 0xffe890 }),
      ...[-0.1, -0.03, 0.04, 0.11].map(x => part(new THREE.SphereGeometry(0.014, 5, 4), 0xffd860, [x, 0.285, 0.16], 0, 1, { top: 0xfff0a0, emit: true })),
      kit.tube([[0.1, 0.22, -0.14], [0.16, 0.05, -0.18], [0.14, -0.15, -0.16]], 0.05, 0.02, o.scarf, { top: o.scarfTop ?? o.scarf, tex: 'cloth' }, 6)] : []),
    ...(o.turban ? [part(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), o.turban, [0, 0.22, -0.01], 0, [1.05, 1.25, 1.08], { top: o.turbanTop ?? o.turban, tex: 'cloth' }),
      ...[0.25, 0.32, 0.39].map((y, i) => part(new THREE.TorusGeometry(0.2 - i * 0.03, 0.028, 4, 14), i % 2 ? (o.turbanTop ?? o.turban) : o.turban, [0, y, -0.01], [Math.PI / 2 + 0.12 * (i - 1), 0, 0], [1.05, 1.08, 1], { tex: 'cloth' })),
      part(new THREE.OctahedronGeometry(0.035), o.gem ?? 0x40d0c0, [0, 0.33, 0.2], 0, [1, 1.3, 0.6], { emit: true })] : []),
    ...(o.braid ? [kit.tube([[0.0, 0.2, -0.17], [0.03, 0.0, -0.21], [-0.03, -0.2, -0.2], [0.02, -0.4, -0.17]], 0.055, 0.02, o.braid, { top: o.braidTop ?? o.braid, tex: 'bark' }, 6)] : []),
    ...(o.veil ? [part(new THREE.BoxGeometry(0.26, 0.1, 0.02), o.veil, [0, 0.07, 0.175], 0, 1, { top: 0xe8dcff, tex: 'cloth' })] : []),
    ...(o.hat === 'pointed' ? [part(new THREE.ConeGeometry(0.2, 0.34, 8), o.hatColor ?? 0x6a3fd0, [0, 0.48, 0], [0.1, 0, 0]), part(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 12), o.hatColor ?? 0x6a3fd0, [0, 0.32, 0], 0, 1, { tex: 'cloth' })] : []),
    ...(o.hat === 'cap' ? [part(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), o.hatColor ?? 0x3a3a46, [0, 0.22, 0], 0, [1, 1, 1.05]), part(new THREE.BoxGeometry(0.26, 0.03, 0.12), o.hatColor ?? 0x3a3a46, [0, 0.2, 0.17])] : []),
  ])));
  const arm = s => {
    const g = group([s * 0.3, 0.55 * k, 0], torso);
    g.add(M(merge([part(new THREE.CapsuleGeometry(0.065, 0.24 * k, 3, 8), o.sleeve ?? cloth, [0, -0.17 * k, 0], 0, 1, { tex: 'cloth' }), ball(0.09, o.sleeve ?? cloth, [0, 0, 0], [1, 0.8, 1], { tex: 'cloth' })])));
    const el = group([0, -0.36 * k, 0], g);
    el.add(M(merge([part(new THREE.CapsuleGeometry(0.055, 0.22 * k, 3, 8), o.sleeve ?? cloth, [0, -0.15 * k, 0], 0, 1, { tex: 'cloth' }), part(new THREE.CylinderGeometry(0.075, 0.07, 0.06, 8), o.cuff ?? clothTop, [0, -0.27 * k, 0], 0, 1, { tex: 'cloth' }), kit.bbox(0.11, 0.12, 0.08, 0.025, skin, [0, -0.35 * k, 0.005], 0, { top: skinTop })])));
    g.elbow = el; return g;
  };
  const armR = arm(-1), armL = arm(1);
  const handR = group([0, -0.33 * k, 0.02], armR.elbow), handL = group([0, -0.33 * k, 0.02], armL.elbow);
  handR.rotation.x = 1.2;
  const leg = s => {
    const g = group([s * 0.12, 0.85 * k, 0], rg);
    g.add(M(merge([part(new THREE.CapsuleGeometry(0.078, 0.55 * k, 3, 8), pants, [0, -0.38 * k, 0], 0, 1, { tex: 'cloth' }),
      part(new THREE.CylinderGeometry(0.085, 0.075, 0.24 * k, 8), 0x3a2418, [0, -0.68 * k, 0], 0, 1, { top: 0x6a4428, tex: 'cloth' }),
      kit.bbox(0.16, 0.1, 0.29, 0.03, 0x241a14, [0, -0.8 * k, 0.05], 0, { top: 0x4a3424, tex: 'cloth' })])));
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
