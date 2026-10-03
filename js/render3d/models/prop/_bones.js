// Заготовки для Костяных пустошей: череп, ребро, позвонок, бивень, клык. Каждая функция дописывает части в список L
// (их потом сливает merge) и ничего не создаёт сама. Кость красится цветами PAL.bone/boneD — фактура «кость» ставится сама (geo.js AUTO_TEX).
// Череп смотрит в +Z. s — масштаб (1 = человеческий череп ~0.25 м; у великана s = 8…10).
const BONE = 0xe8dcc0, BONED = 0xa89a7c, OLD = 0x8a7a5c, HOLE = 0x0c0806;

export function skull(kit, L, p, s = 1, o = {}) {
  const { THREE, part } = kit, [x, y, z] = p, ry = o.ry || 0, c = Math.cos(ry), sn = Math.sin(ry);
  const at = (dx, dy, dz) => [x + dx * s * c + dz * s * sn, y + dy * s, z - dx * s * sn + dz * s * c];
  const B = { top: o.top ?? BONE, tex: 'bone' }, col = o.col ?? BONED;
  const sg = o.seg || 1;   // у черепа великана — больше граней
  L.push(part(new THREE.SphereGeometry(0.13 * s, 12 * sg, 9 * sg), col, at(0, 0.06, -0.02), [0, ry, 0], [1, 0.92, 1.12], B));   // свод
  L.push(part(new THREE.SphereGeometry(0.1 * s, 10 * sg, 7 * sg), col, at(0, -0.01, 0.07), [0, ry, 0], [1.05, 0.9, 0.9], B));   // лицо
  L.push(part(new THREE.CylinderGeometry(0.016 * s, 0.02 * s, 0.17 * s, 6), col, at(0, 0.045, 0.125), [0, ry, Math.PI / 2], [1, 1, 0.8], B));   // надбровная дуга
  for (const k of [-1, 1]) {
    L.push(part(new THREE.SphereGeometry(0.04 * s, 8, 6), o.eye ?? HOLE, at(k * 0.047, 0.0, 0.132), [0, ry, 0], [1, 0.95, 0.55], o.eye ? { emit: true } : {}));   // глазницы
    L.push(part(new THREE.SphereGeometry(0.03 * s, 6, 4), col, at(k * 0.085, -0.03, 0.1), [0, ry, 0], [1.2, 0.7, 1], B));   // скулы
  }
  L.push(part(new THREE.ConeGeometry(0.018 * s, 0.04 * s, 3), HOLE, at(0, -0.045, 0.15), [Math.PI, ry, 0]));   // нос
  if (o.jaw !== false) {
    L.push(part(new THREE.BoxGeometry(0.13 * s, 0.035 * s, 0.1 * s), col, at(0, -0.1, 0.06), [0.12, ry, 0], 1, B));   // нижняя челюсть
    for (let i = 0; i < 6; i++) L.push(part(new THREE.BoxGeometry(0.014 * s, 0.024 * s, 0.012 * s), o.top ?? BONE, at(-0.04 + i * 0.016, -0.075, 0.132 - Math.abs(i - 2.5) * 0.006), [0, ry, 0]));   // зубы
  }
  if (o.horns) for (const k of [-1, 1]) L.push(kit.tube([at(k * 0.1, 0.1, 0), at(k * 0.22, 0.2, -0.04), at(k * 0.26, 0.36, 0.06)], 0.035 * s, 0.006 * s, OLD, { top: BONE, tex: 'bone' }, 6));
}

// ребро: дуга от позвоночника (a) вниз-наружу; side — ±1 (лево/право), len — длина, r — толщина
export function rib(kit, L, a, side, len, r, o = {}) {
  const [x, y, z] = a, d = o.dir || [0, 0, 1], f = o.flare ?? 0.55;
  const pts = [[x, y, z], [x + side * len * 0.35, y + len * 0.05, z + d[2] * len * 0.05], [x + side * len * 0.62, y - len * 0.32, z + d[2] * len * 0.1], [x + side * len * f, y - len * 0.75, z + d[2] * len * 0.14], [x + side * len * (f - 0.1), y - len * 1.0, z + d[2] * len * 0.12]];
  L.push(kit.tube(pts, r, r * 0.45, o.col ?? BONED, { top: o.top ?? BONE, tex: 'bone' }, o.radial || 6));
}

// позвонок: тело-цилиндр, остистый отросток вверх, два поперечных в стороны
export function vertebra(kit, L, p, s = 1, ry = 0, o = {}) {
  const { THREE, part } = kit, [x, y, z] = p, B = { top: o.top ?? BONE }, col = o.col ?? BONED, c = Math.cos(ry), sn = Math.sin(ry);
  L.push(part(new THREE.CylinderGeometry(0.16 * s, 0.18 * s, 0.22 * s, 9), col, [x, y, z], [Math.PI / 2, ry, 0], 1, B));
  L.push(part(new THREE.ConeGeometry(0.06 * s, 0.42 * s, 5), col, [x, y + 0.3 * s, z], [0, ry, 0], [1, 1, 0.6], B));
  for (const k of [-1, 1]) L.push(part(new THREE.ConeGeometry(0.045 * s, 0.32 * s, 5), col, [x + k * 0.22 * s * c, y + 0.08 * s, z - k * 0.22 * s * sn], [0, ry, -k * 1.35], [1, 1, 0.6], B));
}

// бивень/клык: изогнутый рог от основания p, длина len, поворот ry, загиб вверх up
export function tusk(kit, L, p, len, r, ry = 0, up = 0.7, o = {}) {
  const [x, y, z] = p, dx = Math.sin(ry), dz = Math.cos(ry);
  const pts = [[x, y, z], [x + dx * len * 0.4, y + len * up * 0.25, z + dz * len * 0.4], [x + dx * len * 0.75, y + len * up * 0.6, z + dz * len * 0.75], [x + dx * len * 0.85, y + len * up, z + dz * len * 0.85]];
  L.push(kit.tube(pts, r, r * 0.12, o.col ?? BONED, { top: o.top ?? BONE, tex: 'bone' }, o.radial || 7));
}
export const BONE_COL = { BONE, BONED, OLD, HOLE };
