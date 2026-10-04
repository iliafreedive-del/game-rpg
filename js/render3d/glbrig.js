// Модели Meshy без скелета на СВОИХ ригах игры (не на скелете волка):
//  • beastGlb — кабаны и медведь: тот же риг, что у прежних процедурных зверей (_beast.js): корпус, голова, хвост, четыре лапы
//    с коленом; та же анимация (ходьба диагональными парами, рывок-укус, рёв на дыбах, удар, смерть на бок).
//    Кости ставятся по самой сетке: столбы лап ищутся у земли, шея — перед передними лапами, хвост — за задними; веса плавные.
//  • scorpGlb — скорпион: восемь ног веером качаются вперёд-назад целиком (без суставов, волной от задней к передней), клешни бьют выпадом
//    вперёд. Сетка скорпиона Meshy — из отдельных кусков-сегментов: куски размечены по образцу (лишние длинные ноги
//    убираются), на сторону остаются 4 опорные ноги и клешня.
// Сетка и текстура — из GLB (glbmob.meshData), разметка костей считается один раз на модель. Обводка — копия со сглаженными
// по положению нормалями (у Meshy на швах вершины раздвоены — обычная обводка там рвётся тёмными щелями).
import * as THREE from '../vendor/three.module.min.js';
import { toon, outline } from './toon.js';
import { OUTLINE } from './style.js';
import { clamp, smooth, lerp } from './rig.js';

const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const CACHE = new Map();

// сетка: лапы на земле (y = 0), по центру, голова в +Z, рост H
function prep(kit, name, H) {
  const d = kit.mob.meshData(name); if (!d) return null;
  const g = d.geometry.clone(); g.computeBoundingBox(); const bb = g.boundingBox, k = H / (bb.max.y - bb.min.y);
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); g.scale(k, k, k); g.computeBoundingBox();
  return { g, map: d.map };
}
// нормали обводки: среднее по всем вершинам в одной точке
function outlineGeo(g) {
  const o = g.clone(), p = g.attributes.position, n = g.attributes.normal, m = new Map(), out = new Float32Array(p.count * 3), key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) { const kk = key(i), a = m.get(kk) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); m.set(kk, a); }
  for (let i = 0; i < p.count; i++) { const a = m.get(key(i)), l = Math.hypot(...a) || 1; out.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
  o.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return o;
}
// сетка со скелетом: bones[0] — корень (в него вложены остальные), веса уже в геометрии
function skinned(D, bones, o, H) {
  const mat = toon(o.tint ?? 0xffffff, { rim: o.rim ?? 0.55, rimColor: o.rimColor ?? 0xffe2b8, side: THREE.DoubleSide, ao: 0.75, aoH: 0.5 });
  mat.map = D.map; if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.SkinnedMesh(D.g, mat); mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.noBake = true; mesh.userData.noOutline = true;
  const ol = new THREE.SkinnedMesh(D.og, outline({ width: (o.outline ?? OUTLINE.mob) * Math.min(1, H / 1.2), color: OUTLINE.heroColor }));
  ol.userData.isOutline = true; ol.userData.noBake = true; ol.frustumCulled = false; mesh.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);
  return { mesh, mat };
}
const CLIPS = () => ({ idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.8, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1.0 }, cast: { dur: 1.0, fire: 0.4 } });

// ---------- звери: риг _beast.js ----------
// кости: 0 spin, 1 body, 2 head, 3 tail, 4–7 бёдра FL FR BL BR, 8–11 колени
function beastRig(kit, name, H) {
  const ck = name + ':beast:' + H; if (CACHE.has(ck)) return CACHE.get(ck);
  const D = prep(kit, name, H); if (!D) return null;
  const g = D.g, p = g.attributes.position, n = p.count, L = g.boundingBox.max.z - g.boundingBox.min.z;
  // столбы лап: вершины ниже четверти роста, по четвертям (лево/право × перёд/зад)
  let zm = 0, c0 = 0; for (let i = 0; i < n; i++) if (p.getY(i) < H * 0.22) { zm += p.getZ(i); c0++; } zm /= c0 || 1;
  const col = [0, 1, 2, 3].map(() => ({ x: 0, z: 0, n: 0, r: 0 })), q = (x, z) => (z > zm ? 0 : 2) + (x > 0 ? 0 : 1);   // 0 FL(+x) 1 FR 2 BL 3 BR
  for (let i = 0; i < n; i++) if (p.getY(i) < H * 0.22) { const c = col[q(p.getX(i), p.getZ(i))]; c.x += p.getX(i); c.z += p.getZ(i); c.n++; }
  for (const c of col) { c.x /= c.n || 1; c.z /= c.n || 1; }
  for (let i = 0; i < n; i++) if (p.getY(i) < H * 0.22) { const c = col[q(p.getX(i), p.getZ(i))]; c.r += (p.getX(i) - c.x) ** 2 + (p.getZ(i) - c.z) ** 2; }
  for (const c of col) c.r = Math.sqrt(c.r / (c.n || 1)) * 1.6 + 0.02 * H;
  const hipY = H * 0.5, kneeY = H * 0.24, zNeck = Math.max(col[0].z, col[1].z) + L * 0.1, zTail = Math.min(col[2].z, col[3].z) - L * 0.12;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  let ty = 0, tn = 0;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), li = q(x, z), c = col[li], d = Math.hypot(x - c.x, z - c.z);
    let wl = (1 - ss(hipY - H * 0.14, hipY + H * 0.02, y)) * Math.max(1 - ss(c.r * 0.8, c.r * 1.3, d), 1 - ss(kneeY, kneeY + H * 0.1, y));
    const wk = wl * (1 - ss(kneeY - H * 0.05, kneeY + H * 0.05, y)); wl -= wk;
    const rest = 1 - wl - wk, wh = rest * ss(zNeck - L * 0.06, zNeck + L * 0.06, z), wt = rest * ss(zTail + L * 0.03, zTail - L * 0.05, z) * ss(H * 0.2, H * 0.35, y);
    if (wt > 0.5) { ty += y; tn++; }
    si.set([1, wh >= wt ? 2 : 3, 4 + li, 8 + li], i * 4); sw.set([rest - wh - wt, Math.max(wh, wt), wl, wk], i * 4);
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.computeBoundingSphere(); D.og = outlineGeo(g);
  D.rig = { col, hipY, kneeY, zNeck, zTail, tailY: tn ? ty / tn : H * 0.6, L };
  CACHE.set(ck, D); return D;
}

/** Зверь Meshy на риге прежнего процедурного зверя. o: { height — рост (м), radius, shadow, tint, rimColor } */
export function beastGlb(kit, name, o = {}) {
  const H = o.height ?? 1.2, D = beastRig(kit, name, H); if (!D) return null;
  const R = D.rig, s = H / 1.7, B = () => new THREE.Bone();
  const spin = B(), body = B(), head = B(), tail = B(), hips = [0, 1, 2, 3].map(B), knees = [0, 1, 2, 3].map(B);
  const Y0 = H * 0.6, P0 = H * 0.45;   // корпус и ось «завалиться на бок» — как у процедурного (1,0 и 0,7 при росте 1,7)
  spin.position.set(0, P0, 0); spin.add(body); body.position.set(0, Y0 - P0, 0);
  head.position.set(0, H * 0.62 - Y0, R.zNeck); tail.position.set(0, R.tailY - Y0, R.zTail); body.add(head, tail);
  hips.forEach((h, i) => { h.position.set(R.col[i].x, R.hipY - Y0, R.col[i].z); body.add(h); knees[i].position.set(0, R.kneeY - R.hipY, 0); h.add(knees[i]); });
  const { mesh, mat } = skinned(D, [spin, body, head, tail, ...hips, ...knees], o, H);
  const root = new THREE.Group(); root.add(mesh);
  const [FL, FR, BL, BR] = hips.map((h, i) => (h.knee = knees[i], h));
  let ph = Math.random();
  // то же, что pose() в _beast.js; сдвиги корпуса — в долях роста
  function pose(a, sp, lunge = 0, rear = 0, roar = 0, hurt = 0) {
    const w = clamp(sp / 2.5);
    if (sp > 0.25) ph = ((ph + (a.back ? -1 : 1) * a.dt * sp / (2.2 * Math.max(0.7, s))) % 1 + 1) % 1;
    const th = ph * 6.283, br = Math.sin(a.t * 1.6);
    [[FL, 0], [BR, 0], [FR, Math.PI], [BL, Math.PI]].forEach(([l, ofs]) => { const sn = Math.sin(th + ofs) * w; l.rotation.x = sn * 0.55 - rear * 0.6 + lunge * (l === FL || l === FR ? -0.7 : 0.4); l.knee.rotation.x = Math.max(0, -Math.cos(th + ofs)) * 0.7 * w + rear * 0.4; });
    body.position.y = Y0 - P0 + (Math.abs(Math.sin(th)) * 0.06 * w + br * 0.015 + rear * 0.25 - lunge * 0.1) * s;
    body.position.z = lunge * 0.5 * s; body.rotation.x = -rear * 0.35 + lunge * 0.2 + hurt * -0.2; body.rotation.z = Math.sin(th) * 0.04 * w;
    head.rotation.x = -roar * 0.7 + lunge * 0.25 + Math.sin(a.t * 1.1) * 0.04 - rear * 0.2; head.rotation.y = Math.sin(a.t * 0.7) * 0.1 * (1 - w);
    tail.rotation.y = Math.sin(a.t * 2 + th) * (0.25 + 0.3 * w); tail.rotation.x = 0.2 * rear;
    spin.rotation.set(0, 0, 0); spin.position.y = P0;
  }
  const anims = {
    idle: a => pose(a, 0),
    walk: a => pose(a, a.speed),
    attack: a => { const k = a.k ?? 0, r = smooth(k / 0.45) * (1 - smooth((k - 0.45) / 0.1)), l = smooth((k - 0.42) / 0.12) * (1 - smooth((k - 0.6) / 0.4)); pose(a, 0, l, r); },
    hit: a => pose(a, 0, 0, 0, 0, 1 - (a.k ?? 1)),
    cast: a => pose(a, 0, 0, smooth((a.k ?? 0) / 0.3) * 0.6, smooth((a.k ?? 0) / 0.4) * (1 - smooth(((a.k ?? 0) - 0.8) / 0.2))),
    death: a => { const e = smooth(Math.min(1, (a.k ?? 1) / 0.7)); pose(a, 0, 0, 0, 0, 0.5); spin.rotation.z = Math.PI / 2 * 0.92 * e; spin.position.y = lerp(P0, P0 * 0.64, e); },
  };
  return {
    root, height: H, radius: o.radius ?? H * 0.3, shadow: o.shadow ?? H * 1.4, materials: [mat],
    sockets: {}, bones: { spin, body, head, tail, FL, FR, BL, BR }, clips: CLIPS(), anims, glb: name,
  };
}

// ---------- скорпион ----------
// кости: 0 корень, 1 корпус, 2–3 клешни (лев +x, прав −x), 4… ноги
function scorpRig(kit, name, H) {
  const ck = name + ':scorp:' + H; if (CACHE.has(ck)) return CACHE.get(ck);
  const D = prep(kit, name, H); if (!D) return null;
  const g = D.g, p = g.attributes.position, n = p.count, bb = g.boundingBox, W = bb.max.x - bb.min.x, L = bb.max.z - bb.min.z;
  // куски: вершины, связанные треугольниками (совпадающие по положению — одна)
  const key = new Map(), rid = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; if (!key.has(k)) key.set(k, key.size); rid[i] = key.get(k); }
  const par = Int32Array.from({ length: key.size }, (_, i) => i), f = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const a = f(rid[I[t]]); par[f(rid[I[t + 1]])] = a; par[f(rid[I[t + 2]])] = a; }
  const pcs = new Map(); for (let i = 0; i < n; i++) { const r = f(rid[i]); if (!pcs.has(r)) pcs.set(r, []); pcs.get(r).push(i); }
  const P = [...pcs.values()].map(v => { let x = 0, y = 0, z = 0, ax = 0; for (const i of v) { x += p.getX(i); y += p.getY(i); z += p.getZ(i); ax = Math.max(ax, Math.abs(p.getX(i))); } return { v, x: x / v.length, y: y / v.length, z: z / v.length, ax, lab: -1 }; });
  P.sort((a, b) => b.v.length - a.v.length);
  // У Meshy-скорпиона на каждой стороне по 7 ног: 3 длинные «горизонтальные» (концы висят в воздухе, сверху лежат поверх
  // остальных) и 4 опорные до земли; сбоку это и было «6 лап, две друг на друге». Оставляем опорные 4, длинные убираем.
  // Модель одна и та же, поэтому куски размечены по образцу: центр куска (сторона +x, рост 1,8 м) → класс:
  // 'x' — убрать, 0…3 — нога спереди назад, 'c' — клешня, 'b' — корпус. Кусок берёт класс ближайшего образца (стороны
  // модели не строго зеркальны); далёкие от всех образцов (хвост, спина) — корпус.
  const TPL = [
    ['x', .32, .67, .39], ['x', .48, .70, .24], ['x', .80, .73, .37], ['x', .99, .56, .44], ['x', .27, .61, .10], ['x', .49, .78, .09],
    ['x', .77, .80, .09], ['x', 1.0, .60, .10], ['x', .34, .66, -.26], ['x', .51, .74, -.20], ['x', .81, .76, -.29], ['x', 1.01, .58, -.25],
    [0, .41, .53, .20], [0, .55, .37, .26], [0, .62, .17, .30],
    [1, .29, .62, -.04], [1, .42, .55, -.03], [1, .51, .41, -.05], [1, .63, .17, -.04],
    [2, .42, .54, -.40], [2, .45, .35, -.53], [2, .45, .14, -.61],
    [3, .45, .72, -.48], [3, .51, .65, -.68], [3, .53, .42, -.86], [3, .50, .20, -.98],
    ['c', .36, .43, .89], ['c', .57, .56, .68], ['c', .48, .72, .44], ['c', .35, .57, .72], ['c', .24, .51, .81], ['b', .25, .61, .22],
    ['x', -.65, .67, .36], ['x', -.86, .68, .47],   // x < 0 — только для стороны −x (там передняя длинная нога сдвинута)
  ];
  const u = H / 1.8, del = new Uint8Array(n);
  for (const c of P) {
    if (c === P[0]) { c.cls = 'b'; continue; }
    let bd = Infinity; for (const [k, x, y, z] of TPL) { if (x < 0 && c.x > 0) continue; const d = Math.hypot((x < 0 ? c.x : Math.abs(c.x)) - x * u, c.y - y * u, c.z - z * u); if (d < bd) { bd = d; c.cls = k; } }
    if (bd > 0.12 * u) c.cls = c.z > 0.4 * u && Math.abs(c.x) > 0.15 * u ? 'c' : 'b';   // крупные куски клешни у правой стороны смещены сильнее
    if (c.cls === 'x') for (const i of c.v) del[i] = 1;
  }
  { const keep = []; for (let t = 0; t < I.length; t += 3) if (!del[I[t]] && !del[I[t + 1]] && !del[I[t + 2]]) keep.push(I[t], I[t + 1], I[t + 2]); g.setIndex(keep); }
  const bone = new Int32Array(n).fill(1), legs = [], claws = [null, null];
  const pivotOf = mem => { let pv = null; for (const c of mem) for (const i of c.v) if (pv == null || Math.abs(p.getX(i)) < Math.abs(p.getX(pv))) pv = i; return new THREE.Vector3(p.getX(pv), p.getY(pv), p.getZ(pv)); };
  for (const side of [0, 1]) {
    const mine = P.filter(c => (c.x > 0 ? 0 : 1) === side);
    const cl = mine.filter(c => c.cls === 'c'); if (cl.length) claws[side] = { pcs: cl, pivot: pivotOf(cl), bone: 2 + side };
    for (let k = 0; k < 4; k++) {
      const mem = mine.filter(c => c.cls === k); if (!mem.length) continue;
      const foot = mem.reduce((a, c) => (c.y < a.y ? c : a));
      legs.push({ ch: { pcs: mem, pivot: pivotOf(mem) }, side, k, foot });
    }
  }
  legs.forEach((l, i) => (l.ch.bone = 4 + i));
  // веер: две задние ноги у Meshy идут назад одна за другой (сверху сливаются), поэтому в покое нога доворачивается так,
  // чтобы ступня смотрела на свой угол FAN от сустава (k = 0 — передняя; 0° — вбок, + вперёд)
  const FAN = [40, 5, -30, -70];
  for (const l of legs) {
    const ta = Math.atan2(l.foot.z - l.ch.pivot.z, Math.abs(l.foot.x - l.ch.pivot.x));
    l.fan = clamp(FAN[l.k] / 57.3 - ta, -0.6, 0.6);
  }
  for (const ch of [...claws.filter(Boolean), ...legs.map(l => l.ch)]) for (const c of ch.pcs) for (const i of c.v) bone[i] = ch.bone;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = bone[i]; sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.computeBoundingSphere(); D.og = outlineGeo(g);
  D.rig = { claws: [0, 1].map(s => claws[s]?.pivot || new THREE.Vector3((s ? -1 : 1) * W * 0.15, H * 0.2, L * 0.2)), legs: legs.map(l => ({ side: l.side, k: l.k, fan: l.fan, pivot: l.ch.pivot })), L, W };
  CACHE.set(ck, D); return D;
}

/** Скорпион Meshy на своём простом риге. o: { height — рост с поднятым хвостом (м), radius, shadow, tint, rimColor } */
export function scorpGlb(kit, name, o = {}) {
  const H = o.height ?? 1.2, D = scorpRig(kit, name, H); if (!D) return null;
  const R = D.rig, s = H / 1.2, B = () => new THREE.Bone();
  const spin = B(), body = B(), claws = [B(), B()], legs = R.legs.map(B);
  const Y0 = H * 0.3; spin.position.set(0, Y0, 0); spin.add(body); body.position.set(0, -Y0, 0);
  claws.forEach((c, i) => { c.position.copy(R.claws[i]); body.add(c); });
  legs.forEach((l, i) => { l.position.copy(R.legs[i].pivot); body.add(l); });
  const { mesh, mat } = skinned(D, [spin, body, ...claws, ...legs], o, H);
  const root = new THREE.Group(); root.add(mesh);
  let ph = Math.random();
  // ноги: качаются вокруг вертикали у корпуса (вперёд-назад), через одну в противофазе; на взмахе вперёд чуть приподнимаются.
  // клешни: выпад — рывок вперёд по своей оси и чуть вниз; левая чуть раньше правой
  function pose(a, sp, strike = 0, rear = 0, hurt = 0, dead = 0) {
    const w = clamp(sp / 2);
    if (sp > 0.2) ph = ((ph + (a.back ? -1 : 1) * a.dt * sp / (1.1 * s)) % 1 + 1) % 1;
    const th = ph * 6.283, br = Math.sin(a.t * 2.1);
    legs.forEach((l, i) => {
      // волна от задней ноги к передней (сдвиг фазы 90°): соседние ноги не сходятся навстречу и не перекрещиваются
      const { side, k, fan } = R.legs[i], sg = side ? -1 : 1, o = th - k * Math.PI / 2 + side * Math.PI, sw = fan + Math.sin(o) * w * 0.2 + Math.sin(a.t * 1.3 + i) * 0.03 * (1 - w);
      l.rotation.set(0, 0, 0);
      l.rotation.y = -sg * sw;                                      // вперёд-назад (для левой и правой стороны — в разные стороны)
      l.rotation.z = sg * (Math.max(0, Math.cos(o)) * 0.15 * w + dead * (0.35 + 0.05 * k));   // подъём на взмахе; смерть — поджать
    });
    claws.forEach((c, i) => {
      const st = smooth(strike * 1.15 - i * 0.15), sg = i ? -1 : 1;
      c.position.copy(R.claws[i]); c.position.z += st * 0.22 * R.L; c.position.y -= st * 0.03 * H;
      c.rotation.set(st * 0.18 - rear * 0.5 + br * 0.03, sg * (0.06 * Math.sin(a.t * 1.7 + i) - st * 0.12), 0);
    });
    body.position.set(0, -Y0 + br * 0.006 * s + rear * 0.08 * H - dead * 0.15 * H, strike * 0.08 * R.L - hurt * 0.08 * R.L);
    body.rotation.set(-rear * 0.25 + strike * 0.08 - hurt * 0.12, 0, Math.sin(th) * 0.03 * w);
    spin.rotation.set(0, 0, dead * 0.12); spin.position.y = Y0;
  }
  const anims = {
    idle: a => pose(a, 0),
    walk: a => pose(a, a.speed),
    // удар клешнями: короткий отвод назад, выпад вперёд к 0,5 (момент удара), возврат
    attack: a => { const k = a.k ?? 0, back = smooth(k / 0.3) * (1 - smooth((k - 0.32) / 0.1)), hit = smooth((k - 0.34) / 0.14) * (1 - smooth((k - 0.62) / 0.35)); pose(a, 0, hit - back * 0.35); },
    hit: a => pose(a, 0, 0, 0, 1 - (a.k ?? 1)),
    cast: a => { const k = a.k ?? 0; pose(a, 0, 0, smooth(k / 0.35) * (1 - smooth((k - 0.8) / 0.2))); },
    death: a => pose(a, 0, 0, 0, 0, smooth(Math.min(1, (a.k ?? 1) / 0.7))),
  };
  return {
    root, height: H, radius: o.radius ?? H * 0.4, shadow: o.shadow ?? H * 1.8, materials: [mat],
    sockets: {}, bones: { spin, body }, clips: CLIPS(), anims, glb: name,
  };
}
