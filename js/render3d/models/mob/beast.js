// Пещерный зверь: массивный горбатый хищник на четырёх лапах, костяные пластины вдоль хребта, клыки, светящиеся глаза.
// Свой риг (не IK): лапы переставляются диагональными парами, атака — рывок с укусом, «каст» — рёв, смерть — заваливается на бок.
export default {
  id: 'beast', kind: 'mob', outline: 'mob',
  build(kit) {
    const { THREE, PAL, MOB, part, merge, ball, group, rig, pivot } = kit;
    const { clamp, smooth, lerp } = rig;
    const FUR = 0x3a3430, FURL = 0x7a6a58, SKIN = 0x5a4a44, BONE = MOB.bone, BONE_D = MOB.boneD, EYE = MOB.ghoulEye, F = { top: FURL, tex: 'cloth' };
    const mat = kit.mat({ rim: MOB.rim, rimColor: 0xffd0a0 });
    const M = g => new THREE.Mesh(g, mat);
    const root = new THREE.Group(), { spin, body: rg } = pivot(root, 0.7);
    const body = group([0, 1.0, 0], rg);
    body.add(M(merge([
      // туловище: горб над плечами, поджарый зад; шерсть клоками, пластины кости по хребту
      part(new THREE.SphereGeometry(0.62, 14, 10), FUR, [0, 0.12, 0.35], 0, [0.95, 0.95, 1.05], F),
      part(new THREE.SphereGeometry(0.48, 12, 9), FUR, [0, -0.02, -0.45], 0, [0.9, 0.85, 1.1], F),
      part(new THREE.SphereGeometry(0.36, 10, 8), SKIN, [0, -0.25, 0.1], 0, [1, 0.6, 1.6], { top: FUR }),
      ...[0, 1, 2, 3, 4, 5].map(i => kit.tube([[0, 0.55 - i * 0.06, 0.6 - i * 0.26], [0, 0.85 - i * 0.07, 0.5 - i * 0.26], [0, 0.95 - i * 0.09, 0.32 - i * 0.26]], 0.09 - i * 0.008, 0.015, BONE_D, { top: BONE }, 5)),
      ...[-1, 1].flatMap(sx => [0, 1, 2].map(i => kit.tube([[sx * 0.4, 0.25 - i * 0.1, 0.55 - i * 0.12], [sx * 0.62, 0.2 - i * 0.1, 0.5 - i * 0.12]], 0.05, 0.01, FUR, F, 4))),
    ])));
    const tail = group([0, 0.0, -0.9], body);
    tail.add(M(merge([kit.tube([[0, 0, 0], [0, -0.1, -0.35], [0, -0.3, -0.65], [0, -0.35, -0.9]], 0.12, 0.03, FUR, F, 6), part(new THREE.ConeGeometry(0.06, 0.2, 4), BONE, [0, -0.35, -0.95], [-1.8, 0, 0])])));
    const head = group([0, 0.15, 0.95], body);
    const jaw = group([0, -0.12, 0.05], head);
    head.add(M(merge([
      part(new THREE.SphereGeometry(0.32, 12, 9), FUR, [0, 0.05, 0.1], 0, [1, 0.85, 1.15], F),
      kit.bbox(0.4, 0.2, 0.42, 0.06, SKIN, [0, 0.0, 0.38], [0.1, 0, 0], { top: FUR }),
      part(new THREE.SphereGeometry(0.05, 6, 5), EYE, [0.15, 0.13, 0.36], 0, [1, 0.7, 0.6], { emit: true }), part(new THREE.SphereGeometry(0.05, 6, 5), EYE, [-0.15, 0.13, 0.36], 0, [1, 0.7, 0.6], { emit: true }),
      ...[-1, 1].map(sx => kit.tube([[sx * 0.2, 0.18, 0.15], [sx * 0.38, 0.38, 0.0], [sx * 0.42, 0.52, -0.2]], 0.06, 0.014, BONE_D, { top: BONE }, 6)),
      ...[-0.12, -0.04, 0.04, 0.12].map(x => part(new THREE.ConeGeometry(0.018, 0.06, 4), BONE, [x, -0.1, 0.56], [Math.PI, 0, 0])),
    ])));
    jaw.add(M(merge([kit.bbox(0.34, 0.1, 0.38, 0.04, SKIN, [0, -0.02, 0.34], 0, { top: FUR }),
      ...[-1, 1].map(sx => kit.tube([[sx * 0.14, 0.0, 0.48], [sx * 0.17, 0.14, 0.52], [sx * 0.15, 0.24, 0.46]], 0.035, 0.01, BONE_D, { top: 0xffffff }, 5))])));
    // лапы: бедро и голень; передние мощнее, когти
    const leg = (x, z, front) => {
      const g = group([x, -0.05, z], body);
      g.add(M(merge([part(new THREE.SphereGeometry(front ? 0.24 : 0.2, 9, 7), FUR, [0, -0.15, 0], 0, [1, 1.5, 1], F)])));
      const k = group([0, -0.45, front ? 0.05 : -0.05], g);
      k.add(M(merge([part(new THREE.CylinderGeometry(0.1, 0.08, 0.45, 8), SKIN, [0, -0.22, 0], 0, 1, { top: FUR }), kit.bbox(0.22, 0.1, 0.26, 0.04, SKIN, [0, -0.47, 0.05], 0, { top: FUR }),
        ...[-0.07, 0, 0.07].map(cx => part(new THREE.ConeGeometry(0.02, 0.1, 4), BONE, [cx, -0.48, 0.2], [Math.PI / 2, 0, 0]))])));
      g.knee = k; return g;
    };
    const FL = leg(0.38, 0.5, true), FR = leg(-0.38, 0.5, true), BL = leg(0.32, -0.55, false), BR = leg(-0.32, -0.55, false);
    let ph = Math.random();
    function pose(a, sp, lunge = 0, rear = 0, roar = 0, hurt = 0) {
      const w = clamp(sp / 2.5);
      if (sp > 0.25) ph = (ph + a.dt * sp / 2.2) % 1;
      const th = ph * 6.283, br = Math.sin(a.t * 1.6);
      [[FL, 0], [BR, 0], [FR, Math.PI], [BL, Math.PI]].forEach(([l, o]) => { const s = Math.sin(th + o) * w; l.rotation.x = s * 0.55 - rear * 0.6 + lunge * (l === FL || l === FR ? -0.7 : 0.4); l.knee.rotation.x = Math.max(0, -Math.cos(th + o)) * 0.7 * w + rear * 0.4; });
      body.position.y = 1.0 + Math.abs(Math.sin(th)) * 0.06 * w + br * 0.015 + rear * 0.25 - lunge * 0.1;
      body.position.z = lunge * 0.5; body.rotation.x = -rear * 0.35 + lunge * 0.2 + hurt * -0.2; body.rotation.z = Math.sin(th) * 0.04 * w;
      head.rotation.x = -roar * 0.7 + lunge * 0.25 + Math.sin(a.t * 1.1) * 0.04 - rear * 0.2; head.rotation.y = Math.sin(a.t * 0.7) * 0.1 * (1 - w);
      jaw.rotation.x = 0.1 + roar * 0.6 + lunge * 0.5 + rear * 0.3;
      tail.rotation.y = Math.sin(a.t * 2 + th) * (0.25 + 0.3 * w); tail.rotation.x = 0.2 * rear;
      spin.rotation.set(0, 0, 0); spin.position.y = 0.7;
    }
    const anims = {
      idle: a => pose(a, 0),
      walk: a => pose(a, a.speed),
      attack: a => { const k = a.k, r = smooth(k / 0.45) * (1 - smooth((k - 0.45) / 0.1)), l = smooth((k - 0.42) / 0.12) * (1 - smooth((k - 0.6) / 0.4)); pose(a, 0, l, r); },
      hit: a => pose(a, 0, 0, 0, 0, 1 - a.k),
      cast: a => pose(a, 0, 0, smooth(a.k / 0.3) * 0.6, smooth(a.k / 0.4) * (1 - smooth((a.k - 0.8) / 0.2))),
      death: a => { const e = smooth(Math.min(1, (a.k ?? 1) / 0.7)); pose(a, 0, 0, 0, 0, 0.5); spin.rotation.z = Math.PI / 2 * 0.92 * e; spin.position.y = lerp(0.7, 0.45, e); jaw.rotation.x = 0.5 * e; },
    };
    return {
      root, height: 1.7, radius: 0.45, shadow: 2.0, materials: [mat],
      sockets: {}, bones: { spin, body, head, jaw, tail, FL, FR, BL, BR, kFL: FL.knee, kFR: FR.knee, kBL: BL.knee, kBR: BR.knee },
      clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.8, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 1.0, fire: 0.4 } },
      anims,
    };
  },
};
