// сборка 66: эффекты «на полу» (вихрь, трещины, кольца нов, иней, подпалина, горящая земля) — на плоскости у самой земли в 3D-сцене,
// а не на 2D-холсте поверх: герой и мобы стоят на эффекте, а не под ним. Рисует их тот же код листов (render/renderer.js drawGroundLayer),
// только «камера» — вид сверху на квадрат SIZE×SIZE м вокруг героя. Холст заливается в текстуру, только когда на полу что-то есть.
import * as THREE from '../vendor/three.module.min.js';
const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const SIZE = 32, PX = PHONE ? 512 : 1024, K = PX / SIZE;
export class GroundDecals {
  constructor(scene) {
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = PX; this.ctx = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.premultiplyAlpha = true; this.tex.flipY = false; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter;   // flipY выкл.: холст уходит в видеопамять без переворота (быстрый путь браузера), зато строки холста — по v сверху вниз (uv ниже)
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const geo = new THREE.PlaneGeometry(SIZE, SIZE), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.rotation.x = -Math.PI / 2; this.mesh.renderOrder = 5; this.mesh.frustumCulled = false; this.mesh.visible = false;
    scene.add(this.mesh);
    this.x0 = 0; this.y0 = 0; this.dirty = false; this.skip = 0; const self = this;
    this.cam = { zoom: 1, proj: null, toScreen(x, y) { return [(x - self.x0) * K, (y - self.y0) * K]; } };   // мир (x, y) → пиксель холста; высота z на полу не нужна
  }
  // высота 0,07 и порядок 5 — над прозрачным слоем земли (0,05, порядок 4: трава/рисунок пола), под ногами героя
  // cx, cy — центр квадрата (герой); paint(ctx, cam) рисует и возвращает, сколько эффектов нарисовано
  // сборка 66 (лаги при дожде клинков): холст 1024² заливался в видеопамять каждый кадр, пока на полу что-то есть; теперь — через кадр
  // (листы и так идут ~16 кадров/с), а пустой пол не перерисовывается
  update(cx, cy, paint) {
    if (this.dirty && (this.skip = (this.skip + 1) % 4)) return;   // сборка 72: раз в 4 кадра (15 в секунду — как идут кадры листов эффектов); круги и метки теперь кольца в 3D (renderer3d.js markRings)
    this.x0 = Math.round(cx) - SIZE / 2; this.y0 = Math.round(cy) - SIZE / 2;
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.dirty) c.clearRect(0, 0, PX, PX);
    const n = paint(c, this.cam); this.dirty = n > 0; this.mesh.visible = n > 0 || !this.warm; this.warm = true;   // ОС-16: в первый кадр плоскость видна (пустая) — шейдер собирается сразу, а не рывком при первом эффекте
    if (n > 0) { this.mesh.position.set(this.x0 + SIZE / 2, 0.07, this.y0 + SIZE / 2); this.tex.needsUpdate = true; this.ups = (this.ups || 0) + 1; }
  }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.tex.dispose(); }
}

// сборка 66: «объёмные» листы, что стоят на земле (шипы новы, языки пламени, взрывы, удары мобов), — щитами к камере в 3D-сцене:
// стоящее за героем прячется за ним. Щит сдвинут к камере на NUDGE м (экранное место то же): эффект в точке героя не уходит ему за спину.
// ОС-15: щит «влетает» в цель — стоит почти в её середине (NUDGE мал): ближняя к камере часть фигуры заслоняет эффект, остальное видно.
// Низ листа (нарисованная земля под эффектом) раньше уходил под пол и срезался ровной линией; теперь глубина пикселя щита не дальше
// пола на этом луче (шейдер ниже): пол щит не режет, а герой и мобы — заслоняют. Правки 5 решали срез сдвигом щита к камере — он больше не нужен
const NUDGE = 0.3, POOL = 32;
const U = { uGround: { value: new THREE.Vector4() }, uProj: { value: new THREE.Matrix4() } }, _n = new THREE.Vector3(), _o = new THREE.Vector3();
function floorDepth(m) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vVP;\nvoid main() {').replace('gl_Position = projectionMatrix * mvPosition;', 'gl_Position = projectionMatrix * mvPosition;\n\tvVP = mvPosition.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec4 uGround;\nuniform mat4 uProj;\nvarying vec3 vVP;\nvoid main() {')
      .replace(/}\s*$/, '\tfloat dep = gl_FragCoord.z, dn = dot( uGround.xyz, vVP );\n\tif ( dn < 0.0 ) { float t = - uGround.w / dn; if ( t > 0.0 && t < 1.0 ) { vec4 c = uProj * vec4( vVP * t * 0.995, 1.0 ); dep = min( dep, c.z / c.w * 0.5 + 0.5 ); } }\n\tgl_FragDepth = dep;\n}');
  };
  m.customProgramCacheKey = () => 'fxFloorDepth';
}
export class FxBillboards {
  constructor(scene) {
    this.scene = scene; this.pool = []; this.base = new Map();   // картинка листа -> текстура (копии на щитах делят её в видеопамяти)
  }
  baseTex(img) {
    let t = this.base.get(img); if (t) return t;
    t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.premultiplyAlpha = true; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    this.base.set(img, t); return t;
  }
  // сборка 66 (лаг при умениях мобов): копия текстуры для щита — с общим источником, но БЕЗ clone(): clone() ставит needsUpdate
  // источнику, и весь лист эффекта (768² и больше) заново заливался в видеопамять при каждом новом щите (замер icespikes66.js: 6 волн умений — 7 лишних заливок листов, ≈3,3 Мпикс; до PR #21 — 33 и 16 Мпикс)
  slotTex(img) {
    const b = this.baseTex(img), t = new THREE.Texture(); t.source = b.source;
    for (const k of ['colorSpace', 'premultiplyAlpha', 'generateMipmaps', 'minFilter', 'magFilter', 'flipY', 'wrapS', 'wrapT']) t[k] = b[k];
    t.version = 1; return t;   // версия > 0 — three зальёт источник один раз (по source.version), дальше только привяжет
  }
  // сборка 71 (просадка на касте): лист эффекта (768² и больше) заливался в видеопамять в кадре первого каста.
  // Теперь загруженные стоячие листы заливаются заранее, по одному за кадр, пока на экране тихо
  // Листы, которые fxsheets отпустил при смене края, раньше так и оставались в видеопамяти — теперь их текстуры освобождаются
  prewarm(renderer, imgs) {
    if ((this.tick = (this.tick || 0) + 1) % 60 === 0 && this.base.size > imgs.length) {
      const live = new Set(imgs);
      for (const [img, t] of this.base) if (!live.has(img)) { t.dispose(); this.base.delete(img); for (const s of this.pool) { const T = s.userData.tex, st = T && T.get(img); if (st) { st.dispose(); T.delete(img); } if (s.userData.img === img) s.userData.img = null; } }
    }
    for (const img of imgs) if (!this.base.has(img)) { try { renderer.initTexture(this.baseTex(img)); } catch { } return; }
  }
  item(i) {
    let s = this.pool[i]; if (s) return s;
    const mat = new THREE.SpriteMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false });
    floorDepth(mat); s = new THREE.Sprite(mat); s.renderOrder = 10; s.frustumCulled = false; s.userData.img = null; this.scene.add(s); this.pool[i] = s; return s;
  }
  // list — [{ S (лист из fxsheets), x, y, z, k, size, alpha, flip, add }]
  update(list, camera) {
    const n = Math.min(list.length, POOL);
    // пол y = 0 в координатах камеры: нормаль и сдвиг плоскости; проекция — для глубины точки пола
    camera.updateMatrixWorld(); const V = camera.matrixWorldInverse; _n.set(0, 1, 0).transformDirection(V); _o.set(0, 0, 0).applyMatrix4(V);
    U.uGround.value.set(_n.x, _n.y, _n.z, -_n.dot(_o)); U.uProj.value.copy(camera.projectionMatrix);
    for (let i = 0; i < n; i++) {
      const f = list[i], S = f.S, s = this.item(i), m = s.material;
      // сборка 66: у щита своя копия текстуры на каждый лист (своё смещение кадра); копии кэшируются — раньше при смене листа на щите
      // копия создавалась заново и картинка листа целиком снова грузилась в видеопамять (дождь клинков: десятки Мпикс в секунду, лаги)
      if (s.userData.img !== S.img) { const T = s.userData.tex || (s.userData.tex = new Map()); let t = T.get(S.img); if (!t) { t = this.slotTex(S.img); T.set(S.img, t); } if (!m.map) m.needsUpdate = true; m.map = t; s.userData.img = S.img; }
      const W = S.img.width, H = S.img.height, C = S.C, t = m.map, fl = !!f.flip;
      t.repeat.set((fl ? -C : C) / W, C / H); t.offset.set((f.sx + (fl ? C : 0)) / W, 1 - (f.sy + C) / H);
      m.opacity = f.alpha; m.blending = f.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      s.center.set(S.anchor[0], 1 - S.anchor[1]); s.scale.set(f.size, f.size, 1);
      s.position.set(f.x, f.z || 0, f.y); const d = camera.position.clone().sub(s.position).normalize().multiplyScalar(f.back ? -1.3 : NUDGE); s.position.add(d);
      s.visible = true;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].visible = false;
    // ОС-16 (провалы FPS у лучника): шейдер щита собирался при первом эффекте — кадр замирал. В первые кадры зоны — невидимый щит с картинкой
    if (n === 0 && (this.warm = (this.warm || 0) + 1) < 3) { const s = this.item(0), m = s.material; if (!m.map) { m.map = new THREE.DataTexture(new Uint8Array(4), 1, 1); m.map.needsUpdate = true; m.needsUpdate = true; s.userData.img = null; } m.opacity = 0; s.position.copy(camera.position).addScaledVector(camera.getWorldDirection(_n), 5); s.visible = true; }
  }
}
