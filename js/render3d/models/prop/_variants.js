// Разновидности «голых» предметов поля: мёртвые деревья и камни. Раньше каждое было одной и той же формой —
// теперь у каждой породы своя форма и (у деревьев) своя схема ветвления; PropLayer выбирает вариант по позиции.
const BARK_A = [0x2a2230, 0x4a3f55], BARK_B = [0x3a2e24, 0x6a5848], BARK_C = [0x2c2c2c, 0x6a6a64];

// Мёртвое дерево: seed задаёт ветви; lean — наклон ствола; broken — сломанная верхушка; roots — вздувшиеся корни; fork — раздвоение
function dead(id, o) {
  return { id, kind: 'prop', batch: true, sway: { base: 0.5, amt: 0.02, flutter: 0.004 },
    build(kit) {
      const { THREE, part, merge, geo, tube } = kit, R = geo.rng(o.seed), L = [], [c0, c1] = o.pal || BARK_A;
      const H = o.h, lean = o.lean || 0;
      // ствол — изогнутая сужающаяся трубка
      const pts = [[0, 0, 0], [lean * 0.3, H * 0.35, 0], [lean * 0.7 + (R() - 0.5) * 0.2, H * 0.7, (R() - 0.5) * 0.2], [lean + (R() - 0.5) * 0.2, H, 0]];
      L.push(tube(pts, o.r || 0.3, o.broken ? 0.12 : 0.06, c0, { top: c1, tex: 'bark' }, 7));
      if (o.roots) for (let i = 0; i < o.roots; i++) { const a = i / o.roots * 6.283 + R(); L.push(tube([[Math.cos(a) * 0.1, 0.35, Math.sin(a) * 0.1], [Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45], [Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85]], 0.1, 0.03, c0, { top: c1, tex: 'bark' }, 5)); }
      // ветви: от ствола вверх-наружу, у каждой — один-два отростка
      const nb = o.branches;
      for (let i = 0; i < nb; i++) {
        const t = 0.35 + R() * (o.broken ? 0.5 : 0.62), y = H * t, a = R() * 6.283, len = (0.7 + R() * 1.1) * (1.15 - t * 0.5) * (o.spread || 1);
        const bx = lean * t, up = 0.25 + R() * 0.5;
        const e = [bx + Math.cos(a) * len, y + len * up, Math.sin(a) * len];
        L.push(tube([[bx, y, 0], [(bx + e[0]) / 2, y + len * up * 0.3, e[2] / 2], e], 0.06, 0.012, c0, { top: c1 }, 5));
        if (R() < 0.7) { const a2 = a + (R() - 0.5) * 1.6, l2 = len * 0.55; L.push(tube([[(bx + e[0]) / 2, y + len * up * 0.3, e[2] / 2], [e[0] + Math.cos(a2) * l2, e[1] + l2 * 0.45, e[2] + Math.sin(a2) * l2]], 0.035, 0.008, c0, { top: c1 }, 4)); }
      }
      if (o.fork) { const t = 0.5; L.push(tube([[lean * t, H * t, 0], [lean * t + 0.5, H * t + 0.7, 0.2], [lean * t + 0.9, H * t + 1.5, 0.1]], 0.1, 0.03, c0, { top: c1, tex: 'bark' }, 5)); }
      if (o.broken) L.push(part(new THREE.ConeGeometry(0.16, 0.5, 5), c1, [lean, H + 0.1, 0], [0.2, R() * 6, 0.1], 1, { top: 0x8a7a68 }));   // расщеплённый излом
      const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
    } };
}
export const DEAD_VARIANTS = [
  dead('deadtree_b', { seed: 21, h: 3.1, lean: 0.5, branches: 7, r: 0.28, roots: 3, pal: BARK_B }),
  dead('deadtree_c', { seed: 34, h: 2.2, lean: -0.3, branches: 3, r: 0.34, broken: true, pal: BARK_C }),
  dead('deadtree_d', { seed: 47, h: 3.6, lean: 0.15, branches: 9, r: 0.22, fork: true, spread: 1.15, pal: BARK_A }),
  dead('deadtree_e', { seed: 58, h: 1.7, lean: 0.7, branches: 4, r: 0.3, roots: 4, pal: BARK_B }),
];

// Камни: форма, цвет и масштаб различаются; mossy — зелёная шапка
function rock(id, parts, o = {}) {
  return { id, kind: 'prop', batch: true, outline: false, tint: o.tint ?? 0.2,
    build(kit) {
      const { THREE, geo, merge } = kit, R = geo.rng(o.seed || 1);
      const L = parts.map(([kind, r, x, z, sx, sy, sz, jit, rot], i) => {
        const g = kind === 'ico' ? new THREE.IcosahedronGeometry(r, 1) : kind === 'cone' ? new THREE.ConeGeometry(r, r * 2.6, 5) : kind === 'box' ? new THREE.BoxGeometry(r * 2, r * 0.6, r * 1.6) : new THREE.DodecahedronGeometry(r, 0);
        g.scale(sx, sy, sz); geo.jitter(g, r * (jit ?? 0.28), geo.rng((o.seed || 1) * 7 + i)); if (rot) g.rotateY(rot);
        g.computeBoundingBox(); const y0 = -g.boundingBox.min.y; g.translate(x, y0 * 0.92, z);
        return geo.paint(g, o.base ?? 0x2e2c28, { top: o.top ?? 0x9a9078, tex: 'stone' });
      });
      const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
    } };
}
export const ROCK_VARIANTS = [
  rock('rock_menhir', [['dod', 0.42, 0, 0, 0.8, 2.6, 0.7, 0.18, 0.4], ['dod', 0.2, 0.5, 0.25, 1, 0.8, 1, 0.3]], { seed: 3, base: 0x3a3832, top: 0xb0a890 }),
  rock('rock_slab', [['box', 0.9, 0, 0, 1, 1.4, 1, 0.12, 0.3], ['box', 0.55, 0.3, 0.1, 1, 1.4, 1, 0.12, -0.5], ['dod', 0.2, -0.8, 0.5, 1, 0.7, 1, 0.3]], { seed: 5, base: 0x48433a, top: 0xa89c84 }),
  rock('rock_round', [['ico', 0.65, 0, 0, 1.15, 0.8, 1, 0.1], ['ico', 0.32, 0.8, 0.3, 1, 0.8, 1, 0.12]], { seed: 8, base: 0x4a4a46, top: 0x8e9088 }),
  rock('rock_pile', [['dod', 0.28, 0, 0, 1, 0.8, 1, 0.3], ['dod', 0.22, 0.38, 0.1, 1, 0.7, 1, 0.3], ['dod', 0.18, -0.32, 0.22, 1, 0.8, 1, 0.3], ['dod', 0.14, 0.1, -0.35, 1, 0.7, 1, 0.3], ['dod', 0.12, -0.1, 0.45, 1, 0.7, 1, 0.3]], { seed: 11, base: 0x3a342c, top: 0x8a7a62 }),
  rock('rock_spire', [['cone', 0.34, 0, 0, 1, 1, 1, 0.2], ['cone', 0.24, 0.45, 0.15, 1, 0.8, 1, 0.2, 0.7], ['cone', 0.18, -0.4, 0.3, 1, 0.9, 1, 0.2, 1.4]], { seed: 14, base: 0x2a2a30, top: 0x7a7a88 }),
  rock('rock_mossy', [['dod', 0.55, 0, 0, 1.1, 0.75, 1, 0.22], ['dod', 0.3, -0.7, 0.25, 1, 0.7, 1, 0.25]], { seed: 17, base: 0x34382c, top: 0x6a8a4a }),
];
