// Ныряльщик: гладкое тело из колец-сечений на скелете (скиннинг), гидрокостюм с капюшоном,
// маска, трубка, пальцы из фаланг и гибкие ласты (цепочка сегментов на пружинах, как парус на ветру).
// Скелет в исходной позе: человек стоит, лицо к +Z, левая сторона — +X, рост 1.75 м.
import * as THREE from 'three';
import { loftY, chainWeights, curve, clamp, lerp, smooth, hexRGB, mixRGB, V3, TAU } from './kit.js';

const BONES = [
  // имя, родитель, позиция сустава (мир, исходная поза)
  ['pelvis', null, [0, 1.00, 0]],
  ['spine', 'pelvis', [0, 1.10, -0.01]],
  ['chest', 'spine', [0, 1.28, -0.01]],
  ['neck', 'chest', [0, 1.50, -0.02]],
  ['head', 'neck', [0, 1.59, 0.0]],
  ['belly', 'spine', [0, 1.12, 0.0]],
  ['ribs', 'chest', [0, 1.32, 0.0]],
  ['clavL', 'chest', [0.03, 1.44, 0]], ['clavR', 'chest', [-0.03, 1.44, 0]],
  ['armL', 'clavL', [0.185, 1.445, -0.01]], ['armR', 'clavR', [-0.185, 1.445, -0.01]],
  ['foreL', 'armL', [0.185, 1.165, -0.01]], ['foreR', 'armR', [-0.185, 1.165, -0.01]],
  ['handL', 'foreL', [0.185, 0.905, -0.005]], ['handR', 'foreR', [-0.185, 0.905, -0.005]],
  ['thighL', 'pelvis', [0.088, 0.94, 0]], ['thighR', 'pelvis', [-0.088, 0.94, 0]],
  ['shinL', 'thighL', [0.09, 0.505, 0.005]], ['shinR', 'thighR', [-0.09, 0.505, 0.005]],
  ['footL', 'shinL', [0.09, 0.075, -0.005]], ['footR', 'shinR', [-0.09, 0.075, -0.005]],
];

// Профили (выкройки): y, полуширина, глубина спереди, глубина сзади, сдвиг z
const TORSO = curve([
  [0.84, 0.120, 0.070, 0.075, 0.00],
  [0.88, 0.160, 0.082, 0.098, -0.005],
  [0.94, 0.170, 0.088, 0.104, -0.008],
  [0.99, 0.167, 0.088, 0.102, -0.010],
  [1.04, 0.158, 0.090, 0.094, -0.004],
  [1.10, 0.140, 0.094, 0.080, 0.004],
  [1.16, 0.137, 0.097, 0.078, 0.006],
  [1.22, 0.146, 0.101, 0.084, 0.002],
  [1.28, 0.156, 0.106, 0.092, 0.000],
  [1.34, 0.164, 0.110, 0.097, 0.000],
  [1.39, 0.170, 0.106, 0.092, -0.004],
  [1.43, 0.175, 0.094, 0.088, -0.008],
  [1.465, 0.152, 0.074, 0.076, -0.012],
  [1.495, 0.105, 0.058, 0.064, -0.016],
  [1.52, 0.064, 0.052, 0.056, -0.010],
  [1.56, 0.056, 0.050, 0.052, 0.000],
  [1.62, 0.054, 0.048, 0.050, 0.008],
]);
const LEG = curve([
  [0.075, 0.033, 0.036, 0.036, 0.000],
  [0.12, 0.030, 0.031, 0.033, -0.002],
  [0.20, 0.036, 0.034, 0.042, -0.006],
  [0.30, 0.046, 0.038, 0.056, -0.012],
  [0.37, 0.051, 0.042, 0.063, -0.014],
  [0.44, 0.048, 0.046, 0.054, -0.004],
  [0.50, 0.050, 0.056, 0.048, 0.010],
  [0.55, 0.053, 0.056, 0.052, 0.010],
  [0.63, 0.063, 0.064, 0.058, 0.008],
  [0.74, 0.073, 0.073, 0.067, 0.006],
  [0.85, 0.081, 0.079, 0.077, 0.003],
  [0.94, 0.088, 0.083, 0.092, -0.004],
  [1.00, 0.084, 0.078, 0.088, -0.006],
]);
const ARM = curve([
  [0.90, 0.026, 0.020, 0.020, 0],
  [0.96, 0.029, 0.024, 0.024, 0],
  [1.04, 0.036, 0.033, 0.034, 0],
  [1.11, 0.041, 0.040, 0.040, 0],
  [1.17, 0.038, 0.037, 0.039, 0],
  [1.24, 0.041, 0.041, 0.041, 0],
  [1.32, 0.046, 0.046, 0.047, 0],
  [1.40, 0.053, 0.051, 0.051, 0],
  [1.47, 0.056, 0.055, 0.056, 0],
  [1.50, 0.046, 0.046, 0.046, 0],
]);
// Голова от основания (0 = верх шеи): полуширина, лицо вперёд, затылок назад, сдвиг z
const HEAD = curve([
  [-0.03, 0.055, 0.055, 0.052, 0.01],
  [0.00, 0.060, 0.070, 0.055, 0.02],
  [0.03, 0.066, 0.090, 0.060, 0.02],
  [0.06, 0.072, 0.098, 0.074, 0.01],
  [0.10, 0.079, 0.104, 0.090, 0.00],
  [0.14, 0.082, 0.102, 0.096, -0.005],
  [0.18, 0.079, 0.094, 0.094, -0.008],
  [0.215, 0.066, 0.076, 0.080, -0.010],
  [0.24, 0.040, 0.046, 0.050, -0.010],
]);

export const SUITS = {
  teal: { base: '#1b2430', panel: '#0f8ea0', stripe: '#38e1d5' },
  orange: { base: '#202226', panel: '#d5652a', stripe: '#ffb15c' },
  red: { base: '#24161a', panel: '#b83a3a', stripe: '#ff8080' },
  green: { base: '#17241d', panel: '#2f9a5a', stripe: '#7ee2a1' },
  blue: { base: '#141c2e', panel: '#2f5fd0', stripe: '#8fb4ff' },
};

const SKIN = hexRGB('#d9a184');

export class Diver {
  constructor({ suit = 'teal', fins = 'bifins', finColor = '#1f6fd1', ghost = null } = {}) {
    this.root = new THREE.Group();
    this.suit = SUITS[suit] || SUITS.teal;
    this.finType = fins;
    this.finColor = finColor;
    this.bones = {};
    this.boneList = [];
    const tmp = {};
    for (const [name, parent, p] of BONES) {
      const b = new THREE.Bone(); b.name = name;
      tmp[name] = V3(...p);
      if (parent) { b.position.copy(tmp[name]).sub(tmp[parent]); this.bones[parent].add(b); } else b.position.copy(tmp[name]);
      this.bones[name] = b; this.boneList.push(b);
    }
    this.restPos = tmp;
    this.bi = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
    this.root.add(this.bones.pelvis);
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.boneList);

    const matOpts = { vertexColors: true, roughness: 0.55, metalness: 0.05 };
    if (ghost) Object.assign(matOpts, { transparent: true, opacity: ghost.opacity ?? 0.5, depthWrite: false });
    this.mat = new THREE.MeshStandardMaterial(matOpts);
    this.ghost = ghost;
    this._buildBody();
    this._buildHead();
    this._buildHands();
    this._buildFeet();
    this._buildGear();
    this.fins = [];
    if (fins !== 'none') this._buildFins();
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = !ghost; o.frustumCulled = false; } });
    this.pose = null;
  }

  // ---------------------------------------------------------------- тело
  _suitColor(x, y, z, phi, part) {
    const s = this.suit, base = hexRGB(s.base), panel = hexRGB(s.panel), stripe = hexRGB(s.stripe);
    const side = Math.abs(Math.cos(phi));
    let c = base;
    if (part === 'torso') {
      // боковые вставки и лампас — как у гидрокостюма для фридайвинга
      if (side > 0.93 && y < 1.42) c = stripe;
      else if (z > 0 && y > 1.22 && y < 1.43 && Math.abs(x) < 0.12) c = mixRGB(base, panel, 0.55);
      if (y > 0.955 && y < 0.995) c = hexRGB('#2b2b2b');
    } else if (part === 'leg') {
      if (side > 0.93) c = stripe;
      if (y < 0.24) c = mixRGB(base, panel, 0.25);
    } else if (part === 'arm') {
      if (side > 0.93 && Math.cos(phi) * Math.sign(x) > 0) c = stripe;
      if (y < 0.94) c = SKIN; // запястья открыты
    }
    return c;
  }

  _buildBody() {
    const B = this.bi;
    const parts = [];
    // Торс: таз → поясница → грудь → шея; живот и рёбра дышат отдельными костями
    const tw = chainWeights([{ bone: B.pelvis, to: 1.06 }, { bone: B.spine, to: 1.25 }, { bone: B.chest, to: 1.51 }, { bone: B.neck }], 0.05);
    parts.push(loftY({
      y0: 0.84, y1: 1.62, rings: 64, seg: 36, prof: TORSO, p: 2.3,
      weights: (x, y, z) => {
        let w = tw(y);
        // живот: передняя стенка выдаётся на вдохе
        const bw = z > 0 ? smooth(0.0, 0.07, z) * smooth(0.96, 1.06, y) * smooth(1.27, 1.17, y) * 0.85 : 0;
        // рёбра: расширяются в стороны и вперёд
        const rw = smooth(1.18, 1.26, y) * smooth(1.46, 1.38, y) * 0.7;
        // плечевой пояс: верх груди у плеч следует за ключицей
        const cw = smooth(0.10, 0.165, Math.abs(x)) * smooth(1.36, 1.44, y) * 0.75;
        const extra = [];
        if (bw > 0.01) extra.push([B.belly, bw]);
        if (rw > 0.01) extra.push([B.ribs, rw]);
        if (cw > 0.01) extra.push([x > 0 ? B.clavL : B.clavR, cw]);
        let sum = extra.reduce((a, e) => a + e[1], 0);
        if (sum > 0.9) { extra.forEach((e) => (e[1] *= 0.9 / sum)); sum = 0.9; }
        w = w.map(([b, v]) => [b, v * (1 - sum)]).concat(extra);
        return w.slice(0, 4);
      },
      color: (x, y, z, phi) => this._suitColor(x, y, z, phi, 'torso'),
    }));
    // Ноги
    for (const side of [1, -1]) {
      const L = side > 0 ? 'L' : 'R';
      const lw = chainWeights([{ bone: B['thigh' + L], to: 0.505 }, { bone: B['shin' + L], to: 0.085 }, { bone: B['foot' + L] }], 0.055);
      parts.push(loftY({
        y0: 0.075, y1: 1.0, rings: 70, seg: 26, prof: (y) => { const r = LEG(y); return [r[0], r[1], r[2], r[3], side * lerp(0.09, 0.083, smooth(0.6, 1.0, y))]; },
        weights: (x, y) => {
          const w = lw(y), top = smooth(0.90, 1.0, y) * 0.55;
          if (top < 0.01) return w;
          return w.map(([b, v]) => [b, v * (1 - top)]).concat([[B.pelvis, top]]);
        },
        color: (x, y, z, phi) => this._suitColor(x, y, z, phi, 'leg'),
        domeTop: 0,
      }));
    }
    // Руки: дельта — купол сверху
    for (const side of [1, -1]) {
      const L = side > 0 ? 'L' : 'R';
      const aw = chainWeights([{ bone: B['arm' + L], to: 1.165 }, { bone: B['fore' + L], to: 0.91 }, { bone: B['hand' + L] }], 0.045);
      parts.push(loftY({
        y0: 0.90, y1: 1.50, rings: 48, seg: 22, prof: (y) => { const r = ARM(y); return [r[0], r[1], r[2], -0.01, side * 0.185]; },
        weights: (x, y) => {
          const w = aw(y), top = smooth(1.44, 1.53, y) * 0.35;
          if (top < 0.01) return w;
          return w.map(([b, v]) => [b, v * (1 - top)]).concat([[B['clav' + L], top]]);
        },
        color: (x, y, z, phi) => this._suitColor(x, y, z, phi, 'arm'),
        domeTop: 5,
      }));
    }
    this.skinned = parts.map((g) => {
      const m = new THREE.SkinnedMesh(g, this.mat);
      this.root.add(m);
      m.bind(this.skeleton);
      return m;
    });
  }

  _rigid(geo, mat, bone, offset = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    const b = this.bones[bone];
    // меш задан в мировых координатах исходной позы — переводим в систему кости
    m.position.set(...offset).sub(this.restPos[bone]);
    b.add(m);
    return m;
  }

  _std(color, extra = {}) {
    const o = { color, roughness: 0.5, metalness: 0.05, ...extra };
    if (this.ghost) Object.assign(o, { transparent: true, opacity: this.ghost.opacity ?? 0.5, depthWrite: false });
    return new THREE.MeshStandardMaterial(o);
  }

  _buildHead() {
    const hb = this.restPos.head;
    // капюшон и лицо: одна поверхность, лицо — овал кожи спереди
    const hood = hexRGB(this.suit.base), skin = SKIN;
    const g = loftY({
      y0: -0.03, y1: 0.24, rings: 40, seg: 36, prof: HEAD, p: 2.1, domeTop: 6,
      color: (x, y, z, phi) => {
        const ny = (y - 0.075) / 0.085, nx = x / 0.06;
        if (z > 0.03 && nx * nx + ny * ny < 1) return skin;
        return hood;
      },
    });
    const head = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, ...(this.ghost ? { transparent: true, opacity: this.ghost.opacity ?? 0.5, depthWrite: false } : {}) }));
    this.bones.head.add(head);
    this.headMesh = head;
    // нос
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), this._std('#d29a7c'));
    nose.scale.set(0.8, 1.3, 1.1); nose.position.set(0, 0.08, 0.108);
    head.add(nose);
    // маска малого объёма: рамка + два стекла
    const frameM = this._std('#111418', { roughness: 0.35 });
    const glassM = new THREE.MeshStandardMaterial({ color: '#7fd8ff', roughness: 0.05, metalness: 0.6, transparent: true, opacity: this.ghost ? 0.3 : 0.75 });
    const mask = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 6, 16), frameM);
    frame.rotation.z = Math.PI / 2; frame.scale.set(1, 1, 0.55);
    mask.add(frame);
    for (const s of [1, -1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), glassM);
      lens.scale.set(1.1, 0.95, 0.35); lens.position.set(s * 0.032, 0.002, 0.012);
      mask.add(lens);
    }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.006, 6, 32), frameM);
    strap.rotation.x = Math.PI / 2 + 0.25; strap.scale.set(1, 1.15, 1); strap.position.set(0, -0.005, -0.10);
    mask.add(strap);
    mask.position.set(0, 0.112, 0.10);
    head.add(mask);
    this.mask = mask;
    // трубка слева: от загубника над ухом вверх
    const path = new THREE.CatmullRomCurve3([V3(0.0, 0.035, 0.115), V3(0.04, 0.03, 0.12), V3(0.085, 0.06, 0.06), V3(0.095, 0.16, 0.02), V3(0.09, 0.32, -0.01)]);
    const snorkel = new THREE.Mesh(new THREE.TubeGeometry(path, 30, 0.011, 10), this._std('#e9eef2', { roughness: 0.4 }));
    head.add(snorkel);
    this.snorkel = snorkel;
    this.mouthLocal = V3(0, 0.035, 0.11);
    this.noseLocal = V3(0, 0.07, 0.12);
  }

  _buildHands() {
    // Ладонь — лофт, пальцы — по две фаланги на шарнирах, большой палец — отдельно.
    this.fingers = { L: [], R: [] };
    const skinM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, ...(this.ghost ? { transparent: true, opacity: this.ghost.opacity ?? 0.5, depthWrite: false } : {}) });
    const PALM = curve([[-0.105, 0.010, 0.038, 0.038, 0], [-0.08, 0.013, 0.044, 0.044, 0], [-0.04, 0.014, 0.043, 0.043, 0], [-0.01, 0.013, 0.033, 0.033, 0], [0.01, 0.012, 0.024, 0.024, 0]]);
    for (const side of [1, -1]) {
      const L = side > 0 ? 'L' : 'R';
      const hand = new THREE.Group();
      hand.position.set(0, 0, 0);
      this.bones['hand' + L].add(hand);
      // ладонь тонкая по X, широкая по Z (рука висит вдоль тела)
      const pg = loftY({ y0: -0.105, y1: 0.01, rings: 12, seg: 18, prof: PALM, p: 2.6, color: () => SKIN });
      hand.add(new THREE.Mesh(pg, skinM));
      const fingerZ = [0.028, 0.009, -0.010, -0.027], fingerL = [0.044, 0.050, 0.047, 0.037];
      const fingerM = this._std('#d9a184', { roughness: 0.65 });
      for (let f = 0; f < 4; f++) {
        const base = new THREE.Group();
        base.position.set(0, -0.103, fingerZ[f]);
        hand.add(base);
        const len = fingerL[f];
        const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, len * 0.5, 4, 8), fingerM);
        seg1.position.y = -len * 0.28; base.add(seg1);
        const j2 = new THREE.Group(); j2.position.y = -len * 0.55; base.add(j2);
        const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0078, len * 0.42, 4, 8), fingerM);
        seg2.position.y = -len * 0.25; j2.add(seg2);
        this.fingers[L].push({ base, j2 });
      }
      // большой палец — со стороны +Z (вперёд, когда рука висит)
      const tb = new THREE.Group(); tb.position.set(-side * 0.004, -0.03, 0.036); hand.add(tb);
      const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.03, 4, 8), fingerM); t1.position.y = -0.022; tb.add(t1);
      const tj = new THREE.Group(); tj.position.y = -0.045; tb.add(tj);
      const t2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.022, 4, 8), fingerM); t2.position.y = -0.016; tj.add(t2);
      tb.rotation.x = 0.55;
      this.fingers[L].thumb = { base: tb, j2: tj };
      hand.children[0].position.set(0, 0, 0);
      hand.position.copy(V3(0, 0, 0));
      this['hand' + L + 'G'] = hand;
    }
  }

  _buildFeet() {
    // стопа в калоше ласты: по Z от пятки к носку
    this.pockets = {};
    for (const side of [1, -1]) {
      const L = side > 0 ? 'L' : 'R';
      const foot = this.bones['foot' + L];
      // [длина, полуширина, подошва, подъём, опускание носка]
      const FOOT = curve([[-0.065, 0.030, 0.030, 0.030, 0], [-0.03, 0.038, 0.032, 0.042, 0.0], [0.03, 0.044, 0.030, 0.044, 0.008], [0.10, 0.046, 0.026, 0.030, 0.02], [0.17, 0.040, 0.020, 0.018, 0.03], [0.20, 0.030, 0.014, 0.012, 0.034]]);
      // лофт по Y, затем поворот: ось Y → Z
      const g = loftY({ y0: -0.065, y1: 0.20, rings: 22, seg: 20, prof: (y) => { const r = FOOT(y); return [r[0], r[1], r[2], r[3], 0]; }, p: 2.6, domeTop: 3, domeBot: 3,
        color: () => (this.finType === 'none' ? SKIN : hexRGB('#15181c')) });
      g.rotateX(Math.PI / 2);
      // после поворота «вперёд по Z» — то, что было +Y; профиль zOffset → -Y (подошва)
      g.translate(0, -0.035, 0.0);
      const m = new THREE.Mesh(g, this.finType === 'none' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }) : this._std('#15181c', { roughness: 0.6 }));
      if (this.finType !== 'none') m.material.vertexColors = false;
      foot.add(m);
      // голень над стопой — продолжение костюма (носок)
      this.pockets[L] = m;
    }
  }

  _buildGear() {
    // грузовой пояс (резина) с пряжкой — на тазе
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 8, 40), this._std('#2a2a2a', { roughness: 0.8 }));
    belt.scale.set(0.178, 0.12, 1); // x, z-полуоси через поворот
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(0.176, 0.12, 0.18);
    const beltG = new THREE.Group(); beltG.add(belt);
    belt.scale.set(0.176, 0.118, 0.18);
    beltG.position.set(0, 0.985 - 1.0, -0.012);
    this.bones.pelvis.add(beltG);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.01), this._std('#c0c6cc', { metalness: 0.8, roughness: 0.3 }));
    buckle.position.set(0, 0, 0.122); beltG.add(buckle);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), this._std('#4a4f55', { metalness: 0.5, roughness: 0.5 }));
      w.position.set(s * 0.12, 0, 0.085); w.rotation.y = s * 0.7; beltG.add(w);
    }
    this.belt = beltG;
    // часы-компьютер на левом запястье
    const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20), this._std('#101317', { metalness: 0.4 }));
    watch.rotation.z = -Math.PI / 2; watch.position.set(0.026, 0.94 - 0.905, 0);
    this.bones.foreL.add(watch);
    watch.position.set(0.03, 0.935 - 1.165, 0);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.017, 20), new THREE.MeshBasicMaterial({ color: '#46e0ff' }));
    face.position.set(0, 0.0065, 0); face.rotation.x = -Math.PI / 2; watch.add(face);
    // лямка-лайнярд не нужна в бассейне
  }

  // ---------------------------------------------------------------- ласты
  _buildFins() {
    const mono = this.finType === 'mono';
    const N = 14, len = mono ? 0.72 : 0.78;
    const mk = (L) => {
      const nodes = []; for (let i = 0; i < N; i++) nodes.push({ p: V3(), q: V3(), init: false });
      const W = 2 * N * 3;
      const geo = new THREE.BufferGeometry();
      // лента из 3 рядов (левый край, центр, правый) — центр утолщён, по краям рейки
      const pos = new Float32Array(N * 4 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const idx = [];
      for (let i = 0; i < N - 1; i++) {
        for (let k = 0; k < 3; k++) {
          const a = i * 4 + k, b = a + 1, c = a + 4, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      geo.setIndex(idx);
      const col = new THREE.Color(this.finColor);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: this.ghost ? 0.4 : 0.92 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      // рейки по краям
      const railGeo = new THREE.BufferGeometry();
      railGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
      const rails = new THREE.LineSegments(railGeo, new THREE.LineBasicMaterial({ color: '#0b0d10' }));
      const ri = []; for (let i = 0; i < N - 1; i++) { ri.push(i * 2, (i + 1) * 2, i * 2 + 1, (i + 1) * 2 + 1); }
      railGeo.setIndex(ri);
      rails.frustumCulled = false;
      return { L, nodes, mesh, rails, len, seg: len / (N - 1), stiff: 0.5, width: mono ? 0.36 : 0.105, widthTip: mono ? 0.42 : 0.11 };
    };
    if (mono) this.fins.push(mk('M'));
    else { this.fins.push(mk('L')); this.fins.push(mk('R')); }
    this.finGroup = new THREE.Group();
    for (const f of this.fins) { this.finGroup.add(f.mesh); this.finGroup.add(f.rails); }
  }

  // жёсткость: 0 — мягкие, 1 — жёсткие
  setFinStiffness(s) { for (const f of this.fins) f.stiff = s; }

  _finFrame(L) {
    // точка и направление крепления лопасти в мире
    const m = new THREE.Matrix4();
    if (L === 'M') {
      const a = this._finFrame('L'), b = this._finFrame('R');
      return { o: a.o.clone().add(b.o).multiplyScalar(0.5), dir: a.dir.clone().add(b.dir).normalize(), side: a.side.clone().add(b.side).normalize(), up: a.up.clone().add(b.up).normalize() };
    }
    const foot = this.bones['foot' + L];
    foot.updateWorldMatrix(true, false);
    m.copy(foot.matrixWorld);
    const o = V3(0, -0.04, 0.17).applyMatrix4(m);
    // лопасть под углом ~20° к подошве (как у ласт для фридайвинга)
    const dirL = V3(0, -Math.sin(0.33), Math.cos(0.33));
    const dir = dirL.transformDirection(m);
    const side = V3(1, 0, 0).transformDirection(m);
    const up = V3(0, Math.cos(0.33), Math.sin(0.33)).transformDirection(m);
    return { o, dir, side, up };
  }

  updateFins(dt, water = true) {
    if (!this.fins.length) return;
    dt = Math.min(dt, 1 / 20);
    const sub = 4, h = dt / sub;
    for (const f of this.fins) {
      const fr = this._finFrame(f.L);
      const n = f.nodes;
      if (!n[0].init) {
        for (let i = 0; i < n.length; i++) { n[i].p.copy(fr.o).addScaledVector(fr.dir, i * f.seg); n[i].q.copy(n[i].p); n[i].init = true; }
      }
      const drag = water ? 7.5 : 1.5;
      const kBend = lerp(0.55, 0.92, f.stiff), kRest = lerp(0.015, 0.06, f.stiff);
      for (let s = 0; s < sub; s++) {
        // корень и второй узел жёстко в калоше
        n[0].p.copy(fr.o); n[0].q.copy(fr.o);
        const p1 = fr.o.clone().addScaledVector(fr.dir, f.seg);
        n[1].p.copy(p1); n[1].q.copy(p1);
        for (let i = 2; i < n.length; i++) {
          const nd = n[i], v = nd.p.clone().sub(nd.q);
          // вода гасит в основном движение поперёк лопасти, вдоль — слабо
          const vn = fr.up.clone().multiplyScalar(v.dot(fr.up));
          const vt = v.clone().sub(vn);
          v.copy(vt.multiplyScalar(Math.exp(-drag * 0.15 * h))).add(vn.multiplyScalar(Math.exp(-drag * h)));
          nd.q.copy(nd.p);
          nd.p.add(v);
        }
        for (let it = 0; it < 3; it++) {
          for (let i = 2; i < n.length; i++) {
            // изгибная пружина: тянет к продолжению предыдущего сегмента (жёсткость падает к концу)
            const d = n[i - 1].p.clone().sub(n[i - 2].p).normalize();
            const target = n[i - 1].p.clone().addScaledVector(d, f.seg);
            const k = kBend * lerp(1.0, 0.7, i / n.length);
            n[i].p.lerp(target, k);
            // упругость материала: лопасть возвращается к своей прямой форме
            n[i].p.lerp(fr.o.clone().addScaledVector(fr.dir, i * f.seg), kRest);
            // длина сегмента
            const e = n[i].p.clone().sub(n[i - 1].p), l = e.length() || 1;
            n[i].p.copy(n[i - 1].p).addScaledVector(e, f.seg / l);
          }
        }
      }
      // геометрия
      const pos = f.mesh.geometry.attributes.position.array, rp = f.rails.geometry.attributes.position.array;
      for (let i = 0; i < n.length; i++) {
        const t = i / (n.length - 1);
        const w = lerp(f.width, f.widthTip, t) * (i === 0 ? 0.8 : 1);
        const c = n[i].p;
        const th = lerp(0.012, 0.003, t);
        const sx = fr.side;
        const upv = fr.up;
        const pts = [
          c.clone().addScaledVector(sx, w),
          c.clone().addScaledVector(sx, w * 0.35).addScaledVector(upv, th),
          c.clone().addScaledVector(sx, -w * 0.35).addScaledVector(upv, th),
          c.clone().addScaledVector(sx, -w),
        ];
        for (let k = 0; k < 4; k++) { pos[(i * 4 + k) * 3] = pts[k].x; pos[(i * 4 + k) * 3 + 1] = pts[k].y; pos[(i * 4 + k) * 3 + 2] = pts[k].z; }
        rp[i * 6] = pts[0].x; rp[i * 6 + 1] = pts[0].y; rp[i * 6 + 2] = pts[0].z;
        rp[i * 6 + 3] = pts[3].x; rp[i * 6 + 4] = pts[3].y; rp[i * 6 + 5] = pts[3].z;
      }
      f.mesh.geometry.attributes.position.needsUpdate = true;
      f.mesh.geometry.computeVertexNormals();
      f.mesh.geometry.computeBoundingSphere();
      f.rails.geometry.attributes.position.needsUpdate = true;
    }
  }

  resetFins() { for (const f of this.fins) for (const n of f.nodes) n.init = false; }

  // изгиб лопасти (для подписи): угол между корнем и концом
  finBend() {
    if (!this.fins.length) return 0;
    const n = this.fins[0].nodes;
    const a = n[1].p.clone().sub(n[0].p).normalize(), b = n[n.length - 1].p.clone().sub(n[n.length - 2].p).normalize();
    return Math.acos(clamp(a.dot(b), -1, 1));
  }

  // ---------------------------------------------------------------- поза
  // pose: { pos:[x,y,z], pitch, roll, yaw, j:{bone:[x,y,z]}, belly, ribs, hands:{L,R}, snorkel, mask }
  applyPose(pose) {
    this.pose = pose;
    const b = this.bones;
    // ориентация корня: голова вдоль h, живот вдоль f (в вертикальной плоскости XY), плюс рысканье и крен
    const p = pose.pitch || 0, yaw = pose.yaw || 0, roll = pose.roll || 0;
    const h = V3(Math.cos(p), Math.sin(p), 0), f = V3(Math.sin(p), -Math.cos(p), 0);
    const x = new THREE.Vector3().crossVectors(h, f);
    const m = new THREE.Matrix4().makeBasis(x, h, f);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), roll));
    if (yaw) q.premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw));
    this.root.quaternion.copy(q);
    // корень: таз в точке pos
    const pp = pose.pos || [0, 0, 0];
    const pel = V3(0, 1.0, 0).applyQuaternion(q);
    this.root.position.set(pp[0], pp[1], pp[2]).sub(pel);
    for (const [name, bone] of Object.entries(b)) {
      const r = pose.j && pose.j[name];
      bone.rotation.order = name.startsWith('hand') ? 'YXZ' : 'ZXY';
      if (r) bone.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); else bone.rotation.set(0, 0, 0);
      bone.scale.set(1, 1, 1);
    }
    // руки задаются направлением плеча и тем, куда сгибается локоть (так проще ставить гребки)
    if (pose.aim) for (const L of ['L', 'R']) {
      const a = pose.aim['arm' + L]; if (!a) continue;
      const s = L === 'L' ? 1 : -1;
      const d = V3(a[0] * s, a[1], a[2]).normalize();
      const bt = V3(a[3] * s, a[4], a[5]);
      const q1 = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), d);
      const z1 = V3(0, 0, 1).applyQuaternion(q1);
      const bp = bt.addScaledVector(d, -bt.dot(d));
      if (bp.lengthSq() > 1e-6) {
        bp.normalize();
        const ang = Math.atan2(new THREE.Vector3().crossVectors(z1, bp).dot(d), z1.dot(bp));
        q1.premultiply(new THREE.Quaternion().setFromAxisAngle(d, ang));
      }
      const clav = b['clav' + L];
      clav.updateMatrix();
      const qc = clav.quaternion.clone().invert();
      b['arm' + L].quaternion.copy(qc.multiply(q1));
    }
    const bel = pose.belly ?? 0, rib = pose.ribs ?? 0;
    b.belly.scale.set(1 + bel * 0.06, 1, 1 + bel * 0.42);
    b.ribs.scale.set(1 + rib * 0.07, 1 + rib * 0.02, 1 + rib * 0.12);
    if (this.snorkel) this.snorkel.visible = pose.snorkel !== false;
    if (this.mask) this.mask.visible = pose.mask !== false;
    this._handShape('L', (pose.hands && pose.hands.L) || 'relax');
    this._handShape('R', (pose.hands && pose.hands.R) || 'relax');
    this.root.updateMatrixWorld(true);
  }

  _handShape(L, shape) {
    const F = this.fingers[L];
    const s = L === 'L' ? 1 : -1;
    // сгиб пальцев к ладони — к центру тела (−X для левой)
    const set = (g, a, spread = 0) => { g.rotation.set(0, 0, 0); g.rotation.z = -s * a; g.rotation.x = spread; };
    const k = { flat: [0.05, 0.05], relax: [0.35, 0.35], cup: [0.18, 0.15], fist: [1.4, 1.5], ok: [0.25, 0.25], pinch: [0.9, 1.0], point: [1.3, 1.4] }[shape] || [0.3, 0.3];
    F.forEach((f, i) => {
      let a1 = k[0], a2 = k[1];
      if (shape === 'ok' && i === 0) { a1 = 1.05; a2 = 0.9; }
      if (shape === 'pinch' && i === 0) { a1 = 0.6; a2 = 0.5; }
      if (shape === 'point' && i === 0) { a1 = 0.05; a2 = 0.05; }
      const spread = shape === 'flat' || shape === 'cup' ? 0 : (i - 1.5) * 0.06;
      set(f.base, a1, spread); set(f.j2, a2);
    });
    const t = F.thumb;
    t.base.rotation.set(0.55, 0, 0); t.j2.rotation.set(0, 0, 0);
    if (shape === 'ok' || shape === 'pinch') { t.base.rotation.set(0.25, 0, -s * 0.75); t.j2.rotation.z = -s * 0.5; }
    else if (shape === 'fist' || shape === 'point') { t.base.rotation.set(0.3, 0, -s * 0.8); t.j2.rotation.z = -s * 0.6; }
    else if (shape === 'flat' || shape === 'cup') { t.base.rotation.set(0.12, 0, -s * 0.15); }
  }

  worldOf(local, bone = 'head') {
    return local.clone().applyMatrix4(this.bones[bone].matrixWorld);
  }
  mouthWorld() { return this.headMesh.localToWorld(this.mouthLocal.clone()); }
  jointWorld(name) { const v = V3(); this.bones[name].getWorldPosition(v); return v; }
  // ладонь: центр и нормаль (сторона ладони)
  palm(L) {
    const g = this['hand' + L + 'G'];
    const c = g.localToWorld(V3(0, -0.06, 0));
    const s = L === 'L' ? -1 : 1;
    const n = V3(s, 0, 0).transformDirection(g.matrixWorld);
    return { c, n };
  }
}
