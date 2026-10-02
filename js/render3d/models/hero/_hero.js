// Герой-воин «Рыцарь Ордена»: рогатый рыцарь 1:4 (голова 0,5 м из 2,0 м), наплечники, светящийся визор, плащ на Verlet.
// Перенесено из lab/three/js/dark/hero.js в формат модели (docs/MODEL_SPEC.md): оружие и щит — не часть модели, а надеваются в сокеты.
export function heroModel(kit, V = {}) {
  {
    const { THREE, PAL, HERO, part, merge, group, rig } = kit;
    const { clamp, smooth, easeOut, lerp, footTarget, legIK } = rig;
    const STEEL = V.steel ?? HERO.steel, STEEL_L = V.steelL ?? HERO.steelL, STEEL_D = V.steelD ?? HERO.steelD, DARK = V.dark ?? HERO.dark, TX = V.tex ?? 'metal', BONE = PAL.bone, BONE_D = PAL.boneD, BR = PAL.brass, BR_D = PAL.brassD;
    const mat = kit.mat({ rim: HERO.rim, rimColor: V.rimColor ?? HERO.rimColor });
    const M = g => new THREE.Mesh(g, mat);

    const root = new THREE.Group();
    const spin = group([0, 0.9, 0], root);            // ось падения/кувырка на высоте таза; в обычных клипах не вращается
    const body = group([0, -0.9, 0], spin);
    const hips = group([0, 0.97, 0], body);
    // рисованные фактуры: сталь — metal, кожа и сюрко — cloth; формы — тела вращения, пластины с фасками, заклёпки
    const MT = { tex: TX }, TOP = c => ({ top: c, tex: TX }), LEATHER = 0x3a2418, LEATHER_L = 0x6a4428;
    const rivets = (pts, r = 0.018) => pts.map(p => part(new THREE.SphereGeometry(r, 5, 4), BR, p));
    const pauldron = sx => [   // наплечник: купол + три ламели внахлёст, латунная кайма, заклёпки, костяной шип
      part(new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, [sx * 0.46, 0.56, 0], [0, 0, -sx * 0.25], [1.08, 0.85, 1.12], TOP(STEEL_L)),
      ...[0, 1, 2].map(i => part(new THREE.CylinderGeometry(0.25 - i * 0.01, 0.27 - i * 0.008, 0.09, 14, 1, true, sx > 0 ? -0.2 : Math.PI - 0.2 + 0.4, Math.PI * 0.95), i % 2 ? STEEL_D : STEEL, [sx * (0.5 + i * 0.025), 0.53 - i * 0.075, 0], [0, 0, -sx * (0.35 + i * 0.12)], [1.05, 1, 1.1], TOP(STEEL_L))),
      part(new THREE.TorusGeometry(0.255, 0.022, 4, 16, Math.PI), BR, [sx * 0.46, 0.56, 0], [Math.PI / 2, 0, sx > 0 ? -0.25 : Math.PI + 0.25], [1.08, 1.12, 1]),
      ...rivets([[sx * 0.66, 0.5, 0.12], [sx * 0.66, 0.5, -0.12], [sx * 0.6, 0.66, 0.16], [sx * 0.6, 0.66, -0.16]]),
      kit.tube([[sx * 0.5, 0.74, 0], [sx * 0.62, 0.86, 0], [sx * 0.66, 1.0, -0.02]], 0.07, 0.02, BONE_D, { top: 0xffffff }),
    ];
    const torsoParts = () => [
      // кольчужная юбка и пояс с пряжкой
      kit.lathe([[0.2, -0.32], [0.26, -0.3], [0.25, -0.05], [0.2, 0.05]], DARK, [0, 0, 0], 0, 1, { top: 0x3a4060, tex: 'cloth' }, 12),
      kit.lathe([[0.235, 0], [0.245, 0.03], [0.245, 0.09], [0.235, 0.12]], LEATHER, [0, 0, 0], 0, 1, { top: LEATHER_L, tex: 'leather' }, 12),
      kit.bbox(0.14, 0.12, 0.05, 0.015, BR_D, [0, 0.06, 0.24], 0, { top: BR }),
      // набедренные пластины (тассеты) по бокам
      ...[-1, 1].map(sx => kit.bbox(0.2, 0.22, 0.05, 0.015, STEEL, [sx * 0.2, -0.12, 0.13], [0.15, sx * 0.55, sx * 0.15], TOP(STEEL_L))),
      // кираса: бочкообразная грудь, рёбра жёсткости, ворот
      kit.lathe([[0.2, 0.1], [0.27, 0.2], [0.33, 0.38], [0.33, 0.5], [0.28, 0.62], [0.17, 0.7]], STEEL, [0, 0, 0], 0, [1.12, 1, 0.82], TOP(STEEL_L), 14),
      kit.bbox(0.05, 0.5, 0.06, 0.015, STEEL_L, [0, 0.42, 0.265], [-0.12, 0, 0], { top: 0xffffff, tex: 'metal' }),
      ...[0.22, 0.3].map(y => kit.lathe([[0.27 + (y - 0.22) * 0.6, 0], [0.285 + (y - 0.22) * 0.6, 0.02], [0.27 + (y - 0.22) * 0.6, 0.04]], BR_D, [0, y, 0], 0, [1.12, 1, 0.82], { top: BR }, 14)),
      part(new THREE.CylinderGeometry(0.16, 0.2, 0.13, 12), STEEL_D, [0, 0.69, 0], 0, 1, TOP(STEEL)),
      part(new THREE.TorusGeometry(0.18, 0.02, 4, 14), BR, [0, 0.63, 0], [Math.PI / 2, 0, 0], [1.12, 0.82, 1]),
      // руна Бездны на груди в латунной оправе
      part(new THREE.BoxGeometry(0.12, 0.12, 0.02), BR, [0, 0.4, 0.275], [0, 0, Math.PI / 4]),
      part(new THREE.BoxGeometry(0.03, 0.17, 0.02), PAL.abyss, [0, 0.4, 0.288], 0, 1, { emit: true }),
      // сюрко (табард) Ордена: полотно с латунной каймой ниже пояса
      kit.bbox(0.34, 0.64, 0.035, 0.01, 0x35205f, [0, -0.22, 0.24], [0.06, 0, 0], { top: 0x7a4cd8, tex: 'cloth' }),
      ...[-1, 1].map(sx => part(new THREE.BoxGeometry(0.025, 0.62, 0.04), BR_D, [sx * 0.17, -0.22, 0.245], [0.06, 0, 0])),
      part(new THREE.ConeGeometry(0.17, 0.14, 3), 0x35205f, [0, -0.6, 0.265], [Math.PI, 0, 0], [1, 1, 0.15], { tex: 'cloth' }),
      // ремень перевязи через грудь
      kit.bbox(0.07, 0.75, 0.03, 0.01, LEATHER, [0.05, 0.38, 0.268], [-0.12, 0, 0.62], { top: LEATHER_L, tex: 'leather' }),
      ...pauldron(-1), ...pauldron(1),
    ];
    const torso = M(merge(V.torso ? V.torso({ kit, STEEL, STEEL_L, STEEL_D, DARK, LEATHER, LEATHER_L, BR, BR_D, BONE, BONE_D, TOP }) : torsoParts()));
    hips.add(torso);

    const head = group([0, 0.7, 0], torso);
    const headParts = () => [
      // топхельм: купол + цилиндр, латунный обод, гребень, узкая смотровая щель со светом Бездны, дыхальца, нащёчники
      kit.lathe([[0.235, 0.0], [0.26, 0.06], [0.265, 0.2], [0.25, 0.32], [0.2, 0.42], [0.1, 0.48], [0.0, 0.5]], STEEL, [0, 0, 0], 0, [1, 1, 1.06], TOP(STEEL_L), 16),
      part(new THREE.CylinderGeometry(0.27, 0.262, 0.05, 16), BR_D, [0, 0.06, 0], 0, [1, 1, 1.06], { top: BR }),
      kit.bbox(0.045, 0.24, 0.5, 0.012, BR_D, [0, 0.44, -0.02], [0.12, 0, 0], { top: 0xf0c868 }),
      kit.bbox(0.36, 0.07, 0.12, 0.012, 0x07050f, [0, 0.24, 0.215]),
      part(new THREE.BoxGeometry(0.1, 0.035, 0.02), 0xe9dcff, [0.085, 0.24, 0.275], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.1, 0.035, 0.02), 0xe9dcff, [-0.085, 0.24, 0.275], 0, 1, { emit: true }),
      kit.bbox(0.04, 0.2, 0.05, 0.01, STEEL_D, [0, 0.13, 0.27], 0, TOP(STEEL)),
      ...[-1, 1].flatMap(sx => [
        ...[0, 1, 2].map(i => part(new THREE.BoxGeometry(0.035, 0.012, 0.02), 0x07050f, [sx * (0.06 + i * 0.05), 0.12, 0.27 - i * 0.012])),
        // рога: изогнутые сужающиеся трубки кости
        kit.tube([[sx * 0.24, 0.3, 0], [sx * 0.38, 0.36, 0.02], [sx * 0.48, 0.5, 0], [sx * 0.5, 0.66, -0.06]], 0.075, 0.018, BONE_D, { top: 0xffffff }, 7),
        part(new THREE.TorusGeometry(0.07, 0.016, 4, 8), BR, [sx * 0.26, 0.3, 0], [0, Math.PI / 2, 0]),
      ]),
      ...rivets([[0.2, 0.06, 0.18], [-0.2, 0.06, 0.18], [0.26, 0.06, 0], [-0.26, 0.06, 0]], 0.016),
    ];
    head.add(M(merge(V.head ? V.head({ kit, STEEL, STEEL_L, STEEL_D, DARK, LEATHER, LEATHER_L, BR, BR_D, BONE, BONE_D, TOP }) : headParts())));

    const arm = side => {
      const g = group([side * 0.46, 0.52, 0], torso);
      // плечо: кольчужный рукав; локоть: налокотник с крылом
      g.add(M(merge([
        kit.lathe([[0.08, 0], [0.095, -0.08], [0.09, -0.25], [0.08, -0.33]], DARK, [0, 0, 0], 0, 1, { top: 0x3a4060, tex: 'cloth' }, 8),
        kit.bbox(0.17, 0.14, 0.17, 0.03, STEEL, [0, -0.17, 0], 0, TOP(STEEL_L)),
        part(new THREE.SphereGeometry(0.1, 10, 7), STEEL_D, [0, -0.35, 0], 0, 1, TOP(STEEL)),
        part(new THREE.ConeGeometry(0.08, 0.12, 4), STEEL, [side * 0.06, -0.35, -0.04], [0, 0, side * 1.7], [1, 1, 0.4], TOP(STEEL_L)),
      ])));
      const el = group([0, -0.35, 0], g);
      // наруч расширяется к кисти, латная перчатка — крупная, с пластинами пальцев и шипами на костяшках
      el.add(M(merge([
        kit.lathe([[0.075, 0], [0.085, -0.06], [0.11, -0.2], [0.12, -0.25]], STEEL, [0, 0, 0], 0, 1, TOP(STEEL_L), 10),
        part(new THREE.CylinderGeometry(0.118, 0.118, 0.035, 10), BR, [0, -0.11, 0]),
        kit.bbox(0.2, 0.17, 0.22, 0.04, STEEL, [0, -0.34, 0.01], 0, TOP(STEEL_L)),
        ...[0, 1, 2].map(i => kit.bbox(0.21, 0.04, 0.07, 0.012, STEEL_D, [0, -0.4 - i * 0.025, 0.09 + i * 0.02], [0.4 + i * 0.25, 0, 0], TOP(STEEL))),
        ...[-1, 0, 1].map(i => part(new THREE.ConeGeometry(0.018, 0.05, 4), BR, [i * 0.06, -0.31, 0.12], [Math.PI / 2, 0, 0])),
        part(new THREE.SphereGeometry(0.07, 7, 5), STEEL_D, [-side * 0.09, -0.32, 0.05], 0, 1, TOP(STEEL)),
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
      // бедро: кольчуга и набедренник
      g.add(M(merge([
        kit.lathe([[0.1, 0.02], [0.115, -0.1], [0.1, -0.38], [0.085, -0.42]], DARK, [0, 0, 0], 0, 1, { top: 0x3a4060, tex: 'cloth' }, 8),
        kit.lathe([[0.12, -0.04], [0.128, -0.15], [0.11, -0.33]], STEEL, [0, 0, 0.012], 0, [1, 1, 1.05], TOP(STEEL_L), 10),
      ])));
      const k = group([0, -L1, 0], g);
      // колено: наколенник с крылом и латунной заклёпкой; голень: поножь
      k.add(M(merge([
        part(new THREE.SphereGeometry(0.11, 10, 7), STEEL, [0, 0, 0.06], 0, [1, 1.1, 0.9], TOP(STEEL_L)),
        part(new THREE.ConeGeometry(0.08, 0.1, 4), STEEL_D, [side * 0.09, 0, 0.03], [0, 0, side * 1.6], [1, 1, 0.4], TOP(STEEL)),
        ...rivets([[0, 0, 0.165]], 0.022),
        kit.lathe([[0.075, -0.05], [0.1, -0.14], [0.095, -0.3], [0.08, -0.4]], STEEL, [0, 0, 0.012], 0, [1, 1, 1.12], TOP(STEEL_L), 10),
        kit.bbox(0.04, 0.26, 0.03, 0.01, STEEL_L, [0, -0.22, 0.115], [0.04, 0, 0], { top: 0xffffff, tex: 'metal' }),
      ])));
      const f = group([0, -L2, 0], k);
      // сабатон: ступенчатые пластины к носку, кожаная подошва
      f.add(M(merge([
        kit.bbox(0.2, 0.08, 0.34, 0.025, LEATHER, [0, -0.08, 0.07], 0, { top: LEATHER_L, tex: 'leather' }),
        kit.bbox(0.19, 0.12, 0.2, 0.035, STEEL_D, [0, -0.01, 0.0], 0, TOP(STEEL)),
        ...[0, 1, 2].map(i => kit.bbox(0.18 - i * 0.015, 0.07, 0.08, 0.02, i % 2 ? STEEL_D : STEEL, [0, -0.03 - i * 0.012, 0.13 + i * 0.06], [0.25 + i * 0.1, 0, 0], TOP(STEEL_L))),
      ])));
      g.knee = k; g.foot = f; return g;
    };
    const legL = leg(1), legR = leg(-1);

    // плащ крепится к торсу и живёт в мировых координатах сцены
    const cape = new kit.Cape(kit.scene, V.cape ?? HERO.cape, { len: V.capeLen ?? 1.25, top: 0.78, bottom: 1.15, R: 0.34, back: -0.27, bodyTop: 1.75, backMin: 0.75, hem: V.capeHem ?? HERO.capeHem });
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
      cast: a => {   // воздеть меч и обрушить: поза «замах» → «выброс»; у лучника — натянуть лук
        if (V.cast === 'bow') { const draw = smooth(a.k / 0.6), rel = smooth((a.k - 0.62) / 0.14); solve(a, 0, 0, null, 0, { crouch: 0.03, lean: -0.05 }); torso.rotation.y = 0.8; head.rotation.y = -0.8; armL.rotation.set(-1.5, 0, 0.1); armL.elbow.rotation.x = -0.05; armR.rotation.set(-1.45 + 0.1 * rel, 0, -0.5 * draw * (1 - rel)); armR.elbow.rotation.x = -1.9 * draw * (1 - rel) - 0.2; handR.rotation.x = 0.8; return; }
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
      root, height: V.height ?? 2.0, radius: 0.34, shadow: 1.5, materials: [mat],
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
  }
}
