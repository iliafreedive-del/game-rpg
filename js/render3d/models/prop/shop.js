// Лавка торговки: двухэтажный дом (_house.js) с прилавком перед фасадом под полосатым навесом. Торговка стоит между
// стеной и прилавком (её ставит генератор деревни), покупатель подходит с улицы. На навесе — вывеска «ЛАВКА». Фасад — +z.
import { house, houseProxy } from './_house.js';
import { sign } from './_sign.js';
const OPTS = { w: 6.0, d: 4.2, floors: 2, dormers: 1, noCanopy: true, ivy: true, wall: 0x7a6a50, wallTop: 0xe4d4b0, roof: 0x2c3a4a, roofTop: 0x5a7490, roofTex: 'tile', shutter: 0x2a4a6a, shutterL: 0x4a7aa8, seed: 8 };
export default { id: 'shop', kind: 'prop', outline: false, opts: OPTS,
  shadowProxy(kit) { return houseProxy(kit, OPTS); },
  build(kit) {
    const { THREE, PAL, part, merge, bbox, geo } = kit, L = [], R = geo.rng(12), z0 = OPTS.d / 2;
    // навес: полосы ткани от стены (3,0 м) к краю (2,35 м), бахрома, два столба
    const AW = 4.4, a0 = z0 + 0.05, a1 = z0 + 2.05, y0 = 3.0, y1 = 2.35, n = 8, ang = Math.atan2(y0 - y1, a1 - a0), sl = Math.hypot(a1 - a0, y0 - y1);
    for (let i = 0; i < n; i++) { const x = -AW / 2 + (i + 0.5) * AW / n, g = geo.chamferBox(AW / n + 0.01, 0.05, sl, 0.01); g.rotateX(ang); L.push(geo.paint(g.translate(x, (y0 + y1) / 2, (a0 + a1) / 2), i % 2 ? 0xe8dcc0 : 0x2a5a8a, { top: i % 2 ? 0xfff4d8 : 0x4a8ac8, tex: 'cloth' })); }
    for (let i = 0; i < n * 2; i++) { const x = -AW / 2 + (i + 0.5) * AW / (n * 2); L.push(part(new THREE.ConeGeometry(0.13, 0.22, 3), Math.floor(i / 2) % 2 ? 0xe8dcc0 : 0x2a5a8a, [x, y1 - 0.12, a1], [Math.PI, 0, 0], [1, 1, 0.3], { tex: 'cloth' })); }
    for (const s of [-1, 1]) L.push(bbox(0.14, y1, 0.14, 0.02, 0x3a2416, [s * (AW / 2 - 0.15), y1 / 2, a1 - 0.08], 0, { top: 0x7a5230, tex: 'wood' }));
    L.push(bbox(AW, 0.12, 0.12, 0.02, 0x3a2416, [0, y1 + 0.02, a1 - 0.08], 0, { top: 0x7a5230, tex: 'woodH' }));
    // прилавок с товарами
    const cz = z0 + 1.25, CW = 3.3;
    L.push(bbox(CW, 0.95, 0.6, 0.03, 0x4a3018, [0, 0.475, cz], 0, { top: 0x8a6a40, tex: 'woodH' }), bbox(CW + 0.14, 0.1, 0.72, 0.03, 0x6a4a2a, [0, 1.0, cz], 0, { top: 0xb08a54, tex: 'woodH' }));
    for (let i = 0; i < 4; i++) L.push(bbox(0.06, 0.8, 0.02, 0.01, 0x3a2416, [-CW / 2 + 0.4 + i * (CW - 0.8) / 3, 0.48, cz + 0.31]));
    const pot = (x, c, h = 0.28) => L.push(part(new THREE.CylinderGeometry(0.07, 0.11, h, 8), c, [x, 1.05 + h / 2, cz - 0.1], 0, 1, { top: 0xffffff }), part(new THREE.SphereGeometry(0.055, 6, 5), 0xd8c8a0, [x, 1.07 + h, cz - 0.1]));
    pot(-1.35, 0xd04a4a); pot(-1.1, 0x4a7ad0); pot(-0.86, 0x4ab04a, 0.22);
    L.push(part(new THREE.CylinderGeometry(0.34, 0.3, 0.16, 10), 0x6a4a2a, [-0.2, 1.13, cz], 0, 1, { top: 0xa07a48, tex: 'wood' }));   // корзина яблок
    for (let i = 0; i < 9; i++) L.push(part(new THREE.SphereGeometry(0.075, 7, 5), i % 3 ? 0xc83a2a : 0x8ab83a, [-0.2 + (R() - 0.5) * 0.4, 1.24 + R() * 0.06, cz + (R() - 0.5) * 0.36], 0, 1, { top: 0xf07a5a }));
    for (let i = 0; i < 3; i++) L.push(part(new THREE.CapsuleGeometry(0.08, 0.26, 3, 6), 0xa8682a, [0.45 + i * 0.22, 1.12, cz - 0.05], [0, 0, Math.PI / 2 + (R() - 0.5) * 0.3], 1, { top: 0xe0a860 }));   // хлеб
    L.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12), 0xd8a830, [1.25, 1.12, cz], 0, 1, { top: 0xf0d070 }));   // сыр
    L.push(part(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4), PAL.brassD, [0.95, 1.25, cz + 0.15]), bbox(0.4, 0.02, 0.02, 0.005, PAL.brassD, [0.95, 1.45, cz + 0.15]), part(new THREE.CylinderGeometry(0.09, 0.06, 0.03, 8), PAL.brass, [0.77, 1.32, cz + 0.15]), part(new THREE.CylinderGeometry(0.09, 0.06, 0.03, 8), PAL.brass, [1.13, 1.32, cz + 0.15]));   // весы
    // подвесы под навесом: травы и колбасы
    for (let i = 0; i < 5; i++) { const x = -1.6 + i * 0.8, y = 2.15 - (i % 2) * 0.18; L.push(part(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 3), 0xe8dcc0, [x, y + 0.25, a1 - 0.35])); L.push(i % 2 ? part(new THREE.ConeGeometry(0.1, 0.34, 5), 0x4a8a3a, [x, y - 0.1, a1 - 0.35], [Math.PI, 0, 0], 1, { top: 0x8ac05a }) : part(new THREE.CapsuleGeometry(0.05, 0.3, 3, 6), 0x7a2a1a, [x, y - 0.12, a1 - 0.35], 0, 1, { top: 0xa84a2a })); }
    const m = house(kit, OPTS), g = new THREE.Group(); g.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    const s = sign(kit, this, ['ЛАВКА'], 1.7, 0.5); s.position.set(0, y1 + 0.42, a1 - 0.02); s.rotation.x = -0.15; g.add(s);
    m.root.add(g); return m;
  } };
