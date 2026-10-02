// Портал: каменная арка и вихрь (шейдер, самосвечение). opts.color — цвет вихря (берётся из света зоны). Арка смотрит на камеру.
export default { id: 'portal', kind: 'prop', outline: false,
  build(kit, opts = {}) {
    const { THREE, PAL, part, merge } = kit;
    const col = new THREE.Color(opts.color ?? PAL.abyss);
    const L = [];
    for (let i = 0; i < 14; i++) { const a = Math.PI + i / 13 * Math.PI, x = Math.cos(a) * 1.15, y = 0.1 - Math.sin(a) * 1.15 + 1.1;
      L.push(part(new THREE.BoxGeometry(0.34, 0.34, 0.38), 0x3a362c, [x, y, 0], [0, 0, a + Math.PI / 2], 1, { top: 0x9a8c68, tex: 'stone' })); }
    for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) L.push(part(new THREE.BoxGeometry(0.4, 0.4, 0.42), 0x4a463a, [sx * 1.15, 0.2 + j * 0.37 - 0.0, 0], 0, 1, { top: 0xa89a74, tex: 'stone' }));
    L.push(part(new THREE.BoxGeometry(0.5, 0.3, 0.5), PAL.brassD, [0, 2.4, 0], 0, 1, { top: PAL.brass }), part(new THREE.SphereGeometry(0.1, 8, 6), PAL.abyss, [0, 2.4, 0.26], 0, 1, { emit: true }));
    const root = new THREE.Group(); const frame = new THREE.Mesh(merge(L), kit.propMat(this)); root.add(frame);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uCol: { value: col } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
        void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          float sw = 0.5 + 0.5 * sin(a * 3.0 + r * 9.0 - uTime * 2.4); float core = smoothstep(1.0, 0.2, r);
          float edge = smoothstep(1.0, 0.85, r); vec3 c = uCol * (0.35 + 0.9 * sw * core) + vec3(1.0) * pow(core, 4.0) * 0.5;
          gl_FragColor = vec4(c * edge, edge * (0.55 + 0.4 * core)); }` });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), mat); disc.position.set(0, 1.15, 0); disc.userData.noOutline = true; disc.renderOrder = 3; root.add(disc);
    root.rotation.y = Math.PI / 4;   // лицом к камере
    return { root, update(t) { mat.uniforms.uTime.value = t; } };
  } };
