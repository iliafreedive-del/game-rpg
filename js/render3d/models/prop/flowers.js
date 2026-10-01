// Полевые цветы: 7 стеблей с пятилепестковыми головками (белые, бледно-жёлтые, лиловые — в тон Бездне). ≈ 60 треугольников.
import { plantBuilder } from './_plants.js';
export default {
  id: 'flowers', kind: 'prop', batch: true, outline: false, shadow: false, side: 'double', rim: 0.2,
  sway: { base: 0.05, amt: 0.35, flutter: 0.02 }, ao: 0.7, aoH: 0.3,
  build(kit) {
    const { THREE, geo } = kit, R = geo.rng(29), B = plantBuilder(kit);
    const petals = ['#f4f0e0', '#f4f0e0', '#f2e08a', '#c9a8ff', '#f4f0e0'], up = [0, 1, 0];
    for (let k = 0; k < 7; k++) {
      const x = (R() - 0.5) * 0.5, z = (R() - 0.5) * 0.5, h = 0.22 + R() * 0.18, lean = (R() - 0.5) * 0.08, col = petals[Math.floor(R() * petals.length)], r = 0.05 + R() * 0.025;
      const top = [x + lean, h, z + lean];
      B.tri([x - 0.008, 0, z], [x + 0.008, 0, z], top, ['#2a4a1a', '#2a4a1a', '#5a8a30'], [0.3, 0.6, 0.6]);
      for (let i = 0; i < 5; i++) {
        const a0 = i / 5 * 6.283 + k, a1 = a0 + 0.9, a2 = a0 + 0.45;
        B.tri(top, [top[0] + Math.cos(a1) * r, h + 0.01, top[2] + Math.sin(a1) * r], [top[0] + Math.cos(a0) * r, h + 0.01, top[2] + Math.sin(a0) * r], ['#f0c040', col, col], up);
        B.tri(top, [top[0] + Math.cos(a2) * r * 1.25, h + 0.02, top[2] + Math.sin(a2) * r * 1.25], [top[0] + Math.cos(a1) * r, h + 0.01, top[2] + Math.sin(a1) * r], ['#f0c040', col, col], up);
      }
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(B.build(), kit.propMat(this))); return { root };
  },
};
