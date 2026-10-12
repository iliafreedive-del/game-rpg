// Стойка с луками (правки 3): два длинных лука на крюках, колчан со стрелами, связка стрел у ножки.
import { rackFrame } from './weapon_rack.js';
export default { id: 'weapon_rack_bow', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge } = kit, L = rackFrame(kit);
    for (const [x, r] of [[0.05, 0.46], [0.42, 0.4]]) {   // лук: дуга из тора (левая половина круга), тетива вертикально по хорде, обмотка рукояти
      L.push(part(new THREE.TorusGeometry(r, 0.025, 4, 12, Math.PI * 0.8), 0x6a3a1a, [x, 0.9, -0.06], [0, 0, Math.PI * 0.6], 1, { top: 0xb07a3a, tex: 'wood' }),
        part(new THREE.CylinderGeometry(0.006, 0.006, 1.9 * r, 3), 0xe8e0c8, [x - 0.31 * r, 0.9, -0.06]),
        part(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6), 0x3a2416, [x - r, 0.9, -0.06], 0, 1, { tex: 'cloth' }));
    }
    const qx = -0.4;   // колчан у левой стойки
    L.push(part(new THREE.CylinderGeometry(0.1, 0.08, 0.6, 8), 0x5a3418, [qx, 0.42, 0.08], [0.18, 0, 0.12], 1, { top: 0x8a5a2a, tex: 'cloth' }), part(new THREE.TorusGeometry(0.1, 0.015, 4, 10), PAL.brassD, [qx, 0.6, 0.11], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 5; i++) { const a = i * 1.26, x = qx + Math.cos(a) * 0.05 + 0.05, z = 0.12 + Math.sin(a) * 0.05;
      L.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 3), 0x8a6a3a, [x, 0.82, z], [0.18, 0, 0.12]), part(new THREE.ConeGeometry(0.03, 0.08, 3), 0xe84a3a, [x - 0.03, 1.08, z + 0.05], [0.18, 0, 0.12]));
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
