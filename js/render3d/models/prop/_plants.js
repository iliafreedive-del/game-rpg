// Мелкая растительность для декора земли (папоротники, цветы): сборка треугольников с собственными нормалями
// «наружу-вверх» (растение светится мягко, как один пучок) и цветом вершин RGBA. Используется fern.js и flowers.js.
export function plantBuilder(kit) {
  const { THREE } = kit, P = [], N = [], C = [], c = new THREE.Color();
  return {
    tri(a, b, d, col, nrm) { for (const v of [a, b, d]) { P.push(v[0], v[1], v[2]); N.push(nrm[0], nrm[1], nrm[2]); } for (const k of col) { c.set(k); C.push(c.r, c.g, c.b, 1); } },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
      g.computeBoundingSphere(); return g;
    },
  };
}
