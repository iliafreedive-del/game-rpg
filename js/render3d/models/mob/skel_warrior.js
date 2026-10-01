// Скелет-воин Палача Бездны: шлем-котелок, железный наплечник, ржавый меч и щит. Перенесено из lab/three/js/dark/mobs.js.
export default {
  id: 'skel_warrior', kind: 'mob', outline: 'mob',
  build(kit) {
    const { THREE, PAL, MOB, part, merge, ball, group, rig, pivot } = kit;
    const { clamp, smooth, lerp, footTarget, legIK } = rig;
    const BONE = MOB.bone, BONE_D = MOB.boneD, RUST = MOB.rust, IRON = MOB.iron, DARKS = MOB.dark, EYE = MOB.eye;
    const mat = kit.mat({ rim: MOB.rim, rimColor: MOB.rimColor.skel });
    const M = g => new THREE.Mesh(g, mat);
    const root = new THREE.Group();
    const { spin, body: rigG } = pivot(root, 0.5);

    const body = group([0, 0.85, 0], rigG);
    body.add(M(merge([
      part(new THREE.BoxGeometry(0.32, 0.14, 0.2), BONE_D, [0, 0, 0], 0, 1, { top: BONE }),
      part(new THREE.CylinderGeometry(0.04, 0.045, 0.55, 6), BONE_D, [0, 0.3, -0.04]),
      ...[0.22, 0.32, 0.42, 0.52].map((y, i) => part(new THREE.TorusGeometry(0.2 - i * 0.012, 0.03, 5, 12, Math.PI * 1.55), BONE, [0, y, 0], [Math.PI / 2, 0, Math.PI * 0.725], [1, 0.85, 1])),
      part(new THREE.BoxGeometry(0.54, 0.07, 0.12), BONE_D, [0, 0.64, 0], 0, 1, { top: BONE }),
      part(new THREE.SphereGeometry(0.17, 10, 8), IRON, [0.34, 0.64, 0], 0, [1.1, 0.8, 1.1], { top: 0x9aa3bd }),
      part(new THREE.TorusGeometry(0.16, 0.025, 4, 12), PAL.brassD, [0.34, 0.58, 0], [Math.PI / 2, 0, 0]),
      ball(0.1, BONE, [-0.34, 0.64, 0], [1, 0.9, 1]), part(new THREE.ConeGeometry(0.04, 0.2, 5), BONE, [-0.4, 0.74, 0], [0, 0, 0.5]),
      part(new THREE.BoxGeometry(0.3, 0.38, 0.05), 0x2a1d44, [0, -0.17, 0.08], 0, 1, { top: 0x4a3578 }),
    ])));
    const head = group([0, 0.68, 0], body);
    head.add(M(merge([
      ball(0.21, BONE, [0, 0.2, 0], [1, 1, 1.05], { top: 0xfff6e2 }),
      part(new THREE.BoxGeometry(0.22, 0.08, 0.16), BONE_D, [0, 0.03, 0.06], 0, 1, { top: BONE }),
      ball(0.065, DARKS, [0.085, 0.19, 0.17], [1, 1.15, 0.6]), ball(0.065, DARKS, [-0.085, 0.19, 0.17], [1, 1.15, 0.6]),
      ball(0.032, EYE, [0.085, 0.19, 0.205], 1, { emit: true }), ball(0.032, EYE, [-0.085, 0.19, 0.205], 1, { emit: true }),
      part(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), RUST, [0, 0.24, 0], 0, [1, 0.95, 1.05], { top: 0x8f6a52 }),
      part(new THREE.TorusGeometry(0.235, 0.025, 4, 14), PAL.brassD, [0, 0.24, 0], [Math.PI / 2, 0, 0]),
      part(new THREE.BoxGeometry(0.04, 0.14, 0.26), PAL.brass, [0, 0.46, 0]),
    ])));
    const armPart = () => merge([part(new THREE.CapsuleGeometry(0.04, 0.2, 2, 6), BONE, [0, -0.17, 0]), ball(0.055, BONE_D, [0, -0.34, 0])]);
    const forePart = () => merge([part(new THREE.CapsuleGeometry(0.035, 0.2, 2, 6), BONE, [0, -0.17, 0]), ball(0.075, BONE, [0, -0.38, 0])]);
    const armR = group([-0.36, 0.62, 0], body); armR.add(M(armPart())); const elR = group([0, -0.34, 0], armR); elR.add(M(forePart()));
    const armL = group([0.36, 0.62, 0], body); armL.add(M(armPart())); const elL = group([0, -0.34, 0], armL); elL.add(M(forePart()));
    const handR = group([0, -0.38, 0.03], elR); handR.rotation.x = 1.3;
    const handL = group([0.1, -0.3, 0.1], elL); handL.rotation.y = -0.4;

    const SP = { L1: 0.4, L2: 0.38, ankle: 0.07, hip: 0.9, stride: 0.5, lift: 0.14, cyc: 1.2 };
    const mkLeg = x => {
      const g = group([x, SP.hip, 0], rigG); g.add(M(merge([ball(0.06, BONE_D, [0, 0, 0]), part(new THREE.CapsuleGeometry(0.045, 0.24, 2, 6), BONE, [0, -0.2, 0])])));
      const k = group([0, -SP.L1, 0], g); k.add(M(merge([ball(0.06, BONE_D, [0, 0, 0.015]), part(new THREE.CapsuleGeometry(0.04, 0.22, 2, 6), BONE, [0, -0.2, 0])])));
      const f = group([0, -SP.L2, 0], k); f.add(M(merge([part(new THREE.BoxGeometry(0.1, 0.07, 0.22), BONE_D, [0, -0.03, 0.05], 0, 1, { top: BONE })])));
      g.knee = k; g.foot = f; return g;
    };
    const legL = mkLeg(0.12), legR = mkLeg(-0.12);

    let gp = Math.random();
    // wu — замах (0..1), lu — выпад (0..1); walk: sp — скорость
    function solve(a, sp, wu, lu, hurt = 0) {
      const w = clamp(sp / 1.6), cyc = clamp(sp / (SP.cyc * 3.2), 0, 1);
      if (sp > 0.25) gp = (gp + a.dt * sp / 1.25) % 1;
      const th = gp * 6.283;
      const hipY = SP.hip - 0.05 * w + 0.025 * w * Math.abs(Math.cos(th - 1.9)) - wu * 0.08 + lu * 0.03;
      [[legR, 0], [legL, 0.5]].forEach(([lg, off], i) => {
        const ft = footTarget(gp + off, SP.stride * (0.5 + 0.5 * cyc), SP.lift);
        let dz = ft.z * w + (i ? -0.03 : 0.03) * (1 - w); const lift = ft.y * w;
        dz += (i === 0 ? 0.18 : -0.1) * wu + (i === 0 ? 0.25 : -0.15) * lu;
        lg.position.y = hipY; legIK(lg, lg.knee, lg.foot, SP.L1, SP.L2, hipY - SP.ankle, dz, lift, ft.pitch * w);
      });
      body.position.y = hipY - 0.02 + Math.sin(a.t * 3) * 0.008;
      body.rotation.set(0.08 * w - wu * 0.3 + lu * 0.45 - hurt * 0.35, Math.cos(th) * 0.15 * w + wu * 0.5 - lu * 0.7, Math.sin(th) * 0.06 * w);
      head.rotation.set(-wu * 0.25 + hurt * 0.3, -body.rotation.y * 0.6, Math.sin(a.t * 2.1) * 0.1);
      armL.rotation.set(Math.cos(th) * 0.5 * w - 0.2 - wu * 0.5 - hurt * 0.5, 0, 0.15); elL.rotation.x = -0.6 - wu * 0.6;
      armR.rotation.set(-Math.cos(th) * 0.4 * w - 0.2 - wu * 2.6 + lu * 2.9, 0, -0.2 - wu * 0.5 + lu * 0.7); elR.rotation.x = -0.5 - wu * 1.1 + lu * 0.9;
      spin.rotation.set(0, 0, 0); spin.position.y = 0.5;
    }
    const HIT = 0.5;
    const anims = {
      idle: a => solve(a, 0, 0, 0),
      walk: a => solve(a, a.speed, 0, 0),
      attack: a => {
        const k = a.k, wu = smooth(k / HIT) * (1 - smooth((k - HIT) / 0.12)), lu = smooth((k - HIT + 0.05) / 0.1) * (1 - smooth((k - HIT) / (1 - HIT)));
        solve(a, 0, wu, lu);
      },
      hit: a => solve(a, 0, 0, 0, 1 - a.k),
      cast: a => solve(a, 0, smooth(a.k / 0.5), 0),
      death: a => {   // рассыпается: оседает, заваливается назад
        const e = smooth(Math.min(1, (a.k ?? 1) / 0.7));
        solve(a, 0, 0, 0, 0.8 * (1 - e)); spin.rotation.x = -Math.PI / 2 * 0.96 * e; spin.position.y = lerp(0.5, 0.18, e);
        legL.position.y = legR.position.y = 0.7; armR.rotation.x = -0.4; armL.rotation.z = 0.9 * e;
      },
    };
    return {
      root, height: 2.0, radius: 0.34, shadow: 1.2, materials: [mat],
      sockets: { handR, handL, head },
      bones: { spin, body, head, armR, armL, elR, elL, legL, legR, kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot, handR, handL },
      clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.6, hit: HIT }, hit: { dur: 0.25 }, death: { dur: 1.0 }, cast: { dur: 0.7, fire: 0.5 } },
      anims,
      defaultWeapons: { handR: 'sword_rust', handL: 'shield_bone' },
    };
  },
};
