// Босс «Палач Бездны»: великан ≈ 3,3 м в капюшоне палача и железной маске со светом Бездны, бочкообразный торс с ядром Бездны
// в груди, цепи, кожаный фартук с черепами, шипастый наплечник, огромная двуручная секира. Клипы: attack (рубящий сверху),
// attack2 (горизонтальный размах), slam (удар двумя руками в землю), roar (рёв, фаза), cast = roar.
export default {
  id: 'boss', kind: 'mob', outline: 'mob',
  build(kit) {
    const { THREE, PAL, MOB, part, merge, ball, group, rig, pivot } = kit;
    const { clamp, smooth, lerp, footTarget, legIK } = rig;
    const SK = 0x463c56, SKL = 0x8a7a9a, HOOD = 0x2a1418, HOODL = 0x5a2a30, IR = 0x2a2a34, IRL = 0x7a7a8a, LE = 0x3a2418, LEL = 0x6a4428;
    const mat = kit.mat({ rim: 0.75, rimColor: 0xc9aaff });
    const M = g => new THREE.Mesh(g, mat), S = { top: SKL }, I = { top: IRL, tex: 'metal' }, C = { top: HOODL, tex: 'cloth' }, Lt = { top: LEL, tex: 'cloth' };
    const root = new THREE.Group(), { spin, body: rg } = pivot(root, 0.9);
    const hips = group([0, 1.0, 0], rg);
    const torso = M(merge([
      kit.lathe([[0.26, -0.05], [0.34, 0.15], [0.44, 0.45], [0.46, 0.65], [0.38, 0.85], [0.2, 0.95]], SK, [0, 0, 0], 0, [1.15, 1, 0.85], S, 14),
      ...[[0.2, 0.55], [-0.2, 0.55], [0, 0.3]].map(([x, y]) => part(new THREE.SphereGeometry(0.16, 8, 6), SK, [x, y, 0.28], 0, [1.2, 0.8, 0.5], S)),
      // ядро Бездны в груди в железной оправе и светящиеся жилы
      part(new THREE.TorusGeometry(0.13, 0.03, 5, 14), IR, [0, 0.62, 0.36], 0, 1, I), part(new THREE.IcosahedronGeometry(0.1, 1), PAL.abyss, [0, 0.62, 0.36], 0, [1, 1, 0.6], { emit: true }),
      ...[[0.25, 0.45, 0.6], [-0.25, 0.45, -0.6], [0.1, 0.3, 0.3]].map(([x, y, a]) => part(new THREE.BoxGeometry(0.025, 0.28, 0.02), PAL.abyssD, [x, y, 0.37], [0, 0, a], 1, { emit: true })),
      // цепи наискось через грудь
      ...Array.from({ length: 9 }, (_, i) => part(new THREE.TorusGeometry(0.04, 0.012, 4, 8), IR, [-0.38 + i * 0.095, 0.85 - i * 0.075, 0.33 + Math.sin(i / 8 * Math.PI) * 0.05], [0, i % 2 ? Math.PI / 2 : 0, 0.7], 1, I)),
      // пояс, фартук палача, черепа на поясе
      kit.lathe([[0.36, -0.08], [0.38, 0.0], [0.38, 0.1], [0.36, 0.14]], LE, [0, 0, 0], 0, [1.15, 1, 0.9], Lt, 14),
      kit.bbox(0.18, 0.16, 0.05, 0.02, PAL.brassD, [0, 0.03, 0.36], 0, { top: PAL.brass }),
      kit.bbox(0.55, 0.9, 0.05, 0.02, LE, [0, -0.5, 0.32], [0.08, 0, 0], Lt),
      ...[-0.3, 0.3].map(x => part(new THREE.SphereGeometry(0.08, 8, 6), MOB.boneD, [x, -0.05, 0.36], 0, [1, 0.95, 1.1], { top: MOB.bone })),
      // наплечник на левом плече (шипы), на правом — ремни
      part(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), IR, [0.52, 0.8, 0], [0, 0, -0.35], [1.1, 0.9, 1.15], I),
      ...[0, 1, 2].map(i => part(new THREE.ConeGeometry(0.06, 0.32, 5), MOB.boneD, [0.48 + i * 0.1, 1.02 - i * 0.04, -0.08 + i * 0.08], [0, 0, -0.5 - i * 0.2], 1, { top: MOB.bone })),
      kit.bbox(0.1, 0.9, 0.04, 0.01, LE, [-0.3, 0.55, 0.33], [0.05, 0, -0.5], Lt),
    ]));
    hips.add(torso);
    const head = group([0, 0.95, 0.04], torso);
    head.add(M(merge([
      kit.lathe([[0.0, 0.62], [0.16, 0.56], [0.28, 0.4], [0.3, 0.18], [0.28, -0.05], [0.36, -0.12]], HOOD, [0, 0, -0.03], 0, [1, 1, 1.05], C, 12),
      kit.lathe([[0.0, 0.38], [0.17, 0.33], [0.2, 0.15], [0.17, -0.02]], IR, [0, 0, 0.1], 0, [1, 1, 0.75], I, 10),
      ...[-1, 1].map(sx => part(new THREE.BoxGeometry(0.09, 0.03, 0.03), PAL.abyss, [sx * 0.08, 0.22, 0.24], 0, 1, { emit: true })),
      ...[0, 1, 2].map(i => part(new THREE.BoxGeometry(0.025, 0.08, 0.02), 0x07050f, [-0.05 + i * 0.05, 0.06, 0.24])),
      ...Array.from({ length: 6 }, (_, i) => part(new THREE.SphereGeometry(0.018, 4, 3), IRL, [Math.cos(i / 5 * Math.PI) * 0.17, 0.15 + Math.sin(i / 5 * Math.PI) * 0.18, 0.2])),
    ])));
    const arm = sd => {
      const g = group([sd * 0.6, 0.75, 0], torso);
      g.add(M(merge([part(new THREE.SphereGeometry(0.2, 10, 8), SK, [0, -0.05, 0], 0, 1, S), kit.tube([[0, 0, 0], [0, -0.25, 0.02], [0, -0.5, 0]], 0.17, 0.13, SK, S, 8)])));
      const el = group([0, -0.52, 0], g);
      el.add(M(merge([kit.lathe([[0.12, 0], [0.15, -0.12], [0.17, -0.35], [0.15, -0.42]], LE, [0, 0, 0], 0, 1, Lt, 9), ...[0.12, 0.3].map(y => part(new THREE.TorusGeometry(0.16, 0.02, 4, 10), IR, [0, -y, 0], [Math.PI / 2, 0, 0], 1, I)),
        kit.bbox(0.24, 0.22, 0.26, 0.06, SK, [0, -0.55, 0.02], 0, S)])));
      g.elbow = el; return g;
    };
    const armR = arm(-1), armL = arm(1);
    const handR = group([0, -0.58, 0.05], armR.elbow); handR.rotation.x = 1.2;
    const handL = group([0, -0.58, 0.05], armL.elbow);
    const L1 = 0.5, L2 = 0.48, ANK = 0.12;
    const leg = sd => {
      const g = group([sd * 0.24, 1.0, 0], rg);
      g.add(M(merge([kit.lathe([[0.2, 0.05], [0.22, -0.15], [0.17, -0.45]], HOOD, [0, 0, 0], 0, 1, C, 9)])));
      const k = group([0, -L1, 0], g);
      k.add(M(merge([part(new THREE.SphereGeometry(0.14, 8, 6), IR, [0, 0, 0.06], 0, 1, I), kit.lathe([[0.15, -0.05], [0.16, -0.2], [0.13, -0.42]], LE, [0, 0, 0], 0, 1, Lt, 9)])));
      const f = group([0, -L2, 0], k);
      f.add(M(merge([kit.bbox(0.26, 0.14, 0.4, 0.05, LE, [0, -0.06, 0.08], 0, Lt), kit.bbox(0.24, 0.06, 0.16, 0.02, IR, [0, 0.02, 0.2], 0, I)])));
      g.knee = k; g.foot = f; return g;
    };
    const legL = leg(1), legR = leg(-1);
    let gp = Math.random();
    // up — замах над головой, dn — удар вниз, sw — горизонтальный размах, roar — рёв, hurt
    function solve(a, sp, o = {}) {
      const up = o.up || 0, dn = o.dn || 0, sw = o.sw || 0, ro = o.roar || 0, hurt = o.hurt || 0, two = o.two || 0;
      const w = clamp(sp / 1.8); if (sp > 0.25) gp = (gp + a.dt * sp / 1.6) % 1;
      const th = gp * 6.283, br = Math.sin(a.t * 1.4);
      const hipY = 1.0 - 0.06 * w - dn * 0.18 - ro * 0.05 + br * 0.01;
      [[legR, 0], [legL, 0.5]].forEach(([lg, off], i) => {
        const ft = footTarget(gp + off, 0.7, 0.18); let dz = ft.z * w + (i ? -0.08 : 0.1) * (1 - w) + (i ? -0.2 : 0.25) * (dn + sw * 0.5); const lift = ft.y * w;
        lg.position.y = hipY; legIK(lg, lg.knee, lg.foot, L1, L2, hipY - ANK, dz, lift, ft.pitch * w);
      });
      hips.position.y = hipY; hips.rotation.y = Math.sin(th) * 0.1 * w + sw * 0.6 - (o.swk || 0) * 1.4;
      torso.rotation.x = 0.12 + 0.1 * w - up * 0.3 + dn * 0.55 - ro * 0.35 - hurt * 0.3; torso.rotation.y = -Math.sin(th) * 0.12 * w;
      head.rotation.x = -ro * 0.5 + up * 0.2 + Math.sin(a.t * 0.9) * 0.03;
      const swing = Math.cos(th) * 0.45 * w;
      armR.rotation.set(-swing - 0.25 - up * 2.7 + dn * 2.4 - sw * 1.2, 0, -0.25 - ro * 0.9 - sw * 0.6); armR.elbow.rotation.x = -0.5 - up * 0.6 + dn * 0.4;
      armL.rotation.set(swing - 0.2 - up * 2.5 * two + dn * 2.2 * two, 0, 0.25 + ro * 0.9 - 0.3 * two); armL.elbow.rotation.x = -0.6 - up * 0.5 * two;
      handR.rotation.x = 1.2 - up * 0.6 + dn * 0.3;
      spin.rotation.set(0, 0, 0); spin.position.y = 0.9;
    }
    const hitK = (k, h) => ({ up: smooth(k / h) * (1 - smooth((k - h) / 0.1)), dn: smooth((k - h + 0.06) / 0.1) * (1 - smooth((k - h - 0.1) / (1 - h))) });
    const anims = {
      idle: a => solve(a, 0), walk: a => solve(a, a.speed),
      attack: a => solve(a, 0, hitK(a.k, 0.55)),
      attack2: a => { const k = a.k; solve(a, 0, { sw: smooth(k / 0.5) * (1 - smooth((k - 0.5) / 0.12)), swk: smooth((k - 0.45) / 0.15) * (1 - smooth((k - 0.65) / 0.35)) }); },
      slam: a => solve(a, 0, { ...hitK(a.k, 0.6), two: 1 }),
      roar: a => solve(a, 0, { roar: smooth(a.k / 0.25) * (1 - smooth((a.k - 0.8) / 0.2)) }),
      cast: a => solve(a, 0, { roar: smooth(a.k / 0.25) * (1 - smooth((a.k - 0.8) / 0.2)) }),
      hit: a => solve(a, 0, { hurt: 1 - a.k }),
      death: a => { const e = smooth(Math.min(1, (a.k ?? 1) / 0.75)); solve(a, 0, { hurt: 0.5, dn: 0.4 * e }); spin.rotation.x = -Math.PI / 2 * 0.95 * e; spin.position.y = lerp(0.9, 0.35, e); },
    };
    root.scale.setScalar(1.45);
    return {
      root, height: 3.3, radius: 0.75, shadow: 2.8, materials: [mat],
      sockets: { handR, handL, head },
      bones: { spin, hips, torso, head, armR, armL, elR: armR.elbow, elL: armL.elbow, legL, legR, kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot, handR, handL },
      clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.9, hit: 0.6 }, attack2: { dur: 0.9, hit: 0.55 }, slam: { dur: 1.1, hit: 0.65 }, roar: { dur: 1.2 }, hit: { dur: 0.3 }, death: { dur: 1.4 }, cast: { dur: 1.0, fire: 0.5 } },
      anims, defaultWeapons: { handR: 'axe_great' },
    };
  },
};
