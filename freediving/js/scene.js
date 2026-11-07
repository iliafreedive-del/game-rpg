// Бассейн и вода: плитка с каустиками, поверхность с окном Снеллиуса снизу и бликами сверху,
// лучи света, взвесь, пузыри, разделительные дорожки, камера с вращением пальцем.
import * as THREE from 'three';
import { clamp, lerp, V3 } from './kit.js';

export const POOL = { len: 25, halfW: 5, depth: 4.0, deck: 0.3 };
const WATER_DEEP = new THREE.Color('#0b4f6c'), WATER_SHALLOW = new THREE.Color('#1aa6c4');

const CAUSTIC_GLSL = `
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}`;

function poolMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vW; varying vec3 vN;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uCam; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uPoolDepth;
      varying vec3 vW; varying vec3 vN;
      ${CAUSTIC_GLSL}
      float grid(vec2 p, float s, float w){ vec2 g = abs(fract(p / s) - 0.5); return 1.0 - smoothstep(0.5 - w, 0.5, max(g.x, g.y)); }
      void main(){
        vec3 n = normalize(vN);
        vec2 uv = abs(n.y) > 0.5 ? vW.xz : (abs(n.x) > 0.5 ? vW.zy : vW.xy);
        float g = grid(uv, 0.25, 0.04);
        vec3 tile = mix(vec3(0.52,0.62,0.66), vec3(0.86,0.95,0.97), g);
        // дорожки на дне: тёмные полосы с «Т» у стенок
        if (n.y > 0.5) {
          float lane = mod(vW.z + 1.25, 2.5) - 1.25;
          float ln = 1.0 - smoothstep(0.12, 0.14, abs(lane));
          float inLen = step(2.0, vW.x) * step(vW.x, 23.0);
          float tee = (1.0 - smoothstep(0.12,0.14, abs(vW.x - 2.0))) * (1.0 - smoothstep(0.5,0.52, abs(lane)));
          float tee2 = (1.0 - smoothstep(0.12,0.14, abs(vW.x - 23.0))) * (1.0 - smoothstep(0.5,0.52, abs(lane)));
          tile = mix(tile, vec3(0.06,0.10,0.16), max(ln * inLen, max(tee, tee2)));
          // отметки глубины
        }
        if (abs(n.x) > 0.5 && vW.y > -0.5) tile = mix(tile, vec3(0.05,0.18,0.35), step(-0.32, vW.y) * step(vW.y, -0.08) * step(0.5, fract(vW.z * 1.0)));
        bool under = vW.y < 0.0;
        float depthF = clamp(-vW.y / uPoolDepth, 0.0, 1.0);
        float light = 0.55 + 0.45 * max(dot(n, normalize(vec3(0.3, 1.0, 0.2))), 0.0);
        vec3 col = tile * light;
        if (under) {
          float c = caustic(vW.xz * 0.28 + n.xz * vW.y * 0.1, uTime * 0.55);
          float cf = (n.y > 0.5 ? 1.0 : 0.45) * (1.0 - depthF * 0.55);
          col += vec3(0.75, 0.95, 1.0) * c * 0.55 * cf;
          col *= mix(vec3(0.75, 0.95, 1.0), vec3(0.45, 0.75, 0.9), depthF);
          // «туман» воды: путь луча под водой
          float d = length(uCam - vW);
          float camUnder = uCam.y < 0.0 ? 1.0 : clamp((-vW.y) / max(-vW.y + uCam.y, 0.001), 0.0, 1.0);
          float f = 1.0 - exp(-d * camUnder * 0.075);
          vec3 wc = mix(uShallow, uDeep, clamp(-min(vW.y, uCam.y) / 6.0, 0.0, 1.0));
          col = mix(col, wc, f * 0.92);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function surfaceMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `
      uniform float uTime; varying vec3 vW; varying vec3 vN;
      vec3 wave(vec2 p){
        float h = 0.0; vec2 d = vec2(0.0);
        vec4 W[4]; W[0]=vec4(0.8,0.6, 1.3, 0.010); W[1]=vec4(-0.5,0.85, 2.1, 0.006); W[2]=vec4(0.2,-1.0, 3.7, 0.004); W[3]=vec4(-0.9,-0.3, 5.3, 0.0025);
        for(int i=0;i<4;i++){ vec2 dir = normalize(W[i].xy); float k = W[i].z; float ph = dot(dir,p)*k + uTime*sqrt(9.8*k)*0.6; h += W[i].w*sin(ph); d += W[i].w*k*cos(ph)*dir; }
        return vec3(h, d);
      }
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vec3 hw = wave(w.xz); w.y += hw.x; vW = w.xyz; vN = normalize(vec3(-hw.y, 1.0, -hw.z)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uCam; uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow;
      varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 v = normalize(uCam - vW); vec3 n = normalize(vN);
        vec3 sunDir = normalize(vec3(0.3, 1.0, 0.25));
        if (uCam.y < vW.y) {
          // снизу: внутри окна Снеллиуса (~48°) видно небо и свет, снаружи — полное отражение воды
          float c = abs(dot(v, n));
          float win = smoothstep(0.62, 0.70, c);
          vec3 sky = vec3(0.85, 0.97, 1.0) + vec3(1.0,0.95,0.8) * pow(max(dot(-v, sunDir), 0.0), 40.0) * 1.5;
          vec3 refl = mix(uShallow * 0.8, uDeep, 0.4);
          vec3 col = mix(refl, sky, win);
          float sparkle = pow(max(dot(reflect(v, n), -sunDir), 0.0), 60.0);
          col += sparkle * 0.6;
          float d = length(uCam - vW);
          col = mix(col, mix(uShallow, uDeep, 0.3), 1.0 - exp(-d * 0.05));
          gl_FragColor = vec4(col, mix(0.92, 0.75, win));
        } else {
          float fres = pow(1.0 - max(dot(v, n), 0.0), 3.0);
          vec3 sky = vec3(0.80, 0.90, 0.97);
          vec3 col = mix(vec3(0.10, 0.55, 0.65), sky, fres);
          vec3 r = reflect(-v, n);
          col += vec3(1.0, 0.97, 0.9) * pow(max(dot(r, sunDir), 0.0), 120.0) * 2.0;
          gl_FragColor = vec4(col, mix(0.28, 0.85, fres));
        }
      }`,
  });
}

function rayMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uSeed: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uSeed; uniform float uUnder; varying vec2 vUv;
      void main(){ float edge = sin(vUv.x * 3.14159); edge = pow(edge, 2.0);
        float fall = pow(vUv.y, 1.6);
        float flick = 0.6 + 0.4 * sin(uTime * 0.7 + uSeed * 7.0) * sin(uTime * 0.43 + uSeed * 3.0);
        gl_FragColor = vec4(vec3(0.75, 0.95, 1.0), edge * fall * flick * 0.09 * uUnder); }`,
  });
}

export class World {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    this.camera2 = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    this.uniforms = { uTime: { value: 0 }, uCam: { value: V3() }, uDeep: { value: WATER_DEEP.clone() }, uShallow: { value: WATER_SHALLOW.clone() }, uPoolDepth: { value: POOL.depth }, uUnder: { value: 1 } };
    this.scene.fog = new THREE.FogExp2(WATER_SHALLOW.clone(), 0.06);
    this._lights();
    this._pool();
    this._surface();
    this._rays();
    this._motes();
    this._bubbles();
    this.cam = new OrbitCam(this.camera, canvas);
    this.split = null; // {a:{target, cam}, b:{...}}
    this.time = 0;
    this.extra = new THREE.Group(); this.scene.add(this.extra);
  }

  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#d8f4ff', '#1f5d70', 1.15));
    const sun = new THREE.DirectionalLight('#fff3e0', 2.0);
    sun.position.set(6, 14, 5);
    s.add(sun); s.add(sun.target);
    this.sun = sun;
    const fill = new THREE.DirectionalLight('#7fd7ff', 0.5); fill.position.set(-5, -3, -4); s.add(fill);
  }

  _pool() {
    const { len, halfW, depth, deck } = POOL;
    const mat = poolMaterial(this.uniforms);
    const g = new THREE.Group();
    // дно
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(len, halfW * 2, 1, 1), mat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(len / 2, -depth, 0); g.add(floor);
    // стенки — нормали внутрь бассейна
    const wallH = depth + deck;
    const mkWall = (w, px, pz, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, wallH), mat); m.position.set(px, -depth + wallH / 2, pz); m.rotation.y = ry; g.add(m); };
    mkWall(halfW * 2, 0, 0, Math.PI / 2);
    mkWall(halfW * 2, len, 0, -Math.PI / 2);
    mkWall(len, len / 2, -halfW, 0);
    mkWall(len, len / 2, halfW, Math.PI);
    // бортик и плитка вокруг
    const deckM = new THREE.MeshStandardMaterial({ color: '#d9e2e6', roughness: 0.8 });
    const edgeM = new THREE.MeshStandardMaterial({ color: '#f4f7f8', roughness: 0.6 });
    const mkDeck = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), deckM); m.position.set(x, deck - 0.1, z); g.add(m); };
    mkDeck(12, halfW * 2 + 24, -6, 0); mkDeck(12, halfW * 2 + 24, len + 6, 0);
    mkDeck(len, 12, len / 2, -halfW - 6); mkDeck(len, 12, len / 2, halfW + 6);
    // закруглённый край бортика
    for (const [w, x, z, ry] of [[halfW * 2, 0, 0, 0], [halfW * 2, len, 0, 0], [len, len / 2, -halfW, Math.PI / 2], [len, len / 2, halfW, Math.PI / 2]]) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w, 10), edgeM);
      e.rotation.x = Math.PI / 2; if (ry) e.rotation.z = ry; e.position.set(x, deck - 0.02, z);
      if (ry) { e.rotation.set(0, 0, Math.PI / 2); }
      g.add(e);
    }
    // стены зала, окна
    const hallM = new THREE.MeshStandardMaterial({ color: '#cfdbe0', roughness: 0.9 });
    const winM = new THREE.MeshBasicMaterial({ color: '#e9f8ff' });
    const back = new THREE.Mesh(new THREE.BoxGeometry(len + 24, 9, 0.3), hallM); back.position.set(len / 2, 4.5, -halfW - 9); g.add(back);
    for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), winM); w.position.set(-1 + i * 5.4, 4.2, -halfW - 8.8); g.add(w); }
    const front = back.clone(); front.position.z = halfW + 9; g.add(front);
    for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), winM); w.position.set(-1 + i * 5.4, 4.2, halfW + 8.8); w.rotation.y = Math.PI; g.add(w); }
    // разделительные дорожки из поплавков
    const fl = new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10); fl.rotateZ(Math.PI / 2);
    const n = Math.floor(len / 0.12);
    const ropesZ = [-3.75, -1.25, 1.25, 3.75];
    const inst = new THREE.InstancedMesh(fl, new THREE.MeshStandardMaterial({ roughness: 0.4 }), n * ropesZ.length);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    let k = 0;
    for (const z of ropesZ) for (let i = 0; i < n; i++) {
      const x = 0.1 + i * 0.12;
      m4.makeTranslation(x, 0.0, z); inst.setMatrixAt(k, m4);
      const near = x < 5 || x > len - 5;
      c.set(near ? '#d8262b' : (Math.floor(i / 4) % 2 ? '#f2f2f2' : '#2058c8')); inst.setColorAt(k, c); k++;
    }
    g.add(inst);
    this.ropes = inst;
    this.scene.add(g);
    this.pool = g;
  }

  _surface() {
    const geo = new THREE.PlaneGeometry(POOL.len, POOL.halfW * 2, 200, 80);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, surfaceMaterial(this.uniforms));
    m.position.set(POOL.len / 2, 0, 0);
    m.renderOrder = 5;
    this.scene.add(m);
    this.surface = m;
  }

  _rays() {
    this.rays = [];
    const g = new THREE.PlaneGeometry(1, 1); g.translate(0, -0.5, 0);
    for (let i = 0; i < 16; i++) {
      const mat = rayMaterial(this.uniforms); mat.uniforms.uSeed.value = Math.random();
      mat.uniforms.uTime = this.uniforms.uTime; mat.uniforms.uUnder = this.uniforms.uUnder;
      const m = new THREE.Mesh(g, mat);
      m.scale.set(0.4 + Math.random() * 1.1, 7, 1);
      m.userData = { ox: (Math.random() - 0.5) * 14, oz: (Math.random() - 0.5) * 9, tilt: 0.25 + Math.random() * 0.1 };
      m.renderOrder = 6;
      this.scene.add(m); this.rays.push(m);
    }
  }

  _motes() {
    const N = 700, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * POOL.len; pos[i * 3 + 1] = -Math.random() * POOL.depth; pos[i * 3 + 2] = (Math.random() - 0.5) * POOL.halfW * 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d9fbff', size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
    this.scene.add(m); this.motes = m;
  }

  _bubbles() {
    const N = 260;
    const g = new THREE.SphereGeometry(1, 10, 8);
    const m = new THREE.MeshStandardMaterial({ color: '#e8fbff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false, emissive: '#5fb8d0', emissiveIntensity: 0.25 });
    const inst = new THREE.InstancedMesh(g, m, N);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.frustumCulled = false;
    this.scene.add(inst);
    this.bub = { inst, list: [], N };
  }

  emitBubbles(p, count = 6, spread = 0.02, size = 1) {
    for (let i = 0; i < count; i++) {
      if (this.bub.list.length >= this.bub.N) this.bub.list.shift();
      this.bub.list.push({ p: p.clone().add(V3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)), r: (0.004 + Math.random() * 0.012) * size, ph: Math.random() * 6.28, life: 0 });
    }
  }

  clearBubbles() { this.bub.list.length = 0; }

  update(dt) {
    this.time += dt;
    const u = this.uniforms;
    u.uTime.value = this.time;
    const cam = this.camera;
    u.uCam.value.copy(cam.position);
    const under = cam.position.y < 0;
    u.uUnder.value = lerp(u.uUnder.value, under ? 1 : 0.0, 0.2);
    const fog = this.scene.fog;
    if (under) {
      const d = clamp(-cam.position.y / 6, 0, 1);
      fog.color.copy(WATER_SHALLOW).lerp(WATER_DEEP, d); fog.density = 0.07;
      this.scene.background = fog.color;
    } else {
      fog.color.set('#cfe7ef'); fog.density = 0.008;
      this.scene.background = new THREE.Color('#cfe7ef');
    }
    // лучи — цилиндрические билборды вокруг камеры
    for (const r of this.rays) {
      const d = r.userData;
      const tx = this.cam.target.x + d.ox, tz = this.cam.target.z + d.oz;
      r.position.set(clamp(tx, 0.5, POOL.len - 0.5), 0, clamp(tz, -POOL.halfW + 0.5, POOL.halfW - 0.5));
      r.lookAt(cam.position.x, r.position.y, cam.position.z);
      r.rotateZ(d.tilt);
      r.visible = under;
    }
    // взвесь медленно дрейфует
    const mp = this.motes.geometry.attributes.position.array;
    for (let i = 0; i < mp.length; i += 3) {
      mp[i] += Math.sin(this.time * 0.3 + i) * 0.0008; mp[i + 1] += Math.cos(this.time * 0.2 + i * 0.7) * 0.0005;
      if (mp[i + 1] > -0.02) mp[i + 1] = -POOL.depth + 0.05;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
    // пузыри: всплывают, качаются, растут; лопаются у поверхности
    const b = this.bub, m4 = new THREE.Matrix4();
    for (let i = b.list.length - 1; i >= 0; i--) {
      const q = b.list[i];
      q.life += dt;
      const rise = 0.25 + q.r * 22;
      q.p.y += rise * dt;
      q.p.x += Math.sin(q.life * 9 + q.ph) * 0.12 * dt;
      q.p.z += Math.cos(q.life * 8 + q.ph) * 0.12 * dt;
      q.r *= 1 + dt * 0.04;
      if (q.p.y > -0.01) b.list.splice(i, 1);
    }
    for (let i = 0; i < b.N; i++) {
      const q = b.list[i];
      if (q) { const s = q.r; m4.makeScale(s * (1 + 0.15 * Math.sin(q.life * 20)), s * 0.85, s).setPosition(q.p); } else m4.makeScale(0, 0, 0);
      b.inst.setMatrixAt(i, m4);
    }
    b.inst.instanceMatrix.needsUpdate = true;
  }

  resize() {
    const c = this.renderer.domElement, w = c.clientWidth, h = c.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  render() {
    const r = this.renderer, c = r.domElement, w = c.clientWidth, h = c.clientHeight;
    if (!this.split) {
      r.setScissorTest(false);
      r.setViewport(0, 0, w, h);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      r.render(this.scene, this.camera);
      return;
    }
    // раздельный экран: «неправильно» и «правильно»
    const portrait = h > w;
    const s = this.split;
    r.setScissorTest(true);
    const views = portrait ? [[0, h / 2, w, h / 2], [0, 0, w, h / 2]] : [[0, 0, w / 2, h], [w / 2, 0, w / 2, h]];
    const cams = [this.camera, this.camera2];
    // вторая камера повторяет первую со сдвигом на соседнюю дорожку
    this.camera2.position.copy(this.camera.position).add(s.offset);
    this.camera2.quaternion.copy(this.camera.quaternion);
    this.camera2.fov = this.camera.fov;
    const vis = (arr, on) => (arr || []).forEach((o) => o && (o.visible = on));
    for (let i = 0; i < 2; i++) {
      const [x, y, vw, vh] = views[i];
      vis(s.A, i === 0); vis(s.B, i === 1);
      r.setViewport(x, y, vw, vh); r.setScissor(x, y, vw, vh);
      cams[i].aspect = vw / vh; cams[i].updateProjectionMatrix();
      this.uniforms.uCam.value.copy(cams[i].position);
      r.render(this.scene, cams[i]);
    }
    vis(s.A, true); vis(s.B, true);
    r.setScissorTest(false);
  }
}

// Камера-орбита: пресеты ракурсов + вращение пальцем/мышью, щипок/колесо — приближение.
export class OrbitCam {
  constructor(camera, el) {
    this.camera = camera;
    this.target = V3(5, -1.5, 0);
    this.goal = V3(5, -1.5, 0);
    this.yaw = Math.PI / 2; this.pitch = 0.1; this.dist = 3.6;
    this.gYaw = this.yaw; this.gPitch = this.pitch; this.gDist = this.dist;
    this.user = { yaw: 0, pitch: 0, zoom: 1 };
    this.ptrs = new Map();
    el.addEventListener('pointerdown', (e) => { this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      if (this.ptrs.size === 1) {
        this.user.yaw -= (e.clientX - p.x) * 0.008;
        this.user.pitch = clamp(this.user.pitch + (e.clientY - p.y) * 0.006, -1.2, 1.2);
      } else if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX; p.y = e.clientY;
        const [c, d] = [...this.ptrs.values()];
        const d1 = Math.hypot(c.x - d.x, c.y - d.y);
        if (d0 > 0) this.user.zoom = clamp(this.user.zoom * d0 / d1, 0.35, 3);
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => this.ptrs.delete(e.pointerId);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.user.zoom = clamp(this.user.zoom * (1 + Math.sign(e.deltaY) * 0.1), 0.35, 3); }, { passive: false });
  }
  // ракурс: side | front | back | top | under | low | diag
  preset(name, dist) {
    const P = { side: [Math.PI / 2, 0.08, 3.6], front: [Math.PI * 0.12 - Math.PI / 2 + Math.PI, 0.15, 3.4], back: [-Math.PI / 2 + Math.PI, 0.2, 3.6], top: [Math.PI / 2, 1.25, 4.2], under: [Math.PI / 2, -0.7, 3.4], diag: [Math.PI / 3, 0.35, 3.8], diag2: [Math.PI * 0.7, 0.3, 3.8], low: [Math.PI / 2, -0.25, 3.3], far: [Math.PI / 2, 0.15, 7.5] }[name] || [Math.PI / 2, 0.1, 3.6];
    this.gYaw = P[0]; this.gPitch = P[1]; this.gDist = dist || P[2];
  }
  resetUser() { this.user.yaw = 0; this.user.pitch = 0; this.user.zoom = 1; }
  snap() { this.yaw = this.gYaw; this.pitch = this.gPitch; this.dist = this.gDist; this.target.copy(this.goal); }
  update(dt) {
    const k = 1 - Math.exp(-dt * 3.0);
    this.yaw = lerp(this.yaw, this.gYaw, k); this.pitch = lerp(this.pitch, this.gPitch, k); this.dist = lerp(this.dist, this.gDist, k);
    this.target.lerp(this.goal, 1 - Math.exp(-dt * 4.0));
    const yaw = this.yaw + this.user.yaw, pitch = clamp(this.pitch + this.user.pitch, -1.35, 1.4), d = this.dist * this.user.zoom;
    const c = this.camera;
    c.position.set(this.target.x + Math.cos(yaw) * Math.cos(pitch) * d, this.target.y + Math.sin(pitch) * d, this.target.z + Math.sin(yaw) * Math.cos(pitch) * d);
    if (this.free) { c.lookAt(this.target); return; }
    // не залезать в дно и за стенки
    c.position.y = Math.max(c.position.y, -POOL.depth + 0.15);
    c.position.z = clamp(c.position.z, -POOL.halfW + 0.15, POOL.halfW - 0.15);
    c.position.x = clamp(c.position.x, 0.15, POOL.len - 0.15);
    // не стоять ровно на поверхности воды
    if (Math.abs(c.position.y) < 0.05) c.position.y = this.target.y < 0 ? -0.05 : 0.05;
    c.lookAt(this.target);
  }
}
