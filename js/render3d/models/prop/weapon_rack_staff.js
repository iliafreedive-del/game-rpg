// Стойка с посохами (правки 3): три посоха с навершиями-камнями (светятся), книга заклинаний на полке.
import { rackFrame } from './weapon_rack.js';
export default { id: 'weapon_rack_staff', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, L = rackFrame(kit);
    [[-0.35, PAL.abyss, 0.06], [0, 0x4af0cc, -0.03], [0.35, 0xff9a3c, 0.04]].forEach(([x, gem, tilt]) => L.push(
      part(new THREE.CylinderGeometry(0.03, 0.035, 1.45, 6), 0x4a2a14, [x, 0.8, -0.05], [0, 0, tilt], 1, { top: 0x8a5a2a, tex: 'wood' }),
      part(new THREE.TorusGeometry(0.07, 0.015, 4, 8), PAL.brassD, [x - tilt * 0.75, 1.55, -0.05], 0, 1, { top: PAL.brass }),
      part(new THREE.OctahedronGeometry(0.07, 0), gem, [x - tilt * 0.75, 1.56, -0.05], 0, [1, 1.4, 1], { emit: true })));
    L.push(bbox(0.34, 0.07, 0.26, 0.01, 0x5a1a2a, [0.4, 0.14, 0.1], [0, 0.3, 0], { top: 0x8a2a3a, tex: 'cloth' }), bbox(0.3, 0.05, 0.22, 0.005, 0xe8dcc0, [0.4, 0.14, 0.1], [0, 0.3, 0]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
