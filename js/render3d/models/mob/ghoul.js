// Упырь: сутулый, длинные руки до колен, широкая пасть, быстрый. Перенесено из lab/three/js/dark/mobs.js.
export default {
  id: 'ghoul', kind: 'mob', outline: 'mob',
  build(kit) {
    const { THREE, PAL, MOB, part, merge, ball, group, rig, pivot } = kit;
    const { clamp, smooth, lerp, footTarget, legIK } = rig;
    const BONE = MOB.bone, BONE_D = MOB.boneD, DARKS = MOB.dark, SKIN = MOB.skin, SKIN_L = MOB.skinL;
    const mat = kit.mat({ rim: MOB.rim, rimColor: MOB.rimColor.ghoul });
    const M = g => new THREE.Mesh(g, mat);
    const root = new THREE.Group();
    const { spin, body: rigG } = pivot(root, 0.5);

    const body = group([0, 0.78, 0], rigG);
    body.add(M(merge([
      ball(0.27, SKIN, [0, 0.3, 0], [1.05, 1.25, 0.8], { top: SKIN_L }),
      ball(0.18, SKIN, [0, 0.0, 0.02], [1.1, 0.8, 0.9]),
      ...[0, 1, 2, 3, 4].map(i => part(new THREE.ConeGeometry(0.045, 0.16 - i * 0.012, 5), BONE, [0, 0.55 - i * 0.12, -0.2 - i * 0.012], [-0.6, 0, 0])),
      ...[0.3, 0.45].map(y => part(new THREE.TorusGeometry(0.2, 0.02, 4, 10, Math.PI), BONE_D, [0, y, 0.12], [0, 0, Math.PI], [1, 0.8, 0.6])),
      part(new THREE.BoxGeometry(0.34, 0.3, 0.05), 0x3a2a3a, [0, -0.15, 0.1], 0, 1, { top: 0x5a4458 }),
    ])));
    const head = group([0, 0.52, 0.12], body);
    head.add(M(merge([
      ball(0.17, SKIN, [0, 0.14, 0], [0.95, 1.25, 1.05], { top: SKIN_L }),
      part(new THREE.BoxGeometry(0.24, 0.1, 0.14), DARKS, [0, 0.03, 0.12]),
      ...[-0.08, -0.03, 0.03, 0.08].map(x => part(new THREE.ConeGeometry(0.014, 0.05, 4), BONE, [x, 0.065, 0.19], [Math.PI, 0, 0])),
      ...[-0.07, 0, 0.07].map(x => part(new THREE.ConeGeometry(0.012, 0.04, 4), BONE, [x, -0.01, 0.19])),
      ball(0.045, MOB.ghoulEye, [0.075, 0.2, 0.15], [1, 1, 0.6], { emit: true }), ball(0.045, MOB.ghoulEye, [-0.075, 0.2, 0.15], [1, 1, 0.6], { emit: true }),
      ball(0.02, DARKS, [0.075, 0.2, 0.185], [1, 2, 1]), ball(0.02, DARKS, [-0.075, 0.2, 0.185], [1, 2, 1]),
      part(new THREE.ConeGeometry(0.05, 0.08, 4), SKIN, [0, 0.17, 0.17], [Math.PI / 2, 0, 0], 1, { top: SKIN_L }),
    ])));
    const armPart = () => merge([part(new THREE.CapsuleGeometry(0.06, 0.3, 3, 6), SKIN, [0, -0.25, 0], 0, 1, { top: SKIN_L }), ball(0.07, SKIN, [0, -0.48, 0])]);
    const forePart = () => merge([part(new THREE.CapsuleGeometry(0.05, 0.36, 3, 6), SKIN, [0, -0.25, 0], 0, 1, { top: SKIN_L }), ball(0.085, SKIN, [0, -0.5, 0.02]),
      ...[-0.04, 0, 0.04].map(x => part(new THREE.ConeGeometry(0.018, 0.17, 4), BONE, [x, -0.6, 0.04], [Math.PI + 0.25, 0, x * 3]))]);
    const armR = group([-0.3, 0.45, 0.05], body); armR.add(M(armPart())); const elR = group([0, -0.5, 0], armR); elR.add(M(forePart()));
    const armL = group([0.3, 0.45, 0.05], body); armL.add(M(armPart())); const elL = group([0, -0.5, 0], armL); elL.add(M(forePart()));

    const SP = { L1: 0.36, L2: 0.36, ankle: 0.06, hip: 0.72, stride: 0.6, lift: 0.16, cyc: 1.0 };
    const mkLeg = x => {
      const g = group([x, SP.hip, 0], rigG); g.add(M(merge([ball(0.09, SKIN, [0, 0, 0]), part(new THREE.CapsuleGeometry(0.075, 0.18, 3, 6), SKIN, [0, -0.17, 0])])));
      const k = group([0, -SP.L1, 0], g); k.add(M(merge([ball(0.07, SKIN, [0, 0, 0]), part(new THREE.CapsuleGeometry(0.055, 0.2, 3, 6), SKIN, [0, -0.18, 0], [0.15, 0, 0])])));
      const f = group([0, -SP.L2, 0], k); f.add(M(merge([part(new THREE.BoxGeometry(0.12, 0.06, 0.24), SKIN_L, [0, -0.03, 0.07])])));
      g.knee = k; g.foot = f; return g;
    };
    const legL = mkLeg(0.13), legR = mkLeg(-0.13);

    let gp = Math.random();
    function solve(a, sp, wu, lu, hurt = 0) {
      const w = clamp(sp / 1.6), cyc = clamp(sp / (SP.cyc * 3.2), 0, 1);
      if (sp > 0.25) gp = (gp + a.dt * sp / 1.5) % 1;
      const th = gp * 6.283, s = Math.sin(th);
      const hipY = SP.hip - 0.05 * w + 0.025 * w * Math.abs(Math.cos(th - 1.9)) - wu * 0.08 + lu * 0.03;
      [[legR, 0], [legL, 0.5]].forEach(([lg, off], i) => {
        const ft = footTarget(gp + off, SP.stride * (0.5 + 0.5 * cyc), SP.lift);
        let dz = ft.z * w + (i ? -0.03 : 0.03) * (1 - w); const lift = ft.y * w;
        dz += (i === 0 ? 0.18 : -0.1) * wu + (i === 0 ? 0.25 : -0.15) * lu;
        lg.position.y = hipY; legIK(lg, lg.knee, lg.foot, SP.L1, SP.L2, hipY - SP.ankle, dz, lift, ft.pitch * w);
      });
      body.rotation.set(0.6 + 0.08 * w + wu * 0.4 - lu * 0.5 - hurt * 0.4, Math.cos(th) * 0.2 * w, Math.sin(th) * 0.12 * w); body.position.y = hipY + 0.02 - wu * 0.08;
      head.rotation.set(-0.45 - wu * 0.2 + hurt * 0.3, -body.rotation.y * 0.5, Math.sin(a.t * 2.4) * 0.08);
      armL.rotation.set(-s * 0.8 * w - 0.4 - wu * 1.3 + lu * 1.9, 0, 0.2 + wu * 0.25); armR.rotation.set(s * 0.8 * w - 0.4 - wu * 1.3 + lu * 1.9, 0, -0.2 - wu * 0.25);
      elL.rotation.x = elR.rotation.x = -0.5 - 0.4 * w - wu * 0.5 + lu * 0.7;
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
      death: a => {
        const e = smooth(Math.min(1, (a.k ?? 1) / 0.6));
        solve(a, 0, 0, 0, 0.8 * (1 - e)); spin.rotation.x = -Math.PI / 2 * 0.95 * e; spin.position.y = lerp(0.5, 0.2, e);
        armL.rotation.z = 1.0 * e; armR.rotation.z = -1.0 * e;
      },
    };
    return {
      root, height: 1.7, radius: 0.3, shadow: 1.0, materials: [mat],
      sockets: { head },
      bones: { spin, body, head, armR, armL, elR, elL, legL, legR, kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot },
      clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.5, hit: HIT }, hit: { dur: 0.25 }, death: { dur: 0.9 }, cast: { dur: 0.6, fire: 0.5 } },
      anims,
    };
  },
};
