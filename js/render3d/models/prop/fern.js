// Папоротник: 8 арочных вай с листочками-зубцами (≈ 220 треугольников). Декор земли: у кромки леса, домов и троп.
import { plantBuilder } from './_plants.js';
export default {
  id: 'fern', kind: 'prop', batch: true, outline: false, shadow: false, side: 'double', rimColor: 0xe8ffb0, rim: 0.35,
  sway: { base: 0.1, amt: 0.09, flutter: 0.02 }, ao: 0.55, aoH: 0.5,
  build(kit) {
    const { THREE, geo } = kit, R = geo.rng(17), B = plantBuilder(kit);
    const D = '#1d3d16', M = '#3f7424', T = '#8cc24a';
    for (let f = 0; f < 8; f++) {
      const a = f / 8 * 6.283 + R() * 0.5, L = 0.75 + R() * 0.35, H = 0.42 + R() * 0.2, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, segs = 7;
      const spine = s => [dx * L * s, H * Math.sin(s * Math.PI * 0.85) + 0.02, dz * L * s];
      for (let i = 0; i < segs; i++) {
        const s0 = i / segs, s1 = (i + 1) / segs, p0 = spine(s0), p1 = spine(s1), w = 0.17 * Math.sin(Math.min(1, s0 * 1.4 + 0.15) * Math.PI) * (1 - s0 * 0.4);
        const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], col0 = s0 < 0.3 ? D : M, nrm = [dx * 0.35, 0.9, dz * 0.35];
        for (const sd of [-1, 1]) {
          const tip = [mid[0] + px * w * sd + dx * 0.06, mid[1] - 0.03, mid[2] + pz * w * sd + dz * 0.06];
          B.tri(p0, sd > 0 ? p1 : tip, sd > 0 ? tip : p1, [col0, sd > 0 ? M : T, sd > 0 ? T : M], nrm);
        }
      }
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(B.build(), kit.propMat(this))); return { root };
  },
};
