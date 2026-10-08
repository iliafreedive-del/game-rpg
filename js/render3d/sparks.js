// Искры от удара молота по наковальне (сборка 56): пул светящихся точек (аддитивно, без записи глубины), разлетаются веером
// вверх и в стороны, падают под тяжестью, отскакивают от земли и гаснут от бело-жёлтого к оранжевому. Одна отрисовка на всё.
import * as THREE from '../vendor/three.module.min.js';
const N = 120, G = 9.8;
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Sparks {
  constructor(scene) {
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N); this.i = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.PointsMaterial({ size: 0.2, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; this.pts.visible = false; scene.add(this.pts);
    this.live = 0;
  }
  // x, y — точка удара на карте, h — высота; dir — куда смотрит кузнец (рад, как faceAngle): искры летят в основном от него
  burst(x, y, h, n = 26, dir = 0) {
    for (let k = 0; k < n; k++) {
      const i = this.i, j = i * 3; this.i = (this.i + 1) % N;
      const a = dir + (Math.random() - 0.5) * 2.6, sp = 1.6 + Math.random() * 3.2, up = 0.8 + Math.random() * 2.8;
      this.pos[j] = x + (Math.random() - 0.5) * 0.06; this.pos[j + 1] = h; this.pos[j + 2] = y + (Math.random() - 0.5) * 0.06;
      this.vel[j] = Math.sin(a) * sp; this.vel[j + 1] = up; this.vel[j + 2] = Math.cos(a) * sp;
      this.max[i] = this.life[i] = 0.3 + Math.random() * 0.5;
    }
    this.live = 1; this.pts.visible = true;
  }
  update(dt) {
    if (!this.live) return;
    let any = 0; const P = this.pos, V = this.vel, C = this.col;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      if (this.life[i] <= 0) { C[j] = C[j + 1] = C[j + 2] = 0; continue; }
      any = 1; this.life[i] -= dt; V[j + 1] -= G * dt; V[j] *= 1 - 1.2 * dt; V[j + 2] *= 1 - 1.2 * dt;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      if (P[j + 1] < 0.03) { P[j + 1] = 0.03; V[j + 1] *= -0.3; V[j] *= 0.5; V[j + 2] *= 0.5; }   // отскок от земли
      const t = Math.max(0, this.life[i] / this.max[i]);   // 1 → 0: бело-жёлтый → оранжевый → гаснет
      C[j] = 1.6 * t + 0.2; C[j + 1] = 1.25 * t * t + 0.25 * t; C[j + 2] = 0.7 * t * t * t;
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
    if (!any) { this.live = 0; this.pts.visible = false; }
  }
}
