// Кузница: каменная мастерская под тёмной дранкой (_cottage.js) и открытый навес на столбах у торца (+x), под которым стоит горн
// (отдельный предмет «forge» — его ставит генератор деревни вместе со светом). Вывеска «КУЗНИЦА», инструменты на стене.
// Фундамент 7,8 × 4,6 м: мастерская занимает x ∈ [−3,9; 0,9], навес — [0,9; 3,9]. Фасад — +z.
import { cottageParts, cottageProxy } from './_cottage.js';
import { sign } from './_sign.js';
const OPTS = { w: 4.8, d: 4.6, seed: 23, walls: 'stone', stone: 0x5a5448, stoneTop: 0xa49880, roof: 0x3a2a1e, roofTop: 0x7a5a3a, roofTex: 'roof', chimney: -1, bench: false, shutter: 0x3a3a3a, shutterL: 0x6a6a6a, doorU: -0.6 };
export default { id: 'smithy', kind: 'prop', outline: false,
  shadowProxy(kit) { const { merge, part, THREE } = kit; return merge([cottageProxy(kit, OPTS, -1.5), part(new THREE.BoxGeometry(3.2, 0.3, 4.8), 0, [2.4, 3.1, 0])]); },
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, { L, smoke } = cottageParts(kit, OPTS);
    for (const g of L) g.translate(-1.5, 0, 0);
    const T = 0x3a2416, TL = 0x74502e, x0 = 0.95, x1 = 3.9;
    for (const x of [x1 - 0.1]) for (const z of [-2.15, 2.15]) L.push(bbox(0.2, 2.75, 0.2, 0.03, T, [x, 1.375, z], 0, { top: TL, tex: 'wood' }));
    for (const z of [-2.15, 2.15]) L.push(bbox(x1 - x0 + 0.2, 0.18, 0.16, 0.03, T, [(x0 + x1) / 2, 2.8, z], 0, { top: TL, tex: 'woodH' }));
    for (const z of [-2.15, 2.15]) { const g = geo.chamferBox(0.1, 0.9, 0.1, 0.02); g.rotateZ(0.8); L.push(geo.paint(g.translate(x1 - 0.45, 2.45, z), T, { top: TL, tex: 'wood' })); }
    // односкатная крыша навеса: от стены мастерской (3,4 м) к столбам (2,95 м), доски-дранка рядами
    const rw = x1 - x0 + 0.5, ang = Math.atan2(3.45 - 2.95, rw);
    for (let i = 0; i < 6; i++) { const g = geo.chamferBox(rw / 6 * 1.3, 0.1, 5.2, 0.02); g.rotateZ(-ang); const x = x0 - 0.1 + (i + 0.5) * rw / 6; L.push(geo.paint(g.translate(x, 3.45 - (x - x0 + 0.1) * Math.tan(ang) + 0.04 * (i % 2), 0), i % 2 ? 0x3a2a1e : 0x4a3424, { top: 0x7a5a3a, tex: 'roof' })); }
    // инструменты на стене мастерской под навесом: молоты, клещи, подкова
    const wx = x0 + 0.04;
    for (let i = 0; i < 4; i++) { const z = -1.2 + i * 0.6; L.push(bbox(0.04, 0.7, 0.05, 0.01, 0x5a3a22, [wx, 1.9, z], 0, { top: 0x8a6a40, tex: 'wood' }), bbox(0.1, 0.12, i % 2 ? 0.3 : 0.2, 0.02, 0x24242a, [wx + 0.03, 2.25, z], 0, { top: 0x6a6a74, tex: 'iron' })); }
    L.push(part(new THREE.TorusGeometry(0.16, 0.035, 5, 10, Math.PI * 1.4), 0x4a4a52, [wx + 0.03, 2.75, 0.6], [0, Math.PI / 2, -Math.PI * 0.2], 1, { top: 0x9a9aa4, tex: 'iron' }));
    L.push(part(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), 0x7a7462, [x1 - 0.6, 0.62, -1.6], [Math.PI / 2, 0, 0], 1, { top: 0xb8ae96, tex: 'stone' }), bbox(0.5, 0.56, 0.3, 0.03, T, [x1 - 0.6, 0.28, -1.6], 0, { top: TL, tex: 'wood' }));   // точило
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    const s = sign(kit, this, ['КУЗНИЦА'], 1.5, 0.42); s.position.set(-0.45, 2.62, OPTS.d / 2 + 0.06); root.add(s);   // на стене мастерской над окном — не заслоняет горн
    if (smoke) root.userData.smoke = [[smoke[0] - 1.5, smoke[1], smoke[2]]];   // дым только из трубы мастерской
    return { root };
  } };
