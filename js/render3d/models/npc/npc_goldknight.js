// Золотой рыцарь — NPC-статист Деревни Ордена: латы серебро с золотом, синий плащ и табард, большой меч с пламенной гардой.
// Сделан по картинке пользователя скилом img2threejs (код, без внешних файлов): лёгкий процедурный риг
// (таз → торс → голова, плечо → локоть → кисть, бедро → колено, плащ на своей кости). Клип покоя — стойка с дыханием,
// переносом веса и покачиванием плаща; остальные клипы — простые, только чтобы модель проходила формат (docs/MODEL_SPEC.md).
export default { id: 'npc_goldknight', kind: 'npc', outline: 'mob', build(kit) {
  const { THREE, part, merge, group, pivot, rig } = kit;
  const { smooth, lerp } = rig;
  const mat = kit.mat({ rim: 0.6, rimColor: 0xffe2a8 });
  const capeMat = kit.mat({ rim: 0.35, rimColor: 0xb8c8ff, side: THREE.DoubleSide });
  const M = (g, m = mat) => new THREE.Mesh(g, m);
  // палитра по картинке: серебро лат, золото кромок и наплечников, синий плащ/табард, рыжая шевелюра
  const SIL = 0x5c6478, SIL_L = 0xa4aec6, SIL_D = 0x3a4052, GOLD = 0x9a6418, GOLD_L = 0xf4c858, GOLD_D = 0x5e3c10,
    BLUE = 0x1a2560, BLUE_L = 0x3c56b8, SKIN = 0xd8a080, SKIN_L = 0xf6d0b0, HAIR = 0x9a5420, HAIR_L = 0xf2b456, MAIL = 0x2c3044, LEATHER = 0x3a2418;
  const S = c => ({ top: c, tex: 'metal' }), G = { top: GOLD_L, tex: 'metal' }, C = { top: BLUE_L, tex: 'cloth' };

  const root = new THREE.Group(); const { spin, body } = pivot(root, 0.95);
  const HIP = 0.98;
  const hips = group([0, HIP, 0], body);
  const torso = group([0, 0.04, 0], hips);
  // ---- торс: кираса с золотой «галочкой» и камнем, пластины живота, пояс, тассеты, табард, наплечники, ворот плаща
  const pauldron = sx => [
    ...[0, 1, 2].map(i => part(new THREE.SphereGeometry(0.21 - i * 0.025, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), i ? GOLD_D : GOLD,
      [sx * (0.36 + i * 0.035), 0.6 - i * 0.075, 0], [0, 0, -sx * (0.35 + i * 0.22)], [1.15, 0.8, 1.15], G)),
    kit.tube([[sx * 0.34, 0.7, 0.02], [sx * 0.42, 0.78, 0], [sx * 0.44, 0.86, -0.05]], 0.045, 0.012, GOLD, G, 5),   // пламенный гребень
    kit.tube([[sx * 0.46, 0.64, 0.06], [sx * 0.55, 0.7, 0.04], [sx * 0.6, 0.77, 0]], 0.032, 0.01, GOLD, G, 5),
  ];
  torso.add(M(merge([
    kit.lathe([[0.17, 0.05], [0.25, 0.18], [0.3, 0.36], [0.3, 0.5], [0.25, 0.62], [0.15, 0.7]], SIL, [0, 0, 0], 0, [1.15, 1, 0.82], S(SIL_L), 12),
    // золотая «галочка» на груди и синий камень
    ...[-1, 1].map(sx => kit.bbox(0.07, 0.3, 0.04, 0.012, GOLD, [sx * 0.085, 0.43, 0.245], [-0.1, 0, sx * 0.5], G)),
    kit.bbox(0.06, 0.16, 0.04, 0.012, GOLD, [0, 0.2, 0.26], [0.05, 0, 0], G),
    part(new THREE.OctahedronGeometry(0.035), 0x3a6aff, [0, 0.3, 0.275], 0, [1, 1.3, 0.6], { emit: true }),
    ...[0.12, 0.2].map(y => kit.lathe([[0.25 + (y - 0.12) * 0.5, 0], [0.265 + (y - 0.12) * 0.5, 0.02], [0.25 + (y - 0.12) * 0.5, 0.04]], GOLD_D, [0, y, 0], 0, [1.15, 1, 0.82], G, 12)),
    part(new THREE.CylinderGeometry(0.15, 0.18, 0.1, 10), GOLD, [0, 0.69, 0], 0, 1, G),          // горжет
    // пояс с пряжкой
    kit.lathe([[0.23, -0.04], [0.245, -0.01], [0.245, 0.05], [0.23, 0.08]], LEATHER, [0, 0, 0], 0, [1.15, 1, 0.85], { top: 0x6a4428, tex: 'leather' }, 12),
    kit.bbox(0.12, 0.1, 0.04, 0.015, GOLD, [0, 0.02, 0.24], 0, G),
    // кольчужная юбка, тассеты по бокам
    kit.lathe([[0.22, 0], [0.27, -0.12], [0.29, -0.3]], MAIL, [0, 0, 0], 0, [1.1, 1, 0.9], { top: 0x4a5070, tex: 'cloth' }, 12),
    ...[-1, 1].flatMap(sx => [kit.bbox(0.2, 0.26, 0.04, 0.015, SIL, [sx * 0.22, -0.15, 0.06], [0.1, sx * 0.9, sx * 0.18], S(SIL_L)),
      kit.bbox(0.2, 0.035, 0.05, 0.01, GOLD, [sx * 0.22, -0.28, 0.06], [0.1, sx * 0.9, sx * 0.18], G)]),
    // табард: синее полотно с золотой каймой и знаком
    kit.bbox(0.26, 0.6, 0.03, 0.01, BLUE, [0, -0.32, 0.25], [0.04, 0, 0], C),
    ...[-1, 1].map(sx => part(new THREE.BoxGeometry(0.025, 0.58, 0.04), GOLD, [sx * 0.13, -0.32, 0.255], [0.04, 0, 0], 1, G)),
    part(new THREE.BoxGeometry(0.27, 0.03, 0.04), GOLD, [0, -0.62, 0.265], [0.04, 0, 0], 1, G),
    part(new THREE.TorusGeometry(0.045, 0.012, 4, 10), GOLD_L, [0, -0.38, 0.272], 0, 1, G),
    kit.bbox(0.025, 0.18, 0.02, 0.006, GOLD_L, [0, -0.4, 0.272], 0, G),
    ...pauldron(-1), ...pauldron(1),
    // стоячий ворот плаща за шеей
    part(new THREE.CylinderGeometry(0.24, 0.2, 0.2, 10, 1, true, Math.PI / 2 + 0.5, Math.PI - 1.0), BLUE, [0, 0.76, -0.02], 0, [1.15, 1, 1], C),
  ])));
  // ---- голова: лицо, суровые брови, короткая борода, рыжие волосы назад
  const head = group([0, 0.72, 0], torso);
  head.add(M(merge([
    part(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8), SKIN, [0, 0.03, 0], 0, 1, { top: SKIN_L }),
    kit.ball(0.135, SKIN, [0, 0.19, 0.01], [0.95, 1.15, 1.02], { top: SKIN_L }),
    ...[-1, 1].flatMap(sx => [
      kit.bbox(0.05, 0.016, 0.02, 0.005, 0x1a1210, [sx * 0.048, 0.205, 0.125], [0, 0, -sx * 0.1]),          // глаз
      kit.bbox(0.065, 0.022, 0.03, 0.008, HAIR, [sx * 0.05, 0.232, 0.122], [0, 0, sx * 0.28], { top: HAIR_L }),   // бровь
      kit.ball(0.03, SKIN, [sx * 0.128, 0.19, -0.005], [0.45, 1, 0.75], { top: SKIN_L }),                     // ухо
    ]),
    part(new THREE.ConeGeometry(0.026, 0.07, 4), SKIN, [0, 0.175, 0.14], [Math.PI / 2 + 0.3, 0, 0], 1, { top: SKIN_L }),
    kit.bbox(0.055, 0.01, 0.015, 0.004, 0x5a2a20, [0, 0.12, 0.13]),
    // короткая борода по линии челюсти
    part(new THREE.SphereGeometry(0.142, 10, 5, 0, Math.PI, Math.PI * 0.66, Math.PI * 0.28), HAIR, [0, 0.19, 0.014], 0, [1.0, 1.2, 1.1], { top: HAIR_L }),
    part(new THREE.ConeGeometry(0.05, 0.08, 5), HAIR, [0, 0.04, 0.1], [Math.PI, 0, 0], [1, 1, 0.7], { top: HAIR_L }),
    // волосы: шапка и пряди, зачёсанные назад
    part(new THREE.SphereGeometry(0.15, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), HAIR, [0, 0.215, -0.025], [-0.55, 0, 0], [1.03, 1.08, 1.1], { top: HAIR_L, tex: 'bark' }),
    ...[-0.07, 0, 0.07].map(x => kit.tube([[x * 0.9, 0.29, 0.12], [x, 0.37, 0.06], [x * 1.1, 0.38, -0.06], [x * 1.15, 0.3, -0.16], [x * 1.1, 0.18, -0.16]], 0.05, 0.015, HAIR, { top: HAIR_L, tex: 'bark' }, 6)),
    ...[-1, 1].map(sx => kit.tube([[sx * 0.12, 0.27, 0.02], [sx * 0.145, 0.22, -0.06], [sx * 0.12, 0.12, -0.11]], 0.04, 0.01, HAIR, { top: HAIR_L, tex: 'bark' }, 5)),
  ])));
  // ---- руки: серебряное плечо, золотой налокотник, золотой наруч и латная перчатка
  const arm = sx => {
    const g = group([sx * 0.36, 0.53, 0], torso);
    g.add(M(merge([
      kit.lathe([[0.075, 0], [0.085, -0.1], [0.08, -0.3]], SIL, [0, 0, 0], 0, 1, S(SIL_L), 8),
      part(new THREE.CylinderGeometry(0.088, 0.088, 0.03, 8), GOLD, [0, -0.2, 0], 0, 1, G),
      part(new THREE.SphereGeometry(0.085, 8, 6), GOLD, [0, -0.33, 0], 0, 1, G),
      part(new THREE.ConeGeometry(0.06, 0.1, 4), GOLD_D, [sx * 0.05, -0.33, -0.04], [0, 0, sx * 1.7], [1, 1, 0.4], G),
    ])));
    const el = group([0, -0.33, 0], g);
    el.add(M(merge([
      kit.lathe([[0.07, 0], [0.08, -0.06], [0.1, -0.2], [0.105, -0.24]], GOLD, [0, 0, 0], 0, 1, G, 9),
      part(new THREE.CylinderGeometry(0.104, 0.104, 0.025, 9), GOLD_L, [0, -0.22, 0], 0, 1, G),
      kit.bbox(0.15, 0.15, 0.17, 0.035, GOLD, [0, -0.32, 0.01], 0, G),
      ...[0, 1].map(i => kit.bbox(0.16, 0.035, 0.06, 0.01, GOLD_D, [0, -0.38 - i * 0.025, 0.07 + i * 0.02], [0.4 + i * 0.3, 0, 0], G)),
    ])));
    g.elbow = el; return g;
  };
  const armR = arm(-1), armL = arm(1);
  const handR = group([0, -0.33, 0.02], armR.elbow), handL = group([0, -0.33, 0.02], armL.elbow);
  // ---- меч: широкий клинок с золотым долом, пламенная гарда, кожаная рукоять, навершие; +Y сокета — к острию
  const sword = group([0, 0, 0], handR);
  sword.add(M(merge([
    kit.bbox(0.035, 0.24, 0.035, 0.01, LEATHER, [0, -0.02, 0], 0, { top: 0x6a4428, tex: 'leather' }),
    part(new THREE.SphereGeometry(0.045, 8, 6), GOLD, [0, -0.17, 0], 0, [1, 1.2, 1], G),
    kit.bbox(0.4, 0.06, 0.07, 0.02, GOLD, [0, 0.12, 0], 0, G),
    ...[-1, 1].map(sx => kit.tube([[sx * 0.18, 0.12, 0], [sx * 0.26, 0.2, 0], [sx * 0.24, 0.32, 0], [sx * 0.17, 0.4, 0]], 0.04, 0.01, GOLD, G, 5)),
    ...[-1, 1].map(sx => kit.tube([[sx * 0.05, 0.14, 0], [sx * 0.1, 0.26, 0], [sx * 0.08, 0.36, 0]], 0.03, 0.008, GOLD_L, G, 4)),
    part(new THREE.OctahedronGeometry(0.04), 0x3a6aff, [0, 0.12, 0.04], 0, [1, 1.2, 0.5], { emit: true }),
    kit.bbox(0.14, 1.15, 0.03, 0.012, 0x9aa4b8, [0, 0.72, 0], 0, S(0xf4f8ff)),
    part(new THREE.ConeGeometry(0.1, 0.24, 4), 0x9aa4b8, [0, 1.41, 0], [0, Math.PI / 4, 0], [0.99, 1, 0.21], S(0xf4f8ff)),
    kit.bbox(0.03, 0.8, 0.036, 0.008, GOLD, [0, 0.58, 0], 0, G),                                       // золотой дол
  ])));
  // ---- ноги: кольчуга и серебряный набедренник, золотой наколенник, серебряная поножь, золотой сабатон
  const L1 = 0.46, L2 = 0.42;
  const leg = sx => {
    const g = group([sx * 0.16, HIP, 0], body);
    g.add(M(merge([
      kit.lathe([[0.1, 0.02], [0.115, -0.1], [0.095, -0.42]], MAIL, [0, 0, 0], 0, 1, { top: 0x4a5070, tex: 'cloth' }, 8),
      kit.lathe([[0.12, -0.05], [0.128, -0.16], [0.108, -0.36]], SIL, [0, 0, 0.012], 0, [1, 1, 1.05], S(SIL_L), 9),
    ])));
    const k = group([0, -L1, 0], g);
    k.add(M(merge([
      part(new THREE.SphereGeometry(0.1, 8, 6), GOLD, [0, 0, 0.055], 0, [1, 1.1, 0.9], G),
      part(new THREE.ConeGeometry(0.07, 0.1, 4), GOLD_D, [sx * 0.08, 0, 0.03], [0, 0, sx * 1.6], [1, 1, 0.4], G),
      kit.lathe([[0.075, -0.05], [0.098, -0.14], [0.092, -0.3], [0.082, -0.36]], SIL, [0, 0, 0.01], 0, [1, 1, 1.1], S(SIL_L), 9),
      part(new THREE.CylinderGeometry(0.086, 0.086, 0.025, 9), GOLD, [0, -0.35, 0.01], 0, [1, 1, 1.1], G),
    ])));
    const f = group([0, -L2, 0], k);
    f.add(M(merge([
      kit.bbox(0.17, 0.07, 0.3, 0.02, LEATHER, [0, -0.085, 0.06], 0, { top: 0x6a4428, tex: 'leather' }),
      kit.bbox(0.16, 0.11, 0.18, 0.03, GOLD_D, [0, -0.02, 0], 0, G),
      ...[0, 1].map(i => kit.bbox(0.15 - i * 0.015, 0.06, 0.09, 0.02, i ? GOLD_D : GOLD, [0, -0.04 - i * 0.012, 0.12 + i * 0.07], [0.25 + i * 0.1, 0, 0], G)),
    ])));
    g.knee = k; g.foot = f; return g;
  };
  const legL = leg(1), legR = leg(-1);
  // ---- плащ: открытый конус за спиной на своей кости (качается в покое), низ темнее
  const cape = group([0, 0.66, -0.06], torso);
  const capeG = new THREE.CylinderGeometry(0.27, 0.56, 1.5, 14, 6, true, Math.PI / 2 + 0.25, Math.PI - 0.5);
  { const p = capeG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), t = (0.75 - y) / 1.5; p.setZ(i, p.getZ(i) - 0.06 * t + Math.sin(x * 16) * 0.045 * t); } }
  cape.add(M(part(capeG, 0x0c1238, [0, -0.75, 0], 0, [1.12, 1, 0.78], C), capeMat));

  // ---- позы
  let ph = 0;
  const pose = (a, o = {}) => {
    const br = Math.sin(a.t * 1.7), sh = Math.sin(a.t * 0.6), sp = o.walk ? a.speed : 0;
    ph += a.dt * sp * 2.4; const s = Math.sin(ph) * Math.min(sp, 1.5) * 0.45;
    hips.position.set(sh * 0.02, HIP - 0.012 * (br * 0.5 + 0.5) + Math.abs(s) * 0.03, 0);
    hips.rotation.set(0, 0, sh * 0.025);
    torso.rotation.set(br * 0.018 + (o.lean || 0), sh * 0.03, -sh * 0.03);
    head.rotation.set(-br * 0.02 + (o.nod || 0), Math.sin(a.t * 0.35) * 0.12 + (o.turn || 0), sh * 0.02);
    // широкая стойка: ноги врозь, колени чуть согнуты
    for (const [lg, sx, w] of [[legL, 1, s], [legR, -1, -s]]) { lg.rotation.set(-0.05 + w, 0, sx * 0.07); lg.knee.rotation.x = 0.1 + Math.max(0, w) * 0.4; lg.foot.rotation.set(-0.05 - w * 0.3, 0, -sx * 0.07); }
    // правая рука опущена с мечом остриём вниз-вперёд, левая — кулак у бедра
    armR.rotation.set(-0.12 + (o.ar || 0) - s * 0.3, 0, -0.28 - br * 0.01); armR.elbow.rotation.x = -0.35 - (o.aer || 0);
    armL.rotation.set(0.05 + (o.al || 0) + s * 0.3, 0, 0.3 + br * 0.01); armL.elbow.rotation.x = -0.4 - (o.ael || 0);
    handR.rotation.set(2.85 + (o.hr || 0), 0.1, 0.55); handL.rotation.set(0, 0, 0);
    cape.rotation.set(0.06 + br * 0.015 + Math.sin(a.t * 1.1) * 0.025 + Math.abs(s) * 0.15, 0, Math.sin(a.t * 0.8) * 0.02);
    spin.rotation.set(0, 0, 0); spin.position.y = 0.95;
  };
  const anims = {
    idle: a => pose(a),
    walk: a => pose(a, { walk: true }),
    talk: a => { const g = Math.sin(a.t * 3.1) * 0.5 + 0.5; pose(a, { nod: Math.sin(a.t * 4.2) * 0.05, al: -0.5 - g * 0.4, ael: 0.6 + g * 0.3 }); },
    attack: a => { const w = smooth(a.k / 0.4) * (1 - smooth((a.k - 0.4) / 0.3)); pose(a, { ar: -2.2 * w, hr: -1.2 * w, lean: 0.15 * smooth((a.k - 0.4) / 0.3) }); },
    hit: a => pose(a, { lean: -0.25 * (1 - a.k), nod: 0.25 * (1 - a.k) }),
    cast: a => pose(a, { al: -1.4 * smooth(a.k / 0.5), aer: 0.3 }),
    death: a => { const e = smooth(a.k ?? 1); pose(a); spin.rotation.x = -Math.PI / 2 * 0.95 * e; spin.position.y = lerp(0.95, 0.25, e); },
  };
  return {
    root, height: 2.05, radius: 0.36, shadow: 1.4, materials: [mat, capeMat],
    sockets: { handR, handL, head },
    bones: { spin, body, hips, torso, head, armR, armL, elR: armR.elbow, elL: armL.elbow, legL, legR, kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot, handR, handL, cape },
    clips: { idle: { loop: true }, walk: { loop: true }, talk: { loop: true }, attack: { dur: 0.6, hit: 0.4 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 0.7, fire: 0.5 } },
    anims,
  };
} };
