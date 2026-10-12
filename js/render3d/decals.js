// сборка 66: эффекты «на полу» (вихрь, трещины, кольца нов, иней, подпалина, горящая земля) — на плоскости у самой земли в 3D-сцене,
// а не на 2D-холсте поверх: герой и мобы стоят на эффекте, а не под ним. Рисует их тот же код листов (render/renderer.js drawGroundLayer),
// только «камера» — вид сверху на квадрат SIZE×SIZE м вокруг героя. Холст заливается в текстуру, только когда на полу что-то есть.
import * as THREE from '../vendor/three.module.min.js';
const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const SIZE = 32, PX = PHONE ? 512 : 1024, K = PX / SIZE;
export class GroundDecals {
  constructor(scene) {
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = PX; this.ctx = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat); this.mesh.rotation.x = -Math.PI / 2; this.mesh.renderOrder = 5; this.mesh.frustumCulled = false; this.mesh.visible = false;
    scene.add(this.mesh);
    this.x0 = 0; this.y0 = 0; this.dirty = false; const self = this;
    this.cam = { zoom: 1, proj: null, toScreen(x, y) { return [(x - self.x0) * K, (y - self.y0) * K]; } };   // мир (x, y) → пиксель холста; высота z на полу не нужна
  }
  // высота 0,07 и порядок 5 — над прозрачным слоем земли (0,05, порядок 4: трава/рисунок пола), под ногами героя
  // cx, cy — центр квадрата (герой); paint(ctx, cam) рисует и возвращает, сколько эффектов нарисовано
  update(cx, cy, paint) {
    this.x0 = Math.round(cx) - SIZE / 2; this.y0 = Math.round(cy) - SIZE / 2;
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.dirty) c.clearRect(0, 0, PX, PX);
    const n = paint(c, this.cam); this.dirty = n > 0; this.mesh.visible = n > 0;
    if (n > 0) { this.mesh.position.set(this.x0 + SIZE / 2, 0.07, this.y0 + SIZE / 2); this.tex.needsUpdate = true; }
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.tex.dispose(); }
}
