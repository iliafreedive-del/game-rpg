// Герой-воин «Рыцарь Ордена»: рогатый рыцарь 1:4 (голова 0,5 м из 2,0 м), наплечники, светящийся визор, плащ на Verlet.
// Перенесено из lab/three/js/dark/hero.js в формат модели (docs/MODEL_SPEC.md): оружие и щит — не часть модели, а надеваются в сокеты.
export default {
  id: 'warrior', kind: 'hero', outline: 'hero',
  build(kit) {
    const { THREE, PAL, HERO, part, merge, group, rig } = kit;
    const { clamp, smooth, easeOut, lerp, footTarget, legIK } = rig;
    const STEEL = HERO.steel, STEEL_L = HERO.steelL, STEEL_D = HERO.steelD, DARK = HERO.dark, BONE = PAL.bone, BONE_D = PAL.boneD, BR = PAL.brass, BR_D = PAL.brassD;
    const mat = kit.mat({ rim: HERO.rim, rimColor: HERO.rimColor });
    const M = g => new THREE.Mesh(g, mat);

    const root = new THREE.Group();
    const spin = group([0, 0.9, 0], root);            // ось падения/кувырка на высоте таза; в обычных клипах не вращается
    const body = group([0, -0.9, 0], spin);
    const hips = group([0, 0.97, 0], body);
    const torso = M(merge([
      part(new THREE.CylinderGeometry(0.17, 0.2, 0.24, 10), DARK, [0, 0.1, 0]),
      part(new THREE.SphereGeometry(0.3, 14, 10), STEEL, [0, 0.42, 0], 0, [1.1, 1, 0.78], { top: STEEL_L, y0: 0.15, y1: 0.72 }),
      part(new THREE.CylinderGeometry(0.235, 0.215, 0.1, 12), BR_D, [0, 0.05, 0], 0, 1, { top: BR }),
      part(new THREE.BoxGeometry(0.1, 0.1, 0.04), BR, [0, 0.05, 0.22], [0, 0, Math.PI / 4]),
      part(new THREE.BoxGeometry(0.34, 0.62, 0.05), 0x35205f, [0, -0.2, 0.2], [0.06, 0, 0], 1, { top: 0x7a4cd8 }),
      part(new THREE.BoxGeometry(0.1, 0.1, 0.02), BR, [0, 0.32, 0.245], [0, 0, Math.PI / 4]),
      part(new THREE.BoxGeometry(0.03, 0.18, 0.02), PAL.abyss, [0, 0.32, 0.257], 0, 1, { emit: true }),
      part(new THREE.CylinderGeometry(0.15, 0.2, 0.12, 10), STEEL_D, [0, 0.68, 0], 0, 1, { top: STEEL }),
      ...[-1, 1].flatMap(sx => [
        part(new THREE.SphereGeometry(0.235, 14, 10), STEEL, [sx * 0.46, 0.58, 0], 0, [1.05, 0.78, 1.1], { top: STEEL_L }),
        part(new THREE.TorusGeometry(0.205, 0.028, 5, 14), BR, [sx * 0.46, 0.5, 0], [Math.PI / 2, 0, 0], [1.02, 1.1, 1]),
        part(new THREE.ConeGeometry(0.075, 0.3, 6), BONE, [sx * 0.55, 0.8, 0], [0, 0, -sx * 0.5], 1, { top: 0xffffff }),
      ]),
    ]));
    hips.add(torso);

    const head = group([0, 0.7, 0], torso);
    head.add(M(merge([
      part(new THREE.SphereGeometry(0.255, 18, 14), STEEL, [0, 0.22, 0], 0, [1, 1.0, 1.05], { top: STEEL_L }),
      part(new THREE.CylinderGeometry(0.262, 0.25, 0.06, 18), BR, [0, 0.07, 0]),
      part(new THREE.BoxGeometry(0.04, 0.2, 0.46), BR, [0, 0.45, -0.02], [0.1, 0, 0], 1, { top: 0xf0c868 }),
      part(new THREE.BoxGeometry(0.34, 0.09, 0.1), 0x07050f, [0, 0.22, 0.225]),
      part(new THREE.BoxGeometry(0.085, 0.045, 0.02), 0xe9dcff, [0.085, 0.22, 0.275], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.085, 0.045, 0.02), 0xe9dcff, [-0.085, 0.22, 0.275], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.035, 0.15, 0.04), DARK, [0, 0.12, 0.25]),
      ...[-1, 1].flatMap(sx => [
        part(new THREE.ConeGeometry(0.075, 0.34, 8), BONE_D, [sx * 0.3, 0.32, 0], [0, 0, -sx * 1.15], 1, { top: BONE }),
        part(new THREE.ConeGeometry(0.06, 0.34, 8), BONE_D, [sx * 0.48, 0.5, 0], [0, 0, sx * 0.1], 1, { top: 0xffffff }),
      ]),
    ])));

    const arm = side => {
      const g = group([side * 0.46, 0.52, 0], torso);
      g.add(M(merge([part(new THREE.CapsuleGeometry(0.08, 0.2, 3, 8), DARK, [0, -0.17, 0]), part(new THREE.SphereGeometry(0.09, 8, 6), STEEL_D, [0, -0.35, 0])])));
      const el = group([0, -0.35, 0], g);
      el.add(M(merge([
        part(new THREE.CapsuleGeometry(0.07, 0.2, 3, 8), DARK, [0, -0.15, 0]),
        part(new THREE.CylinderGeometry(0.1, 0.085, 0.22, 8), STEEL, [0, -0.19, 0], 0, 1, { top: STEEL_L }),
        part(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8), BR, [0, -0.09, 0]),
        part(new THREE.SphereGeometry(0.125, 10, 8), STEEL, [0, -0.36, 0], 0, [1, 0.95, 1.1], { top: STEEL_L }),
      ])));
      g.elbow = el; return g;
    };
    const armR = arm(-1), armL = arm(1);
    // сокеты: +Y смотрит туда, куда направлено оружие в руке (кончик клинка), +Z — «вперёд» от героя; щит — нормаль грани по +X
    const handR = group([0, -0.36, 0.03], armR.elbow); handR.rotation.x = 1.25;
    const handL = group([0.12, -0.3, 0.1], armL.elbow); handL.rotation.y = -0.5;
    const back = group([0, 0.3, -0.3], torso);

    const L1 = 0.44, L2 = 0.43, ANKLE = 0.115;
    const leg = side => {
      const g = group([side * 0.15, 0.97, 0], body);
      g.add(M(merge([part(new THREE.CapsuleGeometry(0.095, 0.26, 3, 8), DARK, [0, -0.2, 0]), part(new THREE.SphereGeometry(0.11, 8, 6), STEEL_D, [0, -0.02, 0])])));
      const k = group([0, -L1, 0], g);
      k.add(M(merge([part(new THREE.SphereGeometry(0.105, 8, 6), BR_D, [0, 0, 0.06], 0, 1, { top: BR }), part(new THREE.CapsuleGeometry(0.078, 0.26, 3, 8), STEEL, [0, -0.2, 0], 0, 1, { top: STEEL_L })])));
      const f = group([0, -L2, 0], k);
      f.add(M(merge([part(new THREE.BoxGeometry(0.18, 0.15, 0.32), STEEL_D, [0, -0.045, 0.07], 0, 1, { top: STEEL })])));
      g.knee = k; g.foot = f; return g;
    };
    const legL = leg(1), legR = leg(-1);

    // плащ крепится к торсу и живёт в мировых координатах сцены
    const cape = new kit.Cape(kit.scene, HERO.cape, { len: 1.25, top: 0.78, bottom: 1.15, R: 0.34, back: -0.27, bodyTop: 1.75, backMin: 0.75, hem: HERO.capeHem });
    const capeAnchor = group([0, 0.64, -0.26], torso);

    // ---------------- поза: одна функция на все клипы ----------------
    const ST = HERO.stanceFraction, S = { phase: 0, bank: 0, yaw: 0 };
    // r — «бежит» 0..1, sp — скорость, atk — {k1,k2,k3,dir} или null, hurt 0..1
    function solve(a, r, sp, atk, hurt, extra = {}) {
      const spN = clamp(sp / HERO.speed), stride = clamp(0.3 + 0.15 * sp, 0.3, 0.9);
      if (sp > 0.25) S.phase = (S.phase + a.dt * sp * ST / stride) % 1;
      const th = S.phase * Math.PI * 2, breath = Math.sin(a.t * 2.0) * (1 - r);
      const aw = atk ? 1 : 0, k1 = atk ? atk.k1 : 0, k2 = atk ? atk.k2 : 0, k3 = atk ? atk.k3 : 0, dir = atk ? atk.dir : 1;
      const wind = k1 * (1 - k2), hitK = k2 * (1 - k3), crouchA = 0.1 * (k1 * (1 - k2) + 0.7 * k2 * (1 - k3));
      const hipY = 0.97 - 0.14 * r + 0.03 * r * Math.abs(Math.cos(th - 1.885)) - crouchA * aw + breath * 0.008 - (extra.crouch || 0);
      [[legR, 0], [legL, 0.5]].forEach(([lg, off], i) => {
        const ft = footTarget(S.phase + off, stride, 0.08 + 0.16 * spN, ST);
        let dz = ft.z * r + (i ? -0.03 : 0.03) * (1 - r), lift = ft.y * r, toe = ft.pitch * r;
        if (atk) { // боевая стойка: ближняя к мечу нога шагает вперёд, вторая упирается сзади
          const front = (dir > 0) === (i === 0), sz = front ? 0.08 + 0.26 * k1 + 0.06 * k2 : -0.3 + 0.06 * k2;
          dz = sz; lift = 0; toe = 0;
        }
        lg.position.x = (i ? 0.15 : -0.15) + Math.sin(th) * 0.02 * r; lg.position.y = hipY;
        legIK(lg, lg.knee, lg.foot, L1, L2, hipY - ANKLE, dz, lift, toe);
      });
      hips.position.set(Math.sin(th) * 0.025 * r, hipY, 0);
      hips.rotation.set(0, Math.sin(th) * 0.13 * r + dir * (0.32 * wind - 0.4 * hitK) * aw, Math.sin(th + 0.5) * 0.035 * r);
      torso.rotation.x = (0.1 + 0.14 * spN) * r + breath * 0.02 + 0.12 * wind - 0.06 * hitK - 0.28 * hurt + (extra.lean || 0);
      torso.rotation.y = -Math.sin(th) * 0.2 * r + dir * (0.5 * wind - 0.55 * hitK) * aw;
      torso.rotation.z = S.bank * r + Math.sin(a.t * 0.8) * 0.01 * (1 - r);
      head.rotation.set(-0.1 * r - torso.rotation.x * 0.4 + Math.sin(a.t * 1.3) * 0.03 * (1 - r), -torso.rotation.y * 0.7 - hips.rotation.y * 0.3, Math.sin(a.t * 0.9) * 0.04 * (1 - r));
      const swing = Math.cos(th) * 0.6 * r;
      armL.rotation.set(lerp(-swing - 0.2, -0.85 + 0.45 * hitK, aw), 0, 0.14); armL.elbow.rotation.x = lerp(-0.55 - 0.45 * r, -1.25, aw) + breath * 0.02;
      const run = [swing - 0.1, 0, -0.14 + breath * 0.03], runEl = -0.7 - 0.5 * r;
      const sx = lerp(-2.55, -0.25, k2) + 0.35 * k3, sz = -0.15 - dir * lerp(0.95, -0.75, k2) * (1 - k3 * 0.6), sel = lerp(-1.55, -0.2, k2) - 0.5 * k3;
      const m = Math.max(k1, k2), ap = [lerp(run[0], sx, m), 0, lerp(run[2], sz, m)];
      armR.rotation.set(lerp(run[0], ap[0], aw), 0, lerp(run[2], ap[2], aw)); armR.elbow.rotation.x = lerp(runEl, lerp(-0.7, sel, m), aw);
      handR.rotation.x = lerp(1.25, 1.0 + 0.4 * wind - 0.3 * hitK, aw);
      spin.rotation.set(0, 0, 0); spin.position.y = 0.9;
    }
    const atkOf = (k, combo) => ({ k1: smooth(k / 0.32), k2: easeOut((k - 0.32) / 0.23), k3: smooth((k - 0.58) / 0.42), dir: combo ? -1 : 1 });

    const anims = {
      idle: a => { solve(a, 0, 0, null, 0); },
      walk: a => { solve(a, 1, a.speed, null, 0); },
      attack: a => { solve(a, 0, 0, atkOf(a.k, a.combo), 0); },
      hit: a => { solve(a, 0, 0, null, 1 - a.k); },
      cast: a => {   // воздеть меч и обрушить: поза «замах» → «выброс»
        const up = smooth(a.k / 0.5), down = smooth((a.k - 0.5) / 0.25);
        solve(a, 0, 0, null, 0, { crouch: 0.04 * down, lean: -0.1 * up + 0.2 * down });
        armR.rotation.set(lerp(-0.1, -2.9, up) + down * 1.5, 0, -0.1); armR.elbow.rotation.x = lerp(-0.7, -0.3, up);
        armL.rotation.set(-1.2 * up, 0, 0.5 * up); handR.rotation.x = 0.4;
      },
      dodge: a => {  // перекат вперёд: сальто вокруг таза
        solve(a, 1, 4, null, 0, { crouch: 0.35, lean: 0.5 });
        spin.rotation.x = Math.PI * 2 * smooth(a.k ?? 0); spin.position.y = 0.7;
      },
      death: a => {  // падение навзничь и остаётся лежать
        const e = easeOut(Math.min(1, (a.k ?? 1) / 0.8)), kneel = smooth(Math.min(1, (a.k ?? 1) / 0.4));
        solve(a, 0, 0, null, 0.6, { crouch: 0.35 * kneel });
        spin.rotation.x = -Math.PI / 2 * e * 0.98; spin.position.y = lerp(0.9, 0.3, e);
        armR.rotation.set(-0.4, 0, -0.9 * e); armL.rotation.set(-0.3, 0, 0.9 * e); handR.rotation.x = 1.25;
      },
    };

    return {
      root, height: 2.0, radius: 0.34, shadow: 1.5, materials: [mat],
      sockets: { handR, handL, back, head },
      bones: { spin, body, hips, torso, head, armR, armL, elR: armR.elbow, elL: armL.elbow, legL, legR, kneeL: legL.knee, kneeR: legR.knee, footL: legL.foot, footR: legR.foot, handR, handL },
      clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.5, hit: 0.42 }, hit: { dur: 0.3 }, death: { dur: 1.1 }, cast: { dur: 0.7, fire: 0.5 }, dodge: { dur: 0.42 } },
      anims,
      update(dt, t, env, actor) {
        const wind = env && env.wind ? env.wind : new THREE.Vector2(0, 0);
        cape.update(dt, capeAnchor.matrixWorld, root.matrixWorld, wind, t);
        cape.mesh.visible = actor.root.visible;
      },
      dispose() { cape.mesh.removeFromParent(); },
    };
  },
};
