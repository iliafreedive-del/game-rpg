// Аддитивные ореолы огней и пятна света на земле: один draw call на набор, мерцание в вершинном шейдере (перенос из lab/three/js/dark/world.js).
import * as THREE from '../vendor/three.module.min.js';
import { U } from './toon.js';

export function glowSet(items, flat) {
  const geo = new THREE.PlaneGeometry(2, 2); if (flat) geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; varying vec2 vUv; varying vec3 vC;
      void main(){ vUv = uv; float id = float(gl_InstanceID);
        float fl = 0.84 + 0.1 * sin(uTime * 11.0 + id * 3.7) + 0.06 * sin(uTime * 23.0 + id * 1.3);
        float s = length(instanceMatrix[0].xyz); vC = instanceColor * fl;
        ${flat ? 'gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position * fl, 1.0);'
               : 'vec4 c = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy * s * fl; gl_Position = projectionMatrix * c;'} }`,
    fragmentShader: /* glsl */`varying vec2 vUv; varying vec3 vC;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.2); gl_FragColor = vec4(vC * a, a); }`,
  });
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  const m = new THREE.Matrix4(), c = new THREE.Color();
  items.forEach((it, i) => { m.compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion(), new THREE.Vector3(it.s, it.s, it.s)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(it.c).multiplyScalar(it.k ?? 1)); });
  im.count = items.length; im.frustumCulled = false; im.renderOrder = 4; im.userData.noOutline = true;
  return im;
}
