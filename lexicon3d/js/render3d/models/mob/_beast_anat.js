// Анатомический зверь (новая шерсть, fur.js): тело, шея-голова, челюсть и лапы «вытянуты» по сечениям (суперэллипсы),
// а не собраны из шаров. Глубокая грудь и поджарый живот, клин морды с переходом ко лбу, локоть и скакательный сустав.
// Мех на теле — фактура (mat_fur_*), пряди-«карты» только по силуэту: гребень, баки, грудь, локти, хвост (как у зверей WoW / Torchlight).
// Морда — наклейка-оболочка, подогнанная по глазам и носу (fur.decalFit); спина и грудь окрашены по наклейкам (fur.tint).
// Риг тот же, что у _beast.js: spin/body/head/jaw/tail/FL…BR + колени, клипы те же.

// Профили: BY — высота туловища; body/head/jaw — сечения [z, y, полуширина, верх, низ, (показатель формы)];
// neck — где голова на туловище; jaw0 — шарнир челюсти в голове; eye — [z, угол на сечении], sh/hip — плечо и таз [x, y, z]; T — толщина лап.
const PROF = {
  wolf: {
    BY: 0.88, T: 1.4, neck: [0, 0.2, 0.6], jaw0: [0, 0.09, 0.3], eye: [0.43, 0.62], sh: [0.13, -0.02, 0.36], hip: [0.12, 0.0, -0.6],
    body: [[-0.84, 0.06, 0.1, 0.1, 0.1], [-0.72, 0.08, 0.17, 0.16, 0.18], [-0.45, 0.06, 0.16, 0.15, 0.15], [-0.15, 0.05, 0.19, 0.19, 0.25], [0.18, 0.08, 0.21, 0.22, 0.32], [0.42, 0.11, 0.2, 0.22, 0.3], [0.62, 0.16, 0.15, 0.17, 0.19]],
    head: [[-0.25, -0.12, 0.15, 0.17, 0.2], [-0.05, 0.0, 0.14, 0.15, 0.17], [0.12, 0.1, 0.13, 0.13, 0.13], [0.24, 0.16, 0.14, 0.12, 0.11], [0.36, 0.17, 0.145, 0.11, 0.1], [0.46, 0.165, 0.11, 0.085, 0.085], [0.6, 0.14, 0.07, 0.055, 0.05], [0.72, 0.13, 0.055, 0.045, 0.04], [0.78, 0.128, 0.04, 0.035, 0.03]],
    jaw: [[-0.02, 0, 0.09, 0.04, 0.06], [0.15, 0, 0.07, 0.03, 0.05], [0.32, 0, 0.05, 0.025, 0.035], [0.44, 0.01, 0.035, 0.02, 0.02]],
    ears: 'point', tail: { at: [0, 0.12, -0.8], droop: -0.95, len: 0.78, r: 0.075 },
  },
  bear: {
    BY: 0.8, T: 2.3, neck: [0, 0.3, 0.68], jaw0: [0, 0.0, 0.31], eye: [0.44, 0.55], sh: [0.22, 0.02, 0.4], hip: [0.2, 0.02, -0.56],
    body: [[-0.86, 0.02, 0.18, 0.16, 0.18], [-0.68, 0.06, 0.32, 0.3, 0.32], [-0.3, 0.06, 0.36, 0.32, 0.36], [0.05, 0.08, 0.37, 0.36, 0.4], [0.35, 0.14, 0.36, 0.43, 0.4], [0.58, 0.16, 0.3, 0.34, 0.33], [0.74, 0.18, 0.2, 0.22, 0.22]],
    head: [[-0.33, -0.183, 0.293, 0.305, 0.342], [-0.055, 0.0, 0.268, 0.268, 0.293], [0.132, 0.098, 0.244, 0.22, 0.22], [0.264, 0.146, 0.244, 0.195, 0.171], [0.374, 0.146, 0.232, 0.171, 0.159], [0.462, 0.122, 0.171, 0.122, 0.122], [0.572, 0.085, 0.122, 0.091, 0.085], [0.66, 0.073, 0.098, 0.073, 0.067], [0.71, 0.073, 0.073, 0.055, 0.049]],
    jaw: [[-0.022, 0.0, 0.159, 0.049, 0.085], [0.165, 0.0, 0.122, 0.043, 0.073], [0.33, 0.0, 0.085, 0.037, 0.049], [0.396, 0.0, 0.061, 0.024, 0.03]],
    ears: 'round', tail: { at: [0, 0.1, -0.84], droop: -0.6, len: 0.16, r: 0.08 },
  },
  boar: {
    BY: 0.64, T: 1.75, neck: [0, 0.16, 0.52], jaw0: [0, -0.06, 0.25], eye: [0.3, 0.5], sh: [0.18, -0.02, 0.36], hip: [0.17, 0.0, -0.55],
    body: [[-0.78, 0.0, 0.14, 0.14, 0.14], [-0.62, 0.03, 0.26, 0.25, 0.27], [-0.25, 0.03, 0.3, 0.3, 0.32], [0.1, 0.06, 0.3, 0.35, 0.33], [0.38, 0.1, 0.27, 0.39, 0.32], [0.6, 0.1, 0.2, 0.28, 0.26]],
    head: [[-0.3, -0.1, 0.22, 0.3, 0.28], [-0.05, 0.02, 0.2, 0.26, 0.24], [0.12, 0.08, 0.18, 0.2, 0.18], [0.28, 0.06, 0.15, 0.15, 0.14], [0.45, 0.02, 0.11, 0.1, 0.1], [0.62, -0.01, 0.085, 0.075, 0.075], [0.72, -0.02, 0.08, 0.07, 0.07, 2.0], [0.745, -0.02, 0.072, 0.064, 0.064, 2.0]],
    jaw: [[-0.02, 0, 0.12, 0.04, 0.06], [0.2, 0, 0.08, 0.03, 0.05], [0.38, 0, 0.06, 0.025, 0.03], [0.45, 0, 0.045, 0.02, 0.02]],
    ears: 'droop', tail: { at: [0, 0.1, -0.76], droop: -1.2, len: 0.3, r: 0.025 },
  },
  beast: {
    BY: 0.92, T: 1.8, neck: [0, 0.26, 0.64], jaw0: [0, 0.06, 0.28], eye: [0.42, 0.6], sh: [0.18, 0.0, 0.38], hip: [0.15, 0.0, -0.6],
    body: [[-0.86, 0.04, 0.14, 0.13, 0.13], [-0.7, 0.07, 0.25, 0.22, 0.25], [-0.38, 0.04, 0.23, 0.21, 0.22], [0.0, 0.06, 0.29, 0.29, 0.35], [0.32, 0.14, 0.31, 0.4, 0.37], [0.56, 0.18, 0.26, 0.31, 0.3], [0.72, 0.2, 0.19, 0.21, 0.21]],
    head: [[-0.28, -0.14, 0.19, 0.21, 0.24], [-0.05, 0, 0.18, 0.19, 0.21], [0.12, 0.1, 0.17, 0.16, 0.16], [0.24, 0.15, 0.18, 0.15, 0.14], [0.36, 0.15, 0.18, 0.13, 0.13], [0.46, 0.13, 0.13, 0.1, 0.1], [0.58, 0.1, 0.09, 0.07, 0.065], [0.67, 0.09, 0.07, 0.055, 0.05], [0.71, 0.09, 0.05, 0.04, 0.035]],
    jaw: [[-0.02, 0, 0.12, 0.045, 0.07], [0.15, 0, 0.1, 0.035, 0.065], [0.32, 0, 0.07, 0.03, 0.045], [0.42, 0.01, 0.05, 0.022, 0.025]],
    ears: 'point', tail: { at: [0, 0.12, -0.82], droop: -0.8, len: 0.8, r: 0.1 },
  },
};

export function beastAnat(kit, C) {
  const { THREE, MOB, part, merge, group, rig, pivot, fur: FK } = kit;
  const { clamp, smooth, lerp } = rig;
  const P = PROF[C.anat], ID = C.id, SC = C.scale ?? 1, BY = P.BY, T = P.T;
  const FUR = C.fur ?? 0x3a3430, FURL = C.furL ?? 0x7a6a58, SKIN = C.skin ?? 0x5a4a44, BONE = MOB.bone, BONE_D = MOB.boneD, EYE = C.eye ?? MOB.ghoulEye, TEX = C.ftex ?? 'fur';
  const BELLY = C.anat === 'wolf' ? FURL : new THREE.Color(FUR).lerp(new THREE.Color(FURL), 0.35).getHex();   // волки светлее снизу, остальные — почти ровные
  const RN = kit.geo.rng(C.seed ?? 7), FLEN = C.furLen ?? 0.2;
  const mat = kit.mat({ rim: MOB.rim, rimColor: C.rim ?? 0xffd0a0 });
  const fmat = FK.furMat({ rimColor: C.rim ?? 0xffd0a0 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- построители
  const sec = a => ({ z: a[0], y: a[1], w: a[2], t: a[3], b: a[4], p: a[5] ?? 2.0, x: a[6] ?? 0 });
  // сглаживание: между ключевыми сечениями — n промежуточных по сплайну Катмулла–Рома (иначе тело «гранёное», как коробка)
  function smoothS(S, n = 3) {
    const K = ['z', 'y', 'w', 't', 'b', 'p', 'x'], out = [];
    for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < n; j++) {
      const f = j / n, a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)], o = {};
      for (const k of K) { const p0 = a[k], p1 = b[k], p2 = c[k], p3 = d[k]; o[k] = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f); }
      if (k0(o)) out.push(o);
    }
    out.push(S[S.length - 1]); return out;
  }
  // закруглить торцы туловища (круп и грудь без «клина»): по два сужающихся сечения на концах
  function roundEnds(S) {
    const a = S[0], b = S[S.length - 1], sh = (s, k, dz) => ({ ...s, z: s.z + dz, w: s.w * k, t: s.t * k, b: s.b * k });
    return [sh(a, 0.35, -0.09), sh(a, 0.75, -0.05), ...S];
  }
  const k0 = o => { o.w = Math.max(0.005, o.w); o.t = Math.max(0.005, o.t); o.b = Math.max(0.005, o.b); return true; };
  // точка и нормаль на суперэллипсе сечения s под углом a (0 — бок +X, π/2 — верх)
  function ringPt(s, a) {
    const e = 2 / s.p, c = Math.cos(a), sn = Math.sin(a), h = sn > 0 ? s.t : s.b;
    const u = Math.sign(c) * Math.pow(Math.abs(c), e) * s.w, v = Math.sign(sn) * Math.pow(Math.abs(sn), e) * h;
    const n = V(Math.sign(c) * Math.pow(Math.abs(c), 2 - e) / s.w, Math.sign(sn) * Math.pow(Math.abs(sn), 2 - e) / h, 0);
    return [u, v, n.lengthSq() > 0 ? n.normalize() : V(0, 1, 0)];
  }
  // сечение на произвольном z (линейно между соседними)
  function at(S, z) {
    if (z <= S[0].z) return S[0]; if (z >= S[S.length - 1].z) return S[S.length - 1];
    let i = 0; while (S[i + 1].z < z) i++;
    const a = S[i], b = S[i + 1], f = (z - a.z) / (b.z - a.z), L = k => a[k] + (b[k] - a[k]) * f;
    return { z, y: L('y'), w: L('w'), t: L('t'), b: L('b'), p: L('p'), x: L('x') };
  }
  // поверхность «вытяжки» по оси Z: точка и нормаль
  function surf(S, z, a) { const s = at(S, z), [u, v, n] = ringPt(s, a); return [V(s.x + u, s.y + v, z), n]; }
  // вытяжка по оси Z (туловище, голова, челюсть, хвост): кольца по сечениям, торцы закрыты
  function loftZ(S, nr = 14) {
    const pos = [], idx = [];
    for (const s of S) for (let k = 0; k < nr; k++) { const [u, v] = ringPt(s, k / nr * Math.PI * 2); pos.push(s.x + u, s.y + v, s.z); }
    for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < nr; k++) {
      const a = i * nr + k, b = i * nr + (k + 1) % nr, c = a + nr, d = b + nr; idx.push(a, b, c, b, d, c);
    }
    const c0 = pos.length / 3; pos.push(S[0].x, S[0].y, S[0].z); const c1 = c0 + 1, L = S[S.length - 1]; pos.push(L.x, L.y, L.z + 0.01);
    for (let k = 0; k < nr; k++) { idx.push(c0, (k + 1) % nr, k); const o = (S.length - 1) * nr; idx.push(c1, o + k, o + (k + 1) % nr); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // вытяжка по оси Y вниз (лапы): сечение [x, y, z, полуширина, перёд, зад]
  function loftY(S, nr = 10) {
    const pos = [], idx = [];
    for (const [x, y, z, w, f, bk] of S) for (let k = 0; k < nr; k++) {
      const a = k / nr * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), e = 1;
      pos.push(x + Math.sign(c) * Math.pow(Math.abs(c), e) * w, y, z + Math.sign(sn) * Math.pow(Math.abs(sn), e) * (sn > 0 ? f : bk));
    }
    for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < nr; k++) {
      const a = i * nr + k, b = i * nr + (k + 1) % nr, c = a + nr, d = b + nr; idx.push(a, b, c, b, d, c);
    }
    const c0 = pos.length / 3, F = S[0], L = S[S.length - 1]; pos.push(F[0], F[1] + 0.01, F[2], L[0], L[1] - 0.01, L[2]);
    for (let k = 0; k < nr; k++) { idx.push(c0, (k + 1) % nr, k); const o = (S.length - 1) * nr; idx.push(c0 + 1, o + k, o + (k + 1) % nr); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const paint = (g, bottom, top, tex = TEX) => kit.geo.paint(g, bottom, { top, tex });
  const M = g => new THREE.Mesh(g, mat);
  const FB = new Map(), fb = bone => { if (!FB.has(bone)) FB.set(bone, FK.furBuilder(kit.geo.rng((C.seed ?? 7) * 31 + FB.size))); return FB.get(bone); };
  const cardCol = new THREE.Color(FUR).lerp(new THREE.Color(FURL), 0.3).getHex(), cardTip = FURL;
  const CARD = { strip: C.strip ?? 'short', col: cardCol, tip: cardTip, tw: C.tw ?? 0.9, lift: 0.25, droop: 0.25 };
  // прядь у поверхности: корень на коже (утоплен), растёт по d
  const tuft = (B, p, n, d, W, L, o = {}) => B.card(p, n, d.clone().normalize(), W, L, { ...CARD, ...o });

  // ---------- скелет
  const root = new THREE.Group(), { spin, body: rg } = pivot(root, 0.7);
  const body = group([0, BY, 0], rg);
  const BS = smoothS(roundEnds(P.body.map(sec))), HS = smoothS(P.head.map(sec)), JS = smoothS(P.jaw.map(sec), 2);

  // туловище: снизу светлее (волки), сверху цвет шерсти; рисунок спины — по наклейке
  const zMin = BS[0].z, zMax = BS[BS.length - 1].z, wMax = Math.max(...BS.map(s => s.w));
  const backBox = { c: [0, 0, (zMin + zMax) / 2], h: [wMax * 1.25, 1, (zMax - zMin) / 2 * 1.05] }, chestBox = { c: [0, -0.05, 0], h: [wMax * 1.1, 0.5, 1] };
  const torso = paint(loftZ(BS, 20), BELLY, FUR);
  FK.tint(torso, ID, 1, backBox, 0.7); if (C.chest) FK.tint(torso, ID, 2, chestBox, 0.8);
  const extras = [];
  // костяные пластины по хребту (пещерный зверь), ледяные шипы (ледяной волк)
  if (C.anat === 'beast') for (let i = 0; i < 6; i++) { const z = 0.5 - i * 0.24, [p] = surf(BS, z, Math.PI / 2); extras.push(kit.tube([[0, p.y - 0.06, z + 0.06], [0, p.y + 0.1 - i * 0.01, z - 0.02], [0, p.y + 0.15 - i * 0.015, z - 0.1]], 0.05 - i * 0.005, 0.01, BONE_D, { top: BONE }, 5)); }
  if (C.spikes) for (let i = 0; i < 5; i++) { const z = 0.42 - i * 0.22, [p] = surf(BS, z, Math.PI / 2); extras.push(part(new THREE.ConeGeometry(0.045, 0.22 - i * 0.025, 5), C.spikes, [(i % 2 - 0.5) * 0.08, p.y + 0.06, z], [-0.5, 0, (i % 2 - 0.5) * 0.5], 1, { top: 0xffffff, emit: true })); }
  body.add(M(merge([torso, ...extras])));

  // ---------- голова: шея уходит в туловище, клин морды; челюсть — своя кость
  const head = group(P.neck, body);
  const headG = paint(loftZ(HS, 18), C.anat === 'boar' ? SKIN : BELLY, FUR);
  const ex = P.eye[0], [eyeP, eyeN] = surf(HS, ex, P.eye[1]);
  const nl = HS[HS.length - 1], noseP = [0, nl.y + nl.t * 0.2, nl.z + 0.01];
  const boxes = FK.decalFit(ID, [eyeP.x, eyeP.y, eyeP.z], noseP);
  const dmat = FK.hasDecals(ID) ? FK.decalMat(ID, { rimColor: C.rim ?? 0xffd0a0, gain: C.decGain ?? 1.1, boxes }) : null;
  const hparts = [headG];
  // глаза: маленькие светящиеся «блики» точно там, где нарисованы глаза наклейки (видны в темноте)
  for (const sx of [-1, 1]) hparts.push(part(new THREE.SphereGeometry(0.022 * (C.anat === 'bear' || C.anat === 'boar' ? 0.8 : 1), 6, 5), EYE, [sx * eyeP.x + sx * eyeN.x * 0.004, eyeP.y + eyeN.y * 0.004 - 0.003, eyeP.z + 0.006], 0, [1, 0.6, 0.6], { emit: true }));
  // пасть изнутри (видна, когда челюсть открыта) и клыки — симметрично
  const mz = (P.jaw0[2] + nl.z) / 2, ms = at(HS, mz);
  hparts.push(kit.bbox(ms.w * 1.4, 0.05, nl.z - P.jaw0[2], 0.02, 0x2a1014, [0, ms.y - ms.b * 0.6, mz], 0, { top: 0x4a1a1e }));
  if (C.anat !== 'boar') { const fz = nl.z - 0.07, fs = at(HS, fz); for (const sx of [-1, 1]) hparts.push(part(new THREE.ConeGeometry(0.014 * Math.sqrt(T), 0.07 * Math.sqrt(T), 5), BONE, [sx * fs.w * 0.6, fs.y - fs.b - 0.025, fz], [Math.PI, 0, 0], 1, { top: 0xffffff })); }
  // уши
  const es = at(HS, 0.26);
  if (P.ears === 'point') for (const sx of [-1, 1]) hparts.push(part(new THREE.ConeGeometry(0.055 * Math.sqrt(T), 0.17 * Math.sqrt(T), 4), FUR, [sx * es.w * 0.6, es.y + es.t * 0.85, 0.27], [-0.25, sx * 0.35, -sx * 0.3], [1, 1, 0.45], { top: FURL, tex: TEX }));
  if (P.ears === 'round') for (const sx of [-1, 1]) hparts.push(part(new THREE.SphereGeometry(0.07, 8, 6), FUR, [sx * es.w * 0.72, es.y + es.t * 0.82, 0.22], [0, sx * 0.3, 0], [1, 1, 0.45], { top: FURL, tex: TEX }));
  if (P.ears === 'droop') for (const sx of [-1, 1]) hparts.push(part(new THREE.ConeGeometry(0.06, 0.18, 4), FUR, [sx * (es.w * 0.8 + 0.04), es.y + es.t * 0.55, 0.12], [-0.6, 0, -sx * 1.5], [1, 1, 0.45], { top: FURL, tex: TEX }));
  if (C.anat === 'beast') for (const sx of [-1, 1]) hparts.push(kit.tube([[sx * es.w * 0.55, es.y + es.t * 0.6, 0.3], [sx * 0.24, es.y + 0.24, 0.18], [sx * 0.28, es.y + 0.36, -0.02]], 0.055, 0.012, BONE_D, { top: BONE }, 6));
  head.add(M(merge(hparts)));
  if (dmat) { const sh = new THREE.Mesh(FK.decalShell([headG], 0), dmat); sh.userData.noOutline = true; head.add(sh); }
  const jaw = group(P.jaw0, head);
  const jawG = paint(loftZ(JS, 12), BELLY, C.anat === 'boar' ? SKIN : FUR);
  const jparts = [jawG];
  if (C.anat !== 'boar') { const lz = JS[JS.length - 1].z - 0.05, ls = at(JS, lz); for (const sx of [-1, 1]) jparts.push(part(new THREE.ConeGeometry(0.012 * Math.sqrt(T), 0.05 * Math.sqrt(T), 5), BONE, [sx * ls.w * 0.6, ls.y + ls.t + 0.015, lz], 0, 1, { top: 0xffffff })); }
  // клыки секача: из нижней челюсти вверх-наружу-назад, зеркально
  if (C.tusks) { const tz = JS[2].z; for (const sx of [-1, 1]) jparts.push(kit.tube([[sx * 0.055, 0.0, tz], [sx * 0.11, 0.08, tz + 0.02], [sx * 0.14, 0.17, tz - 0.04]], 0.028, 0.008, BONE_D, { top: 0xffffff }, 6)); }
  jaw.add(M(merge(jparts)));
  if (dmat) { const sh = new THREE.Mesh(FK.decalShell([jawG], 0, 0.006, P.jaw0), dmat); sh.userData.noOutline = true; jaw.add(sh); }

  // ---------- хвост: вытяжка (у волков пушистый — толще в середине) + пряди сверху
  const TL = P.tail, tail = group(TL.at, body), tailIn = group([0, 0, 0], tail); tailIn.rotation.x = TL.droop;
  const bushy = !!C.bushy, TS = Array.from({ length: 6 }, (_, i) => { const t = 1 - i / 5, r = TL.r * (bushy ? (0.6 + Math.sin(t * Math.PI * 0.85) * 1.1) : (1 - t * 0.6)); return sec([-TL.len * t, 0, r, r, r]); });
  tailIn.add(M(merge([paint(loftZ(smoothS(TS, 2), 10), FUR, FURL)])));

  // ---------- лапы: плечо/бедро → локоть/колено (кость knee) → запястье/скакательный сустав → лапа с когтями
  const legs = [];
  function leg(front, sx) {
    const A = front ? P.sh : P.hip, top = BY + A[1], L = top - 0.08, UL = L * (front ? 0.44 : 0.42), LL = L - UL, t = T;
    const g = group([sx * A[0], A[1], A[2]], body);
    // верх лапы утоплен в туловище (узкий), объём — на лопатке/бедре, книзу сужение к локтю/колену
    const up = front
      ? [[-sx * 0.03, 0.12, 0.02, 0.04 * t, 0.06 * t, 0.06 * t], [0, 0.0, 0.02, 0.085 * t, 0.11 * t, 0.1 * t], [0, -0.16, 0, 0.075 * t, 0.09 * t, 0.085 * t], [0, -UL + 0.04, -0.04, 0.06 * t, 0.065 * t, 0.07 * t], [0, -UL, -0.05, 0.055 * t, 0.06 * t, 0.065 * t]]
      : [[-sx * 0.03, 0.14, 0, 0.05 * t, 0.08 * t, 0.09 * t], [0, 0.0, 0.02, 0.1 * t, 0.14 * t, 0.17 * t], [0, -0.17, 0.05, 0.085 * t, 0.11 * t, 0.12 * t], [0, -UL + 0.05, 0.09, 0.06 * t, 0.065 * t, 0.07 * t], [0, -UL, 0.1, 0.055 * t, 0.06 * t, 0.065 * t]];
    const k = group([0, -UL, front ? -0.05 : 0.1], g);
    const HK = LL * 0.5;
    const low = front
      ? [[0, 0.03, 0, 0.06 * t, 0.065 * t, 0.07 * t], [0, -LL * 0.55, 0.01, 0.045 * t, 0.045 * t, 0.05 * t], [0, -LL + 0.03, 0.02, 0.04 * t, 0.042 * t, 0.042 * t], [0, -LL, 0.04, 0.045 * t, 0.05 * t, 0.04 * t]]
      : [[0, 0.03, 0, 0.055 * t, 0.06 * t, 0.065 * t], [0, -HK * 0.55, -0.08, 0.045 * t, 0.042 * t, 0.06 * t], [0, -HK, -0.16, 0.035 * t, 0.035 * t, 0.05 * t], [0, -LL + 0.03, -0.1, 0.035 * t, 0.035 * t, 0.037 * t], [0, -LL, -0.07, 0.04 * t, 0.045 * t, 0.037 * t]];
    const pz = front ? 0.07 : -0.03;
    g.add(M(merge([paint(loftY(up, 12), BELLY, FUR)])));
    k.add(M(merge([paint(loftY(low, 10), C.anat === 'wolf' ? FURL : FUR, C.anat === 'wolf' ? BELLY : FUR),
      kit.bbox(0.12 * Math.sqrt(t), 0.06, 0.15 * Math.sqrt(t), 0.025, SKIN, [0, -LL - 0.03, pz], 0, { top: FUR }),
      ...[-0.04, -0.013, 0.013, 0.04].map(cx => part(new THREE.ConeGeometry(0.012 * Math.sqrt(t), 0.06, 4), 0x2a2420, [cx * Math.sqrt(t), -LL - 0.05, pz + 0.075 * Math.sqrt(t)], [Math.PI / 2 + 0.3, 0, 0], 1, { top: BONE }))])));
    // пряди: на локте/«штанах» сзади, вниз
    const B = fb(g);
    for (let i = 0; i < 2; i++) tuft(B, V(sx * 0.02 * (i ? -1 : 1), -UL * (front ? 0.75 : 0.45), (front ? -0.07 : -0.11) * t), V(sx * 0.3 * (i ? -1 : 1), 0, -1), V(0, -1, -0.5), 0.13 * Math.sqrt(t), FLEN * (front ? 1.0 : 1.3), { strip: C.stripMane ?? 'long', lift: 0.25 });
    g.knee = k; legs.push(g); return g;
  }
  const FL = leg(true, 1), FR = leg(true, -1), BL = leg(false, 1), BR = leg(false, -1);

  // ---------- пряди по силуэту
  const B = fb(body), HB = fb(head), W0 = (C.cardW ?? 0.2) * Math.sqrt(T), SM = C.stripMane ?? 'long';
  const up = Math.PI / 2;
  // гребень: от шеи к крупу, длиннее на загривке (у кабана — щетина торчком по всей спине)
  const crestN = C.anat === 'boar' ? 9 : 7, crest0 = zMax - 0.06, crest1 = C.anat === 'boar' ? zMin + 0.2 : 0.0;
  for (let i = 0; i < crestN; i++) {
    const f = i / (crestN - 1), z = lerp(crest0, crest1, f), [p, n] = surf(BS, z, up);
    const len = FLEN * (C.crestL ?? 1.8) * (1.15 - f * 0.55);
    for (const sx of [-1, 1]) tuft(B, p.clone().add(V(sx * 0.03, 0, 0)), V(sx * 0.5, 1, 0), V(0, C.anat === 'boar' ? 0.6 : -0.05, -1), W0, len, { strip: SM, lift: C.anat === 'boar' ? 0.9 : 0.25, droop: C.anat === 'boar' ? 0.05 : 0.3 });
  }
  // бока и брюхо: бахрома вниз (медведь — длинная, у волка — короткая на груди)
  const fringe = C.anat === 'bear' ? 9 : C.anat === 'beast' ? 6 : 4;
  for (let i = 0; i < fringe; i++) for (const sx of [-1, 1]) {
    const z = lerp(zMax - 0.15, C.anat === 'bear' ? zMin + 0.25 : 0.0, i / Math.max(1, fringe - 1)), a = sx > 0 ? -0.55 : Math.PI + 0.55, [p, n] = surf(BS, z, a);
    tuft(B, p, n, V(0, -1, -0.35), W0 * 1.1, FLEN * (C.anat === 'bear' ? 1.6 : 1.1), { strip: C.strip ?? 'short', lift: 0.15 });
  }
  // плечи/горб: два ряда наискосок назад
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const z = zMax - 0.12 - i * 0.12, a = sx > 0 ? 0.75 : Math.PI - 0.75, [p, n] = surf(BS, z, a); tuft(B, p, n, V(0, -0.6, -1), W0, FLEN * 1.3, { strip: C.strip ?? 'short' }); }
  // грудь (волки, зверь): воротник вниз
  if (C.anat !== 'boar') for (let i = 0; i < 5; i++) { const a = -up + (i - 2) * 0.35, [p, n] = surf(BS, zMax - 0.04, a); tuft(B, p, n.clone().add(V(0, 0, 0.6)).normalize(), V(0, -1, -0.2), W0 * 1.1, FLEN * (C.anat === 'bear' ? 1.3 : 1.6), { strip: C.stripCollar ?? SM, lift: 0.2 }); }
  // голова: баки (назад от щёк), грива на шее сверху
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = ex - 0.1 - i * 0.07, a = sx > 0 ? -0.35 + i * 0.25 : Math.PI + 0.35 - i * 0.25, [p, n] = surf(HS, z, a);
    tuft(HB, p, n, V(sx * 0.25, -0.35, -1), 0.14 * Math.sqrt(T), FLEN * 1.2, { strip: C.stripCheek ?? SM, lift: 0.35 });
  }
  for (let i = 0; i < 4; i++) { const z = 0.16 - i * 0.12, [p] = surf(HS, z, up); for (const sx of [-1, 1]) tuft(HB, p.clone().add(V(sx * 0.03, -0.01, 0)), V(sx * 0.5, 1, 0), V(0, -0.1, -1), W0, FLEN * (C.crestL ?? 1.8) * (C.anat === 'boar' ? 1 : 1.2), { strip: SM, lift: C.anat === 'boar' ? 0.8 : 0.3 }); }
  // хвост: пряди вдоль хвоста
  { const TB = fb(tailIn), n = bushy ? 6 : C.anat === 'boar' ? 1 : 3; for (let i = 0; i < n; i++) { const z = -TL.len * (0.2 + 0.8 * (i + 0.5) / n), s = at(TS, z); for (const a of bushy ? [up, up + 2.1, up - 2.1] : [up]) { const [u, v, nn] = ringPt(s, a); tuft(TB, V(u, v, z), nn, V(0, 0, -1), 0.16, FLEN * (bushy ? 1.6 : 1.2) * (C.anat === 'boar' ? 0.8 : 1), { strip: C.stripTail ?? SM, lift: 0.2, droop: 0.1 }); } } }

  for (const [bone, b] of FB) {
    const g = b.geometry(); if (!g) continue;
    const tg = { gain: 1.5 };
    if (bone === head) { /* баки и грива — цвет шерсти */ } else if (bone === body) FK.tint(g, ID, 1, backBox, 0.6, tg);
    const m = new THREE.Mesh(g, fmat); m.userData.noOutline = true; bone.add(m);
  }

  // ---------- анимация (как у _beast.js)
  let ph = Math.random();
  function pose(a, sp, lunge = 0, rear = 0, roar = 0, hurt = 0) {
    const w = clamp(sp / 2.5);
    if (sp > 0.25) ph = ((ph + (a.back ? -1 : 1) * a.dt * sp / 2.2) % 1 + 1) % 1;
    const th = ph * 6.283, br = Math.sin(a.t * 1.6);
    [[FL, 0], [BR, 0], [FR, Math.PI], [BL, Math.PI]].forEach(([l, o]) => { const s = Math.sin(th + o) * w, fr = l === FL || l === FR; l.rotation.x = s * 0.5 - rear * 0.6 + lunge * (fr ? -0.7 : 0.4); l.knee.rotation.x = (fr ? 1 : -0.7) * Math.max(0, -Math.cos(th + o)) * 0.75 * w + rear * 0.4; });
    body.position.y = BY + Math.abs(Math.sin(th)) * 0.05 * w + br * 0.012 + rear * 0.25 - lunge * 0.1;
    body.position.z = lunge * 0.5; body.rotation.x = -rear * 0.35 + lunge * 0.2 + hurt * -0.2; body.rotation.z = Math.sin(th) * 0.035 * w;
    head.rotation.x = -roar * 0.6 + lunge * 0.25 + Math.sin(a.t * 1.1) * 0.04 - rear * 0.2 + 0.08 * w; head.rotation.y = Math.sin(a.t * 0.7) * 0.1 * (1 - w);
    jaw.rotation.x = 0.04 + roar * 0.55 + lunge * 0.45 + rear * 0.25;
    tail.rotation.y = Math.sin(a.t * 2 + th) * (0.25 + 0.3 * w); tail.rotation.x = 0.25 * rear;
    spin.rotation.set(0, 0, 0); spin.position.y = 0.7;
  }
  const anims = {
    idle: a => pose(a, 0),
    walk: a => pose(a, a.speed),
    attack: a => { const k = a.k, r = smooth(k / 0.45) * (1 - smooth((k - 0.45) / 0.1)), l = smooth((k - 0.42) / 0.12) * (1 - smooth((k - 0.6) / 0.4)); pose(a, 0, l, r); },
    hit: a => pose(a, 0, 0, 0, 0, 1 - a.k),
    cast: a => pose(a, 0, 0, smooth(a.k / 0.3) * 0.6, smooth(a.k / 0.4) * (1 - smooth((a.k - 0.8) / 0.2))),
    death: a => { const e = smooth(Math.min(1, (a.k ?? 1) / 0.7)); pose(a, 0, 0, 0, 0, 0.5); spin.rotation.z = Math.PI / 2 * 0.92 * e; spin.position.y = lerp(0.7, 0.45 * BY, e); jaw.rotation.x = 0.5 * e; },
  };
  root.scale.setScalar(SC);
  return {
    root, height: 1.7 * SC, radius: 0.45 * SC, shadow: 2.0 * SC, materials: [mat, fmat, ...(dmat ? [dmat] : [])],
    sockets: {}, bones: { spin, body, head, jaw, tail, FL, FR, BL, BR, kFL: FL.knee, kFR: FR.knee, kBL: BL.knee, kBR: BR.knee },
    clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.8, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 1.0, fire: 0.4 } },
    anims,
  };
}
