// Процедурный райдер: доска, крепления под нужными углами, тело с IK ног и рук.
// Локальная система доски: X — к носу, Y — нормаль доски, Z — вправо от носа.
// Тело строится в «стоечной» системе (носки = +Z) и для goofy отражается по Z.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;

const LEG = 0.9, THIGH = 0.45, SHIN = 0.45, TORSO = 0.52, UARM = 0.29, FARM = 0.27;

function placeSeg(mesh, a, b) {
  const d = b.clone().sub(a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  if (len > 1e-5) mesh.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
  mesh.scale.set(1, Math.max(len, 1e-3), 1);
}

// Двухзвенная IK: возвращает положение среднего сустава.
function solveIK(root, end, l1, l2, pole) {
  const d = end.clone().sub(root);
  let dist = d.length();
  const maxD = (l1 + l2) * 0.999;
  if (dist > maxD) { end = root.clone().addScaledVector(d.normalize(), maxD); dist = maxD; d.copy(end).sub(root); }
  dist = Math.max(dist, 0.05);
  const dir = d.clone().normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1);
  perp.normalize();
  return { mid: root.clone().addScaledVector(dir, a).addScaledVector(perp, h), end };
}

function makeBoardGeo() {
  const L = 1.55, W = 0.25, nose = 0.16, waist = 0.235;
  const s = new THREE.Shape();
  const hw = W / 2, hl = L / 2;
  s.moveTo(-hl + nose, -hw);
  s.quadraticCurveTo(0, -waist / 2, hl - nose, -hw);
  s.quadraticCurveTo(hl + 0.01, -hw, hl, 0);
  s.quadraticCurveTo(hl + 0.01, hw, hl - nose, hw);
  s.quadraticCurveTo(0, waist / 2, -hl + nose, hw);
  s.quadraticCurveTo(-hl - 0.01, hw, -hl, 0);
  s.quadraticCurveTo(-hl - 0.01, -hw, -hl + nose, -hw);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); // форма в XZ, толщина вверх по Y
  // нос и хвост приподняты
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), ax = Math.abs(x);
    if (ax > hl - 0.2) p.setY(i, p.getY(i) + Math.pow((ax - (hl - 0.2)) / 0.2, 2) * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

function boardTexture(color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#ffffff22'; for (let i = 0; i < 9; i++) x.fillRect(20 + i * 26, 0, 10, 64);
  x.fillStyle = '#fff'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText('SNOW · SCHOOL', 128, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Rider {
  constructor({ ghost = false, palette = {} } = {}) {
    const pal = { jacket: '#ff7a2f', pants: '#2b3a55', helmet: '#f3f5f7', goggles: '#ffb100', gloves: '#1d1f24', boots: '#3a3f47', board: '#1f6feb', skin: '#e9b48f', ...palette };
    this.ghost = ghost;
    const mat = (c, extra = {}) => ghost
      ? new THREE.MeshBasicMaterial({ color: palette.ghost || '#4ade80', transparent: true, opacity: 0.28, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.0, ...extra });
    this.root = new THREE.Group();

    // Доска
    const boardMat = ghost ? mat() : [new THREE.MeshStandardMaterial({ map: boardTexture(pal.board), roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3 })];
    this.board = new THREE.Mesh(makeBoardGeo(), boardMat);
    this.board.castShadow = !ghost;
    this.root.add(this.board);

    // Тело и крепления в отражаемой группе
    this.stance = new THREE.Group();
    this.root.add(this.stance);
    const cyl = (r1, r2) => new THREE.CylinderGeometry(r1, r2, 1, 12);
    const seg = (geo, m) => { const s = new THREE.Mesh(geo, m); s.castShadow = !ghost; this.stance.add(s); return s; };
    const ball = (r, m) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); s.castShadow = !ghost; this.stance.add(s); return s; };

    const mJ = mat(pal.jacket), mP = mat(pal.pants), mG = mat(pal.gloves), mB = mat(pal.boots), mH = mat(pal.helmet);
    this.parts = {
      thighF: seg(cyl(0.075, 0.065), mP), thighR: seg(cyl(0.075, 0.065), mP),
      shinF: seg(cyl(0.062, 0.058), mP), shinR: seg(cyl(0.062, 0.058), mP),
      kneeF: ball(0.068, mP), kneeR: ball(0.068, mP),
      hip: seg(cyl(0.15, 0.15), mP),
      torso: seg(cyl(0.17, 0.15), mJ),
      chest: ball(0.17, mJ),
      uarmF: seg(cyl(0.055, 0.05), mJ), uarmR: seg(cyl(0.055, 0.05), mJ),
      farmF: seg(cyl(0.05, 0.045), mJ), farmR: seg(cyl(0.05, 0.045), mJ),
      handF: ball(0.05, mG), handR: ball(0.05, mG),
      shF: ball(0.06, mJ), shR: ball(0.06, mJ), elF: ball(0.05, mJ), elR: ball(0.05, mJ),
      neck: seg(cyl(0.05, 0.05), mat(pal.skin)),
    };
    // голова: шлем + маска
    this.head = new THREE.Group(); this.stance.add(this.head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), mH); helmet.castShadow = !ghost; this.head.add(helmet);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), mat(pal.skin)); face.position.set(0, -0.03, 0.03); this.head.add(face);
    const gog = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.065, 0.08), mat(pal.goggles, { metalness: 0.6, roughness: 0.2, emissive: ghost ? undefined : '#3a2400' }));
    gog.position.set(0, 0.0, 0.1); this.head.add(gog);
    // ботинки и крепления
    this.feet = [];
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.3), mB); boot.position.set(0, 0.075, 0.02); boot.castShadow = !ghost;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.27), mat('#20242b')); base.position.set(0, 0.03, 0);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), mat('#20242b')); hb.position.set(0, 0.13, -0.13); hb.rotation.x = -0.18;
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.08), mat('#e11d48')); strap.position.set(0, 0.12, 0.03);
      g.add(base, boot, hb, strap);
      this.stance.add(g); this.feet.push(g);
    }

    this.cfg = { stance: 'regular', front: 15, rear: 0, width: 0.52 };
    this.pose = { knee: 0.5, hinge: 0.12, weight: 0.1, rot: 0, gaze: 1, arms: 0.4, stiff: 0, lean: 0, fall: null, t: 0, up: null };
  }

  setConfig({ stance, front, rear, width }) {
    if (stance) this.cfg.stance = stance;
    if (front != null) this.cfg.front = front;
    if (rear != null) this.cfg.rear = rear;
    if (width != null) this.cfg.width = width;
    this.stance.scale.z = this.cfg.stance === 'goofy' ? -1 : 1;
  }

  // up — мировая вертикаль в локальной системе доски (если не задана — нормаль доски)
  update(pose = {}) {
    Object.assign(this.pose, pose);
    const p = this.pose, c = this.cfg, P = this.parts;
    const W = c.width, aF = c.front * Math.PI / 180, aR = c.rear * Math.PI / 180;
    const toe = c.stance === 'goofy' ? -1 : 1;

    // Крепления
    const ankF = V(W / 2, 0.13, 0), ankR = V(-W / 2, 0.13, 0);
    this.feet[0].position.set(W / 2, 0.018, 0); this.feet[0].rotation.set(0, aF, 0);
    this.feet[1].position.set(-W / 2, 0.018, 0); this.feet[1].rotation.set(0, aR, 0);
    const fdF = V(Math.sin(aF), 0, Math.cos(aF)), fdR = V(Math.sin(aR), 0, Math.cos(aR));

    // Ось тела: мировая вертикаль (в стоечной системе) + наклон в повороте
    let up = p.up ? p.up.clone() : UP.clone();
    up.z *= toe;
    const axis = UP.clone().lerp(up, 0.85).normalize();
    axis.z += Math.tan(Math.max(-1.1, Math.min(1.1, p.lean)));
    axis.normalize();

    let knee = Math.min(1, p.knee + (p.crouch || 0) * 0.35);
    let hFac = lerp(0.96 - 0.3 * knee, 0.985, p.stiff || 0);
    let hingeA = 0.16 + p.hinge * 0.95;
    const fall = p.fall;
    if (fall) {
      const k = Math.min(1, fall.k);
      axis.lerp(V(0, 0.25, fall.side).normalize(), k * 0.9).normalize();
      hFac = lerp(hFac, 0.3, k); knee = lerp(knee, 1, k);
      hingeA = lerp(hingeA, fall.side > 0 ? 0.9 : 0.4, k);
    }

    const mid = ankF.clone().add(ankR).multiplyScalar(0.5);
    const pelvis = mid.clone().addScaledVector(axis, LEG * hFac);
    pelvis.x += p.weight * W * 0.32;
    pelvis.z -= p.hinge * 0.16; // попа назад к пяткам
    // Направление таза и груди: между креплениями
    const mAng = (aF + aR) / 2;
    const fwd0 = V(Math.sin(mAng), 0, Math.cos(mAng));
    const side0 = V(Math.cos(mAng), 0, -Math.sin(mAng)); // к носу
    const hipF = pelvis.clone().addScaledVector(side0, 0.1), hipR = pelvis.clone().addScaledVector(side0, -0.1);

    const legF = solveIK(hipF, ankF, THIGH, SHIN, fdF.clone().add(V(0, 0.2, 0)));
    const legR = solveIK(hipR, ankR, THIGH, SHIN, fdR.clone().add(V(0, 0.2, 0)));
    placeSeg(P.thighF, hipF, legF.mid); placeSeg(P.shinF, legF.mid, legF.end);
    placeSeg(P.thighR, hipR, legR.mid); placeSeg(P.shinR, legR.mid, legR.end);
    P.kneeF.position.copy(legF.mid); P.kneeR.position.copy(legR.mid);
    placeSeg(P.hip, hipR, hipF); P.hip.scale.x = P.hip.scale.z = 0.75;

    // Позвоночник: наклон вперёд к носкам + чуть к носу при весе вперёд
    const spine = axis.clone().multiplyScalar(Math.cos(hingeA)).addScaledVector(fwd0, Math.sin(hingeA));
    spine.addScaledVector(side0, p.weight * 0.12).normalize();
    const neck = pelvis.clone().addScaledVector(spine, TORSO);
    placeSeg(P.torso, pelvis, neck);
    P.chest.position.copy(pelvis).addScaledVector(spine, TORSO * 0.72);
    P.chest.scale.set(1.05, 0.9, 0.75);

    // Плечи вращаются вокруг позвоночника
    const yaw = -p.rot * 0.75;
    tmpQ.setFromAxisAngle(spine, yaw);
    let shAxis = side0.clone().applyQuaternion(tmpQ);
    shAxis.addScaledVector(spine, -shAxis.dot(spine)).normalize();
    const chestFwd = new THREE.Vector3().crossVectors(shAxis, spine).normalize().multiplyScalar(-1);
    // chestFwd должен смотреть к носкам
    if (chestFwd.z < 0 && Math.abs(yaw) < 1.2) chestFwd.multiplyScalar(-1);
    const shF = neck.clone().addScaledVector(shAxis, 0.2).addScaledVector(spine, -0.05);
    const shR = neck.clone().addScaledVector(shAxis, -0.2).addScaledVector(spine, -0.05);
    P.shF.position.copy(shF); P.shR.position.copy(shR);

    // Голова: взгляд вперёд по ходу (к носу) или под ноги
    const headC = neck.clone().addScaledVector(spine, 0.16);
    placeSeg(P.neck, neck, headC);
    this.head.position.copy(headC);
    const lookTravel = side0.clone().multiplyScalar(0.8).add(chestFwd.clone().multiplyScalar(0.35)).add(V(0, -0.1, 0)).normalize();
    const lookDown = chestFwd.clone().multiplyScalar(0.35).add(V(0, -1, 0)).normalize();
    let look = lookDown.clone().lerp(lookTravel, p.gaze).normalize();
    if (fall) look.lerp(V(0, -0.3, fall.side), Math.min(1, fall.k)).normalize();
    const m = new THREE.Matrix4().lookAt(V(), look.clone().multiplyScalar(-1), spine);
    this.head.quaternion.setFromRotationMatrix(m);

    // Руки: прижаты → расслаблены → машут
    const t = p.t || 0;
    const relaxedF = V(0.22, -0.38, 0.18), relaxedR = V(-0.12, -0.42, 0.14);
    const tuck = V(0, -0.48, 0.06);
    const flailF = V(0.2, 0.28 + Math.sin(t * 9) * 0.22, 0.12 + Math.cos(t * 7) * 0.15);
    const flailR = V(-0.2, 0.22 + Math.sin(t * 8 + 2) * 0.24, 0.1 + Math.cos(t * 6) * 0.15);
    const pick = (rel, fl) => p.arms < 0.5 ? tuck.clone().lerp(rel, p.arms * 2) : rel.clone().lerp(fl, (p.arms - 0.5) * 2);
    let hF = shF.clone().add(pick(relaxedF, flailF)), hR = shR.clone().add(pick(relaxedR, flailR));
    if (fall) { const k = Math.min(1, fall.k); hF.lerp(shF.clone().add(V(0.15, -0.3, 0.45 * fall.side)), k); hR.lerp(shR.clone().add(V(-0.15, -0.3, 0.45 * fall.side)), k); }
    const armF = solveIK(shF, hF, UARM, FARM, V(0.1, -0.6, -0.6));
    const armR = solveIK(shR, hR, UARM, FARM, V(-0.1, -0.6, -0.6));
    placeSeg(P.uarmF, shF, armF.mid); placeSeg(P.farmF, armF.mid, armF.end);
    placeSeg(P.uarmR, shR, armR.mid); placeSeg(P.farmR, armR.mid, armR.end);
    P.elF.position.copy(armF.mid); P.elR.position.copy(armR.mid);
    P.handF.position.copy(armF.end); P.handR.position.copy(armR.end);
  }

  // Поставить доску на склон: basis — (нос, нормаль, вправо от носа) в мире; roll — опущенная сторона (+ правая), рад
  placeOnSlope(pos, nose, normal, right, roll) {
    const m = new THREE.Matrix4().makeBasis(nose, normal, right);
    this.root.quaternion.setFromRotationMatrix(m);
    this.root.quaternion.multiply(tmpQ.setFromAxisAngle(V(1, 0, 0), roll));
    // при закантовке доска опирается на кант — поднимем центр, чтобы кант касался снега
    this.root.position.copy(pos).addScaledVector(normal, Math.abs(Math.sin(roll)) * 0.125 + 0.01);
  }

  worldUpLocal() {
    const q = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    return UP.clone().applyQuaternion(q);
  }
}
