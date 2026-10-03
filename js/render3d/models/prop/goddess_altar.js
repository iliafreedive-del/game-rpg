// Алтарь богини (сборка 19) — источник наград и благословений на площади. Должен притягивать взгляд и ни на что не походить:
// из земли поднимается огромная каменная ладонь и держит кристалл-сердце; вокруг медленно кружат рунные плиты,
// ступени с бирюзовыми прожилками, по бокам — чаши с бирюзовым огнём. Свет и ореол задаёт zone.js (PROP.shrine.light).
export default {
  id: 'goddess_altar', kind: 'prop', outline: false, ao: 0.7, aoH: 1.2,
  build(kit) {
    const { THREE, part, bbox, tube, merge } = kit, L = [], MARBLE = 0xb8b4c8, MARBLE_L = 0xf4f0ff, GOLD = 0xd6a548, TURQ = 0x5ae8d8;
    // ступени: три круга мрамора, по краю — бирюзовые прожилки
    for (let i = 0; i < 3; i++) { const r = 1.9 - i * 0.45, y = 0.09 + i * 0.18;
      L.push(part(new THREE.CylinderGeometry(r, r + 0.06, 0.18, 18), 0x6a6680, [0, y, 0], 0, 1, { top: MARBLE_L, tex: 'stone' }));
      L.push(part(new THREE.TorusGeometry(r - 0.02, 0.025, 4, 36), TURQ, [0, y + 0.09, 0], [Math.PI / 2, 0, 0], 1, { emit: true })); }
    // рука: предплечье из земли, ладонь вверх, пальцы чашей — держат кристалл
    const S = 0x8a8498, SL = 0xe0dcf0;
    L.push(tube([[0, 0.5, -0.15], [0.05, 1.1, -0.1], [0.02, 1.75, 0.0]], 0.42, 0.34, S, { top: SL, tex: 'stone' }, 10));
    L.push(part(new THREE.SphereGeometry(0.46, 12, 9), S, [0, 2.0, 0.02], 0, [1.05, 0.55, 0.95], { top: SL, tex: 'stone' }));   // ладонь
    for (let k = 0; k < 4; k++) { const a = -0.75 + k * 0.5, x = Math.sin(a) * 0.36, z = Math.cos(a) * 0.36;
      L.push(tube([[x, 2.05, z], [x * 1.25, 2.4, z * 1.25], [x * 1.05, 2.75, z * 1.05], [x * 0.7, 2.92, z * 0.7]], 0.11, 0.07, S, { top: SL, tex: 'stone' }, 7)); }
    L.push(tube([[-0.38, 2.0, -0.2], [-0.62, 2.3, -0.15], [-0.6, 2.65, 0.05], [-0.42, 2.82, 0.12]], 0.12, 0.08, S, { top: SL, tex: 'stone' }, 7));   // большой палец
    for (const y of [1.0, 1.45]) L.push(part(new THREE.TorusGeometry(0.4, 0.05, 5, 18), GOLD, [0.03, y, -0.08], [Math.PI / 2, 0, 0], [1, 1, 1], { top: 0xffe08a, tex: 'gold' }));   // золотые браслеты
    for (let k = 0; k < 6; k++) L.push(part(new THREE.BoxGeometry(0.03, 0.18, 0.02), TURQ, [Math.cos(k) * 0.43, 1.22 + (k % 2) * 0.1, Math.sin(k) * 0.43 - 0.08], [0, -k, 0], 1, { emit: true }));   // руны на запястье
    // чаши с огнём по бокам
    for (const s of [-1, 1]) { const x = s * 1.45, z = 0.55;
      L.push(part(new THREE.CylinderGeometry(0.06, 0.1, 0.8, 6), 0x4a4458, [x, 0.75, z], 0, 1, { top: GOLD, tex: 'gold' }), part(new THREE.CylinderGeometry(0.3, 0.12, 0.2, 10), 0x6a5a3a, [x, 1.22, z], 0, 1, { top: GOLD, tex: 'gold' }));
      L.push(part(new THREE.ConeGeometry(0.2, 0.55, 6), TURQ, [x, 1.55, z], 0, 1, { top: 0xe8fffc, emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    // кристалл-сердце над ладонью: светится, вращается, покачивается
    const glow = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
    const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), glow); heart.scale.set(1, 1.45, 1); heart.position.y = 3.05; heart.userData.noOutline = true; root.add(heart);
    const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), new THREE.MeshBasicMaterial({ color: 0x5ae8d8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.copy(heart.scale); halo.position.copy(heart.position); halo.userData.noOutline = true; root.add(halo);
    // световой столб от кристалла в небо — виден издалека, «маяк» площади
    const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float k = (1.0 - vUv.y) * smoothstep(0.0, 0.08, vUv.y); float s = 0.75 + 0.25 * sin(vUv.y * 18.0 - uTime * 3.0); gl_FragColor = vec4(vec3(0.45, 1.0, 0.92) * k * s * 0.55, 1.0); }' });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.22, 9, 16, 1, true), beamMat); beam.position.y = 3.05 + 4.5; beam.userData.noOutline = true; beam.renderOrder = 3; root.add(beam);
    // кольцо рунных плит
    const ring = new THREE.Group(); ring.position.y = 2.4; root.add(ring); const RL = [];
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; RL.push(bbox(0.34, 0.5, 0.07, 0.03, 0x5a5670, [Math.cos(a) * 1.25, Math.sin(k * 1.7) * 0.15, Math.sin(a) * 1.25], [0, -a + Math.PI / 2, 0], { top: MARBLE_L, tex: 'stone' }), part(new THREE.BoxGeometry(0.16, 0.24, 0.02), TURQ, [Math.cos(a) * 1.29, Math.sin(k * 1.7) * 0.15, Math.sin(a) * 1.29], [0, -a + Math.PI / 2, 0], 1, { emit: true })); }
    ring.add(new THREE.Mesh(merge(RL), kit.propMat(this)));
    return { root, update(t) { beamMat.uniforms.uTime.value = t; heart.rotation.y = t * 0.9; heart.position.y = halo.position.y = 3.05 + Math.sin(t * 1.6) * 0.08; halo.rotation.y = -t * 0.6; halo.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06).multiply(heart.scale); ring.rotation.y = t * 0.25; ring.position.y = 2.4 + Math.sin(t * 0.8) * 0.06; } };
  },
};
