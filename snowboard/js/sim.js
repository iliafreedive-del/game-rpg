// Упрощённая, но честная физика доски на наклонной плоскости.
// Координаты склона: u — поперёк (вправо, если смотреть вниз), s — вниз по линии падения.
// Курс θ: направление носа доски = (sin θ, cos θ); θ = 0 — нос смотрит строго вниз.
// Кант e ∈ [-1, 1] задаётся в «телесных» координатах: + носки, − пятки.

const G = 9.81;
export const MAX_EDGE_DEG = 45;
const SIDECUT_R = 8; // радиус бокового выреза типичной доски, м

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Sim {
  constructor() { this.reset({}); }

  reset({ slopeDeg = 12, u = 0, s = 0, theta = 0, stance = 'regular', speed = 0 } = {}) {
    this.slopeDeg = slopeDeg;
    this.alpha = slopeDeg * Math.PI / 180;
    this.toeSign = stance === 'goofy' ? -1 : 1;
    this.u = u; this.s = s; this.theta = theta;
    this.vu = Math.sin(theta) * speed; this.vs = Math.cos(theta) * speed;
    this.edge = 0; this.weight = 0; this.rot = 0; this.crouch = 0; this.stiff = 0;
    this.omega = 0; this.vLong = 0; this.vLat = 0; this.grip = 0; this.slip = 0;
    this.lean = 0; // наклон тела в повороте (рад), + в сторону носков
    this.fallen = null; this.time = 0; this.backSeatT = 0; this.overleanT = 0; this.tipT = 0;
    this.carveT = 0; this.turnT = 0; this.maxSpeed = 0; this.dist = 0;
    this.warnings = [];
    this.danger = 0; // 0..1 — насколько близко падение через нижний кант
  }

  get speed() { return Math.hypot(this.vu, this.vs); }
  get edgeDeg() { return this.edge * MAX_EDGE_DEG; }
  // Сторона, которая опущена в снег, относительно «справа от носа»: + справа.
  get sideDown() { return this.edge * this.toeSign; }

  fall(type, info = {}) {
    if (this.fallen) return;
    this.fallen = { type, t: this.time, speed: this.speed, edge: this.edge, weight: this.weight, ...info };
  }

  // input: { edge, weight, rot, crouch, stiff } — целевые значения
  step(dt, input) {
    if (this.fallen) {
      const k = Math.exp(-3 * dt);
      this.vu *= k; this.vs *= k;
      this.u += this.vu * dt; this.s += this.vs * dt;
      this.time += dt;
      return;
    }
    this.time += dt;
    // Тело не мгновенно: кант и вес меняются с конечной скоростью.
    this.edge += clamp(input.edge - this.edge, -3.2 * dt, 3.2 * dt);
    this.weight += clamp(input.weight - this.weight, -2.5 * dt, 2.5 * dt);
    this.rot += clamp(input.rot - this.rot, -3 * dt, 3 * dt);
    this.crouch += clamp((input.crouch ? 1 : 0) - this.crouch, -3 * dt, 3 * dt);
    this.stiff += clamp((input.stiff ? 1 : 0) - this.stiff, -4 * dt, 4 * dt);

    const a = this.alpha, ca = Math.cos(a), sa = Math.sin(a);
    const th = this.theta;
    const nx = Math.sin(th), ny = Math.cos(th);      // нос
    const rx = Math.cos(th), ry = -Math.sin(th);     // справа от носа
    let vL = this.vu * nx + this.vs * ny;
    let vT = this.vu * rx + this.vs * ry;
    const gL = G * sa * ny, gT = G * sa * ry;        // гравитация вдоль / поперёк доски
    const edgeDeg = Math.abs(this.edgeDeg);
    const sideDown = this.sideDown;
    const speed = Math.hypot(vL, vT);
    const stiffK = 1 - 0.4 * this.stiff;              // прямые ноги — хуже держат кант

    // --- Ловля нижнего канта ---------------------------------------------
    const leading = sideDown * vT > 0;               // опущен кант, в сторону которого едем боком
    const pullToDown = sideDown * gT > 0 && Math.abs(vT) < 0.3 && Math.abs(vL) < 1.2;
    const slipA = speed > 0.3 ? Math.abs(Math.atan2(vT, Math.abs(vL))) : 0;
    this.danger = 0;
    if (Math.abs(vT) > 0.4) {
      if (leading && edgeDeg > 2) this.danger = clamp(edgeDeg / 6, 0.5, 1);
      else if (edgeDeg < 6) this.danger = clamp((6 - edgeDeg) / 6, 0, 1) * clamp(Math.abs(vT) / 2.2, 0, 1);
    }
    const catchSpeed = 0.8 * stiffK;
    if (leading && edgeDeg > 3 && Math.abs(vT) > catchSpeed && slipA > 0.3 + 0.03 * speed) {
      return this.fall(this.edge > 0 ? 'catch_toe' : 'catch_heel', { vLat: vT });
    }
    if (edgeDeg < 1.5 && Math.abs(vT) > 2.2 * stiffK && slipA > 0.45) {
      // доска плоская, едем боком — любой бугорок цепляет нижний кант
      const caughtToe = vT * this.toeSign > 0; // нижний по ходу кант — носочный?
      return this.fall(caughtToe ? 'catch_toe' : 'catch_heel', { vLat: vT, flat: true });
    }
    if (pullToDown && edgeDeg > 14 && this.slopeDeg > 6) this.tipT += dt; else this.tipT = Math.max(0, this.tipT - 2 * dt);
    if (this.tipT > 0.35) return this.fall(this.edge > 0 ? 'tip_toe' : 'tip_heel');

    // --- Сцепление и карвинг ------------------------------------------------
    const slipAngle = slipA;
    this.slip = slipAngle;
    const grip = smooth(10, 30, edgeDeg) * clamp(Math.abs(vL) / 2.5, 0, 1) * smooth(0.6, 0.15, slipAngle) * stiffK * (leading && slipA > 0.3 ? 0 : 1);
    this.grip = grip;

    // --- Рыскание (поворот доски) ------------------------------------------
    const wf = clamp(1 + 0.8 * this.weight, 0.25, 1.6) * (this.weight < -0.35 ? 0.5 : 1);
    let omega = 0;
    const R = Math.max(4, SIDECUT_R * Math.cos(edgeDeg * Math.PI / 180));
    omega += Math.sign(sideDown) * grip * vL / R;                                // ведёт кант
    omega += sideDown * 2.4 * clamp(vL / 3, -1, 1) * wf * (1 - grip);              // подруливание кантом
    omega += this.rot * 1.3 * wf * (1 - 0.7 * grip);                               // поворот корпусом
    const sliding = clamp(Math.abs(vT) / 0.8, 0, 1) + (edgeDeg < 18 ? 0.25 : 0);
    omega += -1.8 * this.weight * Math.sin(th) * clamp(sliding, 0, 1) * (1 - grip); // «падающий лист»
    this.omega = omega;
    this.theta = wrapAngle(th + omega * dt);

    // --- Силы ---------------------------------------------------------------
    vL += gL * dt;
    const glide = (0.055 * G * ca + 0.0045 * speed * speed) * dt;
    vL = Math.abs(vL) <= glide ? 0 : vL - Math.sign(vL) * glide;

    vT += gT * dt;
    let latFric;
    if (leading && slipA > 0.3) latFric = 0.05 * G * ca;
    else {
      const mu = 0.04 + 0.9 * Math.pow(clamp(edgeDeg / 35, 0, 1), 1.3);
      latFric = mu * G * ca + (0.4 + 2.2 * clamp(edgeDeg / 15, 0, 1)) * Math.abs(vT) + grip * 40 * Math.abs(vT);
    }
    const dT = latFric * dt;
    vT = Math.abs(vT) <= dT ? 0 : vT - Math.sign(vT) * dT;

    // пересобрать скорость в новой системе доски (кант «тащит» скорость за собой при карвинге)
    const th2 = this.theta;
    const nx2 = Math.sin(th2), ny2 = Math.cos(th2), rx2 = Math.cos(th2), ry2 = -Math.sin(th2);
    const keep = grip; // доля скорости, которую кант разворачивает вместе с доской
    const vu0 = nx * vL + rx * vT, vs0 = ny * vL + ry * vT;
    const vu1 = nx2 * vL + rx2 * vT, vs1 = ny2 * vL + ry2 * vT;
    this.vu = vu0 + (vu1 - vu0) * keep;
    this.vs = vs0 + (vs1 - vs0) * keep;
    this.vLong = vL; this.vLat = vT;

    this.u += this.vu * dt; this.s += this.vs * dt;
    const sp = this.speed;
    this.dist += sp * dt;
    this.maxSpeed = Math.max(this.maxSpeed, sp);

    // наклон тела: центростремительное ускорение / g
    const maxLean = edgeDeg * Math.PI / 180 + 0.2; // тело не может «лечь» сильнее, чем стоит кант
    const targetLean = clamp(Math.atan2(omega * vL * this.toeSign, G), -maxLean, maxLean);
    this.lean += (targetLean - this.lean) * clamp(6 * dt, 0, 1);

    if (Math.abs(omega) > 0.35 && sp > 2) {
      this.turnT += dt;
      if (grip > 0.6) this.carveT += dt;
    }

    // --- Прочие падения -----------------------------------------------------
    if (this.weight < -0.6 && sp > 7) this.backSeatT += dt; else this.backSeatT = Math.max(0, this.backSeatT - dt);
    if (this.backSeatT > 1.0) return this.fall('back_seat');
    if (edgeDeg > 38 && sp < 0.8) this.overleanT += dt; else this.overleanT = 0;
    if (this.overleanT > 1.2) return this.fall(this.edge > 0 ? 'overlean_toe' : 'overlean_heel');

    this.updateWarnings(input);
  }

  updateWarnings(input) {
    const w = [];
    const sp = this.speed;
    if (this.danger > 0.45) w.push('edge_danger');
    if (this.tipT > 0.05) w.push('tip_danger');
    if (this.weight < -0.3 && (Math.abs(this.omega) > 0.25 || sp > 5)) w.push('weight_back');
    if (this.stiff > 0.5 && sp > 2) w.push('stiff');
    if (this.rot * this.sideDown < -0.15 && Math.abs(this.edge) > 0.2 && sp > 2) w.push('counter_rot');
    if (this.crouch > 0.5 && this.weight < 0 && sp > 3) w.push('sit');
    this.warnings = w;
  }
}

// Преобразование ввода «влево/вправо на экране» в кант в теле.
// При спуске носом вниз и камере сзади у regular носки справа, у goofy — слева.
export function screenToEdge(lr, toeSign) { return lr * toeSign; }
