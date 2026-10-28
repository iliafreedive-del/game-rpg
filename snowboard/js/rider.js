// Процедурный райдер: доска, крепления под нужными углами, тело с IK ног и рук.
// Локальная система доски: X — к носу, Y — нормаль доски, Z — вправо от носа.
// Тело строится в «стоечной» системе (носки = +Z) и для goofy отражается по Z.
// Здесь — суставы и поза; внешний вид (одежда, снаряжение) — в art/body.js.
import * as THREE from 'three';
import { RiderModel } from './art/body.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;

const LEG = 0.9, THIGH = 0.45, SHIN = 0.45, TORSO = 0.52, UARM = 0.29, FARM = 0.27, NECK = 0.16;

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

export class Rider {
  constructor({ ghost = false, palette = {} } = {}) {
    const pal = { jacket: '#1ba7e3', jacket2: '#22306a', pants: '#686d75', helmet: '#f3f5f7', goggles: '#ffb100', frame: '#16181c', gloves: '#1d1f24', boots: '#2c3139', board: '#1f6feb', skin: '#e9b48f', accent: '#e11d48', gaiter: '#2f3e4f', ...palette };
    this.ghost = ghost;
    this.root = new THREE.Group();
    // Тело и крепления — в отражаемой группе (для goofy)
    this.stance = new THREE.Group();
    this.root.add(this.stance);
    this.model = new RiderModel({ root: this.root, stance: this.stance, ghost, pal, ghostColor: palette.ghost || '#4ade80', dims: { THIGH, SHIN, TORSO, UARM, FARM, NECK } });
    this.board = this.model.board; this.feet = this.model.feet; this.head = this.model.head;

    // Центр тяжести: шар у таза + отвес на доску. Рисуется поверх тела, чтобы было видно всегда.
    this.com = new THREE.Group(); this.com.visible = false;
    const comMat = new THREE.MeshBasicMaterial({ color: '#22c55e', depthTest: false, transparent: true, opacity: 0.95 });
    const top = (m) => { m.renderOrder = 20; this.com.add(m); return m; };
    this.comBall = top(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), comMat));
    this.comLine = top(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), comMat));
    this.comDot = top(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 20), comMat));
    this.comMid = top(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.3), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false })));
    this.comMat = comMat;
    this.stance.add(this.com);

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
    const p = this.pose, c = this.cfg;
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
    pelvis.x += p.weight * W * 0.4;
    pelvis.z -= p.hinge * 0.16; // попа назад к пяткам
    // Направление таза и груди: между креплениями
    const mAng = (aF + aR) / 2;
    const fwd0 = V(Math.sin(mAng), 0, Math.cos(mAng));
    const side0 = V(Math.cos(mAng), 0, -Math.sin(mAng)); // к носу
    const hipF = pelvis.clone().addScaledVector(side0, 0.1), hipR = pelvis.clone().addScaledVector(side0, -0.1);

    const legF = solveIK(hipF, ankF, THIGH, SHIN, fdF.clone().add(V(0, 0.2, 0)));
    const legR = solveIK(hipR, ankR, THIGH, SHIN, fdR.clone().add(V(0, 0.2, 0)));

    // Позвоночник: наклон вперёд к носкам + чуть к носу при весе вперёд
    const spine = axis.clone().multiplyScalar(Math.cos(hingeA)).addScaledVector(fwd0, Math.sin(hingeA));
    spine.addScaledVector(side0, p.weight * 0.12).normalize();
    const neck = pelvis.clone().addScaledVector(spine, TORSO);

    // Плечи вращаются вокруг позвоночника
    const yaw = -p.rot * 0.75;
    tmpQ.setFromAxisAngle(spine, yaw);
    let shAxis = side0.clone().applyQuaternion(tmpQ);
    shAxis.addScaledVector(spine, -shAxis.dot(spine)).normalize();
    const chestFwd = new THREE.Vector3().crossVectors(shAxis, spine).normalize().multiplyScalar(-1);
    // chestFwd должен смотреть к носкам
    if (chestFwd.z < 0 && Math.abs(yaw) < 1.2) chestFwd.multiplyScalar(-1);
    const shF = neck.clone().addScaledVector(shAxis, 0.18).addScaledVector(spine, -0.05);
    const shR = neck.clone().addScaledVector(shAxis, -0.18).addScaledVector(spine, -0.05);

    // Голова: взгляд вперёд по ходу (к носу) или под ноги
    const headC = neck.clone().addScaledVector(spine, NECK);
    const lookTravel = side0.clone().multiplyScalar(0.8).add(chestFwd.clone().multiplyScalar(0.35)).add(V(0, -0.1, 0)).normalize();
    const lookDown = chestFwd.clone().multiplyScalar(0.35).add(V(0, -1, 0)).normalize();
    let look = lookDown.clone().lerp(lookTravel, p.gaze).normalize();
    // падая назад — подбородок к груди (затылок не бьётся о снег); «неправильное» падение — голова запрокинута
    if (fall) look.lerp(fall.side < 0 && !fall.hands ? V(0, -0.8, 0.6) : V(0, -0.3, fall.side), Math.min(1, fall.k)).normalize();
    const m = new THREE.Matrix4().lookAt(V(), look.clone().multiplyScalar(-1), spine);
    const headQ = new THREE.Quaternion().setFromRotationMatrix(m);

    // Руки: прижаты → расслаблены → машут
    const t = p.t || 0;
    const relaxedF = V(0.22, -0.38, 0.18), relaxedR = V(-0.12, -0.42, 0.14);
    const tuck = V(0, -0.48, 0.06);
    const flailF = V(0.2, 0.28 + Math.sin(t * 9) * 0.22, 0.12 + Math.cos(t * 7) * 0.15);
    const flailR = V(-0.2, 0.22 + Math.sin(t * 8 + 2) * 0.24, 0.1 + Math.cos(t * 6) * 0.15);
    const pick = (rel, fl) => p.arms < 0.5 ? tuck.clone().lerp(rel, p.arms * 2) : rel.clone().lerp(fl, (p.arms - 0.5) * 2);
    let hF = shF.clone().add(pick(relaxedF, flailF)), hR = shR.clone().add(pick(relaxedR, flailR));
    if (fall) {
      // Правильно: вперёд — локти согнуты, кулаки у груди (падаем на колени и предплечья); назад — руки скрещены на груди.
      // fall.hands — типичная ошибка: ловить себя прямыми руками (так ломают запястья), её показывает лекция о падениях.
      const k = Math.min(1, fall.k);
      const [dF, dR] = fall.hands ? [V(0.15, -0.3, 0.45 * fall.side), V(-0.15, -0.3, 0.45 * fall.side)]
        : fall.side > 0 ? [V(-0.08, -0.14, 0.24), V(0.08, -0.16, 0.22)] : [V(-0.14, -0.2, 0.15), V(0.14, -0.2, 0.15)];
      hF.lerp(shF.clone().add(dF), k); hR.lerp(shR.clone().add(dR), k);
    }
    const armPoleF = V(0.1, -0.6, -0.6), armPoleR = V(-0.1, -0.6, -0.6);
    const armF = solveIK(shF, hF, UARM, FARM, armPoleF);
    const armR = solveIK(shR, hR, UARM, FARM, armPoleR);

    this.model.pose({
      hipF, hipR, kneeF: legF.mid, kneeR: legR.mid, ankF: legF.end, ankR: legR.end,
      legPoleF: fdF.clone().add(V(0, 0.2, 0)), legPoleR: fdR.clone().add(V(0, 0.2, 0)), angF: aF, angR: aR,
      pelvis, pelvisUp: axis.clone().lerp(spine, 0.45).normalize(), side0, spine, shAxis,
      shF, shR, elF: armF.mid, elR: armR.mid, wrF: armF.end, wrR: armR.end, armPoleF, armPoleR, headC, headQ,
    });

    if (this.com.visible) {
      const c = pelvis.clone().addScaledVector(spine, 0.12);
      const foot = V(c.x, 0.04, c.z);
      this.comBall.position.copy(c);
      placeSeg(this.comLine, foot, c);
      this.comDot.position.copy(foot);
      this.comMid.position.set(0, 0.04, 0); // середина между креплениями — ориентир
      const w = p.weight;
      this.comMat.color.set(fall ? '#ef4444' : w < -0.2 ? '#ef4444' : w < 0.05 ? '#facc15' : '#22c55e');
    }
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
