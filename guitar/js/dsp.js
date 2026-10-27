// Обработка звука без DOM: БПФ, высота тона (YIN через БПФ), слежение за нотой, атаки, спектр.
// Модуль чистый, его же гоняют тесты в Node на записях настоящей гитары (через имитацию
// микрофона ноутбука и телефона), поэтому здесь нет ничего, что зависит от браузера.

export const freqToMidi = (f, a4 = 440) => 69 + 12 * Math.log2(f / a4);
export const midiToFreq = (m, a4 = 440) => a4 * 2 ** ((m - 69) / 12);

// ---- БПФ: на месте, длина — степень двойки ----
const twiddles = new Map();
function tw(n) {
  if (!twiddles.has(n)) {
    const c = new Float64Array(n / 2), s = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) { c[i] = Math.cos(2 * Math.PI * i / n); s[i] = -Math.sin(2 * Math.PI * i / n); }
    twiddles.set(n, [c, s]);
  }
  return twiddles.get(n);
}
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  const [C, S] = tw(n), sg = inverse ? -1 : 1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const wr = C[k * step], wi = sg * S[k * step];
        const a = i + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
const pow2 = n => 2 ** Math.ceil(Math.log2(n));

// ---- YIN: нормированная разностная функция, считается через БПФ за доли миллисекунды ----
export class Yin {
  constructor(sr, { fmin = 60, fmax = 1100, W = 2048 } = {}) {
    this.sr = sr; this.W = W;
    this.minT = Math.max(2, Math.floor(sr / fmax));
    this.maxT = Math.ceil(sr / fmin);
    this.N = W + this.maxT + 2;
    this.L = pow2(this.N);
    this.re = new Float64Array(this.L); this.im = new Float64Array(this.L);
    this.pre = new Float64Array(this.N + 1);
    this.d = new Float64Array(this.maxT + 2);
    this.rms = 0;
  }
  // x — последние сэмплы (длиной не меньше this.N); заполняет this.d, возвращает громкость
  analyze(x) {
    const { N, W, L, re, im, pre, d, maxT } = this, off = x.length - N;
    re.fill(0); im.fill(0);
    pre[0] = 0;
    for (let i = 0; i < N; i++) { const v = x[off + i]; pre[i + 1] = pre[i] + v * v; if (i < W) re[i] = v; im[i] = v; }
    // корреляция окна a (re) со всем буфером b (im) одним комплексным БПФ
    fft(re, im);
    for (let k = 0; k <= L / 2; k++) {
      const j = (L - k) & (L - 1);
      const ar = (re[k] + re[j]) / 2, ai = (im[k] - im[j]) / 2; // спектр a
      const br = (im[k] + im[j]) / 2, bi = (re[j] - re[k]) / 2; // спектр b
      const pr = ar * br + ai * bi, pi = ar * bi - ai * br;      // conj(A)·B
      re[k] = pr; im[k] = pi;
      if (j !== k) { re[j] = pr; im[j] = -pi; }
    }
    fft(re, im, true);
    const e0 = pre[W];
    this.rms = Math.sqrt(e0 / W);
    d[0] = 1;
    let run = 0;
    for (let t = 1; t <= maxT + 1; t++) {
      const v = Math.max(0, e0 + (pre[t + W] - pre[t]) - 2 * re[t]);
      run += v;
      d[t] = run > 0 ? (v * t) / run : 1;
    }
    return this.rms;
  }
  localMin(lo, hi) {
    const d = this.d; let best = -1;
    lo = Math.max(this.minT, Math.floor(lo)); hi = Math.min(this.maxT, Math.ceil(hi));
    for (let t = lo; t <= hi; t++) if (best < 0 || d[t] < d[best]) best = t;
    return best;
  }
  // Захват ноты: первый провал, почти такой же глубокий, как самый глубокий.
  // Обычный YIN берёт первый провал ниже порога и на затухании низких струн
  // «прыгает» на октаву вверх, когда вторая гармоника становится громче основной.
  acquire(maxD = 0.3) {
    const { d, minT, maxT } = this;
    let gmin = Infinity;
    for (let t = minT; t <= maxT; t++) if (d[t] < gmin) gmin = d[t];
    if (gmin > maxD) return -1;
    const accept = Math.min(maxD, Math.max(0.1, gmin * 1.6 + 0.04));
    for (let t = minT; t <= maxT; t++) {
      if (d[t] < accept && d[t] <= d[t - 1] && d[t] <= d[t + 1]) {
        while (t + 1 <= maxT && d[t + 1] < d[t]) t++;
        // провал на двойном периоде заметно глубже — значит, это октавная ошибка
        if (2 * t <= maxT) {
          const t2 = this.localMin(t * 1.94, t * 2.06);
          if (t2 > 0 && d[t2] < d[t] * 0.45 && d[t] > 0.02) return t2;
        }
        return t;
      }
    }
    return -1;
  }
  // Ведение ноты: ищем провал только рядом с прошлым периодом (± cents)
  near(tau, cents = 120) {
    const k = 2 ** (cents / 1200);
    return this.localMin(tau / k, tau * k);
  }
  refine(t) {
    const d = this.d, a = d[t - 1], b = d[t], c = d[t + 1], den = a + c - 2 * b;
    const sh = den > 0 ? Math.max(-1, Math.min(1, (a - c) / (2 * den))) : 0;
    return { tau: t + sh, freq: this.sr / (t + sh), d: b };
  }
}

// ---- Атаки (удары по струнам): энергия «верхов» против медленного фона ----
export class OnsetDetector {
  constructor(sr, { hop = 256, sens = 1 } = {}) {
    this.sr = sr; this.hop = hop; this.sens = sens;
    this.prev = 0; this.acc = 0; this.n = 0; this.slow = 1e-7; this.fast = 0; this.lastOnset = -1; this.peak = 0;
    this.sampleIndex = 0; this.level = 0;
  }
  // отдаёт массив индексов сэмплов, где началась атака
  push(x) {
    const out = [];
    for (let i = 0; i < x.length; i++) {
      const v = x[i], dlt = v - this.prev; this.prev = v;
      this.acc += dlt * dlt; this.n++;
      if (this.n === this.hop) {
        const e = this.acc / this.hop;
        const idx = this.sampleIndex + i - this.hop + 1;
        const thr = Math.max(2e-7 / this.sens, (this.slow * 2.6) / this.sens);
        const gap = (idx - this.lastOnset) / this.sr;
        // новая атака: резкий рост над фоном и над прошлыми мгновениями, не в хвосте предыдущей
        if (e > thr && e > this.fast * 1.7 && (this.lastOnset < 0 || gap > 0.07)) { out.push(idx); this.lastOnset = idx; this.peak = e; }
        this.fast = Math.max(e, this.fast * 0.6);
        this.slow = this.slow * 0.97 + e * 0.03;
        this.level = Math.max(e, this.level * 0.85);
        this.acc = 0; this.n = 0;
      }
    }
    this.sampleIndex += x.length;
    return out;
  }
}

// ---- Слежение за нотой ----
// Выдаёт устойчивую ноту: захватывает её после удара (когда октава однозначна)
// и дальше ведёт её период, не давая прыгать на октаву на затухании.
// Новички не глушат струны: прошлые ноты звенят поверх новой. Их мы вычитаем
// гребенчатым фильтром (он убирает ноту вместе со всеми гармониками) и ищем новую ноту в остатке.
const ratioIs = (q, k) => Math.abs(q - k) < 0.03 * k;
const centsBetween = (t1, t2) => Math.abs(1200 * Math.log2(t1 / t2));
// y[n] = x[n] − x[n − tau], выровнено по концу буфера
function combInto(src, srcLen, dst, dstLen, tau) {
  const k = Math.floor(tau), fr = tau - k, off = srcLen - dstLen;
  for (let i = 0; i < dstLen; i++) { const n = off + i; dst[i] = src[n] - (src[n - k] * (1 - fr) + src[n - k - 1] * fr); }
}
export class PitchTracker {
  constructor(sr, { fmin = 60, fmax = 1100, W = 2048, minRms = 0.0006, hop = 960 } = {}) {
    this.sr = sr; this.minRms = minRms;
    this.yin = new Yin(sr, { fmin, fmax, W }); this.yc = new Yin(sr, { fmin, fmax, W });
    this.attackFrames = Math.ceil(0.06 * sr / hop); // окно анализа ещё захватывает атаку
    this.probFrames = Math.ceil(0.3 * sr / hop);
    this.quietFrames = Math.ceil(0.15 * sr / hop); // столько после удара не ищем следующий по громкости
    this.ringFrames = Math.ceil(4 * sr / hop);
    this.maxRing = 3; this.frame = 0; this.ringing = []; this.bufs = null;
    this.lock = null; this.cand = null; this.lost = 0; this.attackLeft = 0; this.rival = null; this.fix = null;
  }
  // сколько последних сэмплов нужно на вход
  get size() { return this.yin.N + this.maxRing * (this.yin.maxT + 2); }
  // новый удар: прежнюю ноту запоминаем как «звенящую», захватываем новую, когда пройдёт атака
  onset() {
    this.attackId = (this.attackId || 0) + 1; this.rmsHist = []; this.sinceOnset = 0;
    if (this.lock) this.ring(this.lock);
    this.release(); this.attackLeft = this.attackFrames;
  }
  // запомнить ноту как звенящую (d — насколько чисто она звучала, нужно чтобы узнать повторный удар)
  ring(L) {
    this.ringing = [{ tau: L.tau, d: L.dGood ?? L.d ?? 0.1, frame: this.frame }, ...this.ringing.filter(e => centsBetween(e.tau, L.tau) > 50)].slice(0, this.maxRing);
  }
  release() { this.lock = null; this.cand = null; this.rival = null; this.fix = null; }
  setLock(r, cancel) {
    this.lock = { tau: r.tau, d: r.d, dGood: r.d <= 0.15 ? r.d : undefined, age: 0, cancel };
    this.ringing = this.ringing.filter(e => centsBetween(e.tau, r.tau) > 50);
    this.cand = null; this.rival = null; this.fix = null; this.lost = 0;
  }
  // разностная функция по сигналу без звенящих нот
  cancelled(x, taus) {
    const n = x.length;
    if (!this.bufs || this.bufs[0].length < n) this.bufs = [new Float32Array(n), new Float32Array(n)];
    let src = x, len = n, k = 0;
    for (const tau of taus) {
      const dst = this.bufs[k++ % 2], dlen = len - Math.ceil(tau) - 1;
      combInto(src, len, dst, dlen, tau); src = dst; len = dlen;
    }
    this.yc.analyze(src.subarray(0, len));
    return this.yc;
  }
  process(x) {
    const res = this.step(x);
    res.attackId = this.attackId || 0;
    return res;
  }
  step(x) {
    this.frame++;
    const y = this.yin, rms = y.analyze(x);
    const h = this.rmsHist || (this.rmsHist = []), r2 = h.length ? Math.min(...h) : rms;
    h.push(rms); if (h.length > 3) h.shift();
    this.sinceOnset = (this.sinceOnset ?? 99) + 1;
    // громкость резко выросла (за 40–60 мс) — тоже удар, если датчик атак его пропустил
    if (this.sinceOnset > this.quietFrames && rms > r2 * 1.5 && rms > this.minRms * 4) { this.onset(); this.rmsHist.push(rms); }
    this.ringing = this.ringing.filter(e => this.frame - e.frame < this.ringFrames);
    if (rms < this.minRms) { this.lost++; if (this.lost > 6) { this.release(); this.ringing = []; } return { rms, freq: 0 }; }
    if (this.attackLeft > 0) { this.attackLeft--; return { rms, freq: 0, attack: true }; }
    if (this.lock) return this.follow(x, rms);
    // кандидат по исходному сигналу; если он совпал со звенящей нотой — ищем в остатке
    const ta = y.acquire(0.3);
    let pick = ta > 0 ? y.refine(ta) : null, cancel = null;
    const ringOf = r => this.ringing.find(e => centsBetween(e.tau, r.tau) < 50), isRinging = r => !!ringOf(r);
    // звенящая нота звучит так же чисто, как до удара, — значит, по этой струне ударили ещё раз
    // (если бы поверх неё зазвучала другая нота, её периодичность заметно испортилась бы)
    const pr = pick && ringOf(pick), repluck = pr && pick.d < Math.max(0.04, pr.d * 1.5);
    // период «ноты» кратен периоду звенящей — скорее всего, это общий период смеси двух нот
    // (до4 и ми4 вместе повторяются с частотой до2), а не настоящая низкая нота
    const sub = pick && !pr && this.ringing.some(e => { const q = pick.tau / e.tau; return q > 1.5 && ratioIs(q, Math.round(q)); });
    if (this.ringing.length && !repluck && (!pick || pr || sub || pick.d > 0.12)) {
      const taus = this.ringing.map(e => e.tau), yc = this.cancelled(x, taus), tc = yc.acquire(0.2);
      const rc = tc > 0 ? yc.refine(tc) : null;
      // фильтр съел почти всё — это та же нота, что звенела
      if (rc && !isRinging(rc) && rc.d < 0.15 && yc.rms > rms * 0.35 && (!pick || pr || sub || rc.d < pick.d)) { pick = rc; cancel = taus; }
    }
    if (!pick) { this.cand = null; return { rms, freq: 0 }; }
    // нота захвачена, когда три кадра подряд совпали по высоте (первые кадры после удара обманчивы)
    if (this.cand && !!this.cand.cancel === !!cancel && centsBetween(this.cand.tau, pick.tau) < 40) {
      this.cand.tau = pick.tau;
      if (++this.cand.n >= 3) { this.setLock(pick, cancel); return { rms, freq: pick.freq, d: pick.d, locked: true, fresh: true }; }
    } else this.cand = { tau: pick.tau, n: 1, cancel };
    return { rms, freq: 0, pending: pick.freq };
  }
  follow(x, rms) {
    const L = this.lock, y = L.cancel ? this.cancelled(x, L.cancel) : this.yin;
    L.age++;
    const t = y.near(L.tau), r = t > 0 ? y.refine(t) : null;
    const g = y.acquire(0.3), rg = g > 0 ? y.refine(g) : null;
    if (rg) {
      const ratio = rg.tau / L.tau, q = ratio >= 1 ? ratio : 1 / ratio;
      const harmonic = Math.abs(q - Math.round(q)) < 0.03 * q;
      // первые 0.3 с после захвата исправляем октаву: настоящий период заметно глубже
      if (L.age <= this.probFrames && harmonic && Math.round(q) > 1 && rg.d < 0.1 &&
          (ratioIs(ratio, 2) ? rg.d < (r ? r.d : 1) * 0.5 : rg.d < (r ? r.d : 1) * 0.8)) {
        this.fix = this.fix && ratioIs(this.fix.tau / rg.tau, 1) ? { tau: rg.tau, n: this.fix.n + 1 } : { tau: rg.tau, n: 1 };
        if (this.fix.n >= 2) { const age = L.age; this.setLock(rg, L.cancel); this.lock.age = age; return { rms, freq: rg.freq, d: rg.d, locked: true, fresh: true }; }
      } else this.fix = null;
      // другая нота уверенно перекрыла прежнюю (атаку пропустили) — переключаемся
      const semis = Math.abs(12 * Math.log2(ratio));
      // (прежняя нота при этом обычно ещё звенит — запоминаем её и ищем новую заново, уже без неё)
      if (semis > 1.2 && !harmonic && rg.d < 0.12 && rg.d < (r ? r.d : 1) * 0.5) {
        this.rival = this.rival && ratioIs(this.rival.tau / rg.tau, 1) ? { tau: rg.tau, n: this.rival.n + 1 } : { tau: rg.tau, n: 1 };
        if (this.rival.n >= 3) { this.attackId = (this.attackId || 0) + 1; this.ring(L); this.release(); return { rms, freq: 0 }; }
      } else this.rival = null;
    }
    if (r && r.d < 0.4) {
      L.tau = r.tau; L.d = r.d; if (r.d <= 0.15) L.dGood = r.d; this.lost = 0; L.peak = Math.max(L.peak || 0, rms);
      L.weakN = r.d > 0.15 ? (L.weakN || 0) + 1 : 0;
      if (L.weakN > 4 && !L.cancel) {
        // долго мутно, а рядом звенят прошлые ноты — пробуем найти ноту заново, уже без них
        if (this.ringing.length) { this.release(); return { rms, freq: 0 }; }
        // или поверх неё тихо сыграли другую (удар не заметили): вычитаем её и смотрим, что осталось
        // (только пока нота ещё громкая: на тихом хвосте остаток — это гул корпуса и соседние струны)
        if (L.weakN % 3 === 2 && rms > L.peak * 0.1) {
          const yc = this.cancelled(x, [L.tau]), tc = yc.acquire(0.2), rc = tc > 0 ? yc.refine(tc) : null;
          if (rc && rc.d < 0.12 && centsBetween(rc.tau, L.tau) > 50 && yc.rms > rms * 0.25) {
            this.ring(L); this.release(); return { rms, freq: 0 };
          }
        }
      }
      // слабая периодичность (шум, биения на затухании) — ноту держим, но цифрам не верим
      return { rms, freq: r.freq, d: r.d, locked: true, weak: r.d > 0.15 };
    }
    if (++this.lost > 4) {
      // звук громкий, а прежней ноты нет: сыграли другую, прежняя может ещё звенеть
      if (rms > this.minRms * 3) this.ring(L);
      this.release();
    }
    return { rms, freq: 0 };
  }
}

// ---- Сглаживание показаний тюнера: фильтр «1 евро» (мало дрожит в покое, быстро догоняет поворот колка) ----
export class OneEuro {
  constructor({ minCutoff = 1.2, beta = 0.02, dCutoff = 1 } = {}) { Object.assign(this, { minCutoff, beta, dCutoff }); this.x = null; this.dx = 0; }
  reset() { this.x = null; this.dx = 0; }
  filter(v, dt) {
    if (this.x == null) { this.x = v; return v; }
    const a = c => 1 / (1 + 1 / (2 * Math.PI * c * dt));
    const dv = (v - this.x) / dt;
    this.dx += a(this.dCutoff) * (dv - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += a(cutoff) * (v - this.x);
    return this.x;
  }
}

// ---- Логика тюнера: какая струна, сколько центов, когда «в строю» ----
// strings — MIDI открытых струн с 6-й по 1-ю. Отдаёт состояние, которое экран просто рисует.
export class TunerLogic {
  constructor({ strings = [40, 45, 50, 55, 59, 64], a4 = 440, inTune = 5, holdFor = 0.45 } = {}) {
    Object.assign(this, { strings, a4, inTuneC: inTune, holdFor });
    this.manual = null; this.string = null; this.cents = null; this.state = 'idle';
    this.win = []; this.euro = new OneEuro({ minCutoff: 1.5, beta: 0.03 }); this.sinceLive = 99; this.goodFor = 0;
    this.tuned = new Set(); this.justTuned = null; this.flip = 0; this.attack = -1;
  }
  setManual(s) { this.manual = s; this.reset(); }
  reset() { this.win = []; this.euro.reset(); this.goodFor = 0; }
  // какая струна звучит: ближайшая по высоте; звук ровно на октаву выше открытой струны —
  // это её вторая гармоника (так бывает на затухании толстых струн)
  pick(m) {
    const idx = s => 6 - s, st = this.strings;
    if (this.manual) {
      const t = st[idx(this.manual)];
      return { s: this.manual, m: Math.abs(m - 12 - t) < 0.7 && Math.abs(m - t) > 6 ? m - 12 : m };
    }
    let best = null, bd = 99;
    for (let s = 1; s <= 6; s++) { const d = Math.abs(m - st[idx(s)]); if (d < bd) { bd = d; best = s; } }
    if (bd <= 2.6) return { s: best, m };
    for (let s = 6; s >= 1; s--) if (Math.abs(m - 12 - st[idx(s)]) < 0.7) return { s, m: m - 12 };
    return null;
  }
  // res — ответ PitchTracker.process, dt — секунды с прошлого кадра
  update(res, dt) {
    this.justTuned = null;
    const p = res && res.freq > 0 && !res.weak ? this.pick(freqToMidi(res.freq, this.a4)) : null;
    // струна «сменилась» без нового удара — это затухающий хвост или гул корпуса, а не другая струна
    if (p && this.string != null && p.s !== this.string && this.state !== 'idle' && res.attackId === this.attack) {
      this.flip += dt;
      if (this.flip < 0.6) return this.silent(dt);
    }
    this.flip = 0;
    if (!p) return this.silent(dt);
    this.attack = res.attackId;
    if (p.s !== this.string || res.fresh) { this.reset(); this.string = p.s; }
    this.sinceLive = 0; this.state = 'live';
    const raw = (p.m - this.strings[6 - p.s]) * 100;
    this.win.push(raw); if (this.win.length > 5) this.win.shift();
    const med = [...this.win].sort((a, b) => a - b)[this.win.length >> 1];
    this.cents = this.euro.filter(med, Math.max(dt, 0.005));
    if (Math.abs(this.cents) <= this.inTuneC) {
      this.goodFor += dt;
      if (this.goodFor >= this.holdFor && !this.tuned.has(p.s)) { this.tuned.add(p.s); this.justTuned = p.s; }
    } else this.goodFor = 0;
    return this;
  }
  silent(dt) {
    this.sinceLive += dt;
    if (this.state === 'live' && this.sinceLive > 0.3) this.state = 'hold';
    if (this.state === 'hold' && this.sinceLive > 5) { this.state = 'idle'; this.cents = null; }
    this.goodFor = 0;
    return this;
  }
  get inTune() { return this.cents != null && Math.abs(this.cents) <= this.inTuneC; }
}

// ---- Проверка «сыграйте ноту»: ждёт свежую ноту и сравнивает с целью ----
// update() отдаёт {type:'hit'|'wrong', midi, cents, detuned} не чаще одного раза на ноту.
// Новая нота — это новый удар или другая высота; та же нота подряд засчитывается только после нового удара.
export class NoteMatcher {
  constructor({ a4 = 440, tol = 0.45, wrongAfter = 5 } = {}) {
    Object.assign(this, { a4, tol, wrongAfter });
    this.target = null; this.noteId = 0; this.usedId = -1; this.reported = -1; this.cur = null; this.attack = 0; this.since = 0;
  }
  setTarget(midi) { this.target = midi; this.since = this.attack; }
  update(res) {
    if (res) this.attack = res.attackId || 0;
    if (!res || !(res.freq > 0) || res.weak) return null;
    const m = freqToMidi(res.freq, this.a4), r = Math.round(m);
    const c = this.cur;
    if (!c || res.attackId !== c.attack || Math.abs(m - c.m) > 0.6) this.cur = { m, r, attack: res.attackId, n: 0, id: ++this.noteId };
    const cur = this.cur; cur.n++; cur.m = m; cur.r = r;
    const t = this.target;
    if (t == null || cur.id === this.usedId) return null;
    // ноту иногда слышно на октаву выше или ниже (гармоники, соседние звенящие струны) — засчитываем
    const dm = [0, 12, -12].map(k => m - k - t).find(v => Math.abs(v) <= 0.75) ?? null;
    if (dm != null && cur.n >= 2) {
      this.usedId = cur.id;
      return { type: 'hit', midi: r, cents: Math.round(dm * 100), detuned: Math.abs(dm) > this.tol };
    }
    // об ошибке говорим, только если струну дёрнули уже после того, как попросили ноту
    // (ноты, которые просто ещё звенят, не в счёт)
    if (dm == null && cur.n >= this.wrongAfter && this.reported !== cur.id && cur.attack > this.since) {
      this.reported = cur.id;
      return { type: 'wrong', midi: r, cents: Math.round((m - r) * 100) };
    }
    return null;
  }
  // нота, которую только что засчитали, ещё звучит: о ней не сообщаем как об ошибке
  get busy() { return this.cur && this.cur.id === this.usedId; }
}

// ---- Спектр (окно Ханна) ----
const hanns = new Map();
function hannWin(n) {
  if (!hanns.has(n)) { const w = new Float64Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); hanns.set(n, w); }
  return hanns.get(n);
}
export class Spectrum {
  constructor(sr, n = 8192) {
    this.sr = sr; this.n = n; this.bin = sr / n;
    this.re = new Float64Array(n); this.im = new Float64Array(n); this.mag = new Float64Array(n / 2);
  }
  compute(x) {
    const { n, re, im, mag } = this, w = hannWin(n), off = x.length - n;
    for (let i = 0; i < n; i++) { re[i] = x[off + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < n / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    return mag;
  }
  // амплитуда пика около частоты f (± tol доля)
  peak(f, tol = 0.025) {
    const { mag, bin } = this;
    const lo = Math.max(1, Math.floor(f * (1 - tol) / bin)), hi = Math.min(mag.length - 2, Math.ceil(f * (1 + tol) / bin));
    let m = 0; for (let k = lo; k <= hi; k++) if (mag[k] > m) m = mag[k];
    return m;
  }
  // «вес» ноты: сумма её первых гармоник
  salience(f, H = 8) {
    let s = 0;
    for (let h = 1; h <= H && h * f < this.sr / 2 - 100; h++) s += this.peak(h * f, 0.02) / Math.sqrt(h);
    return s;
  }
  // хромаграмма по пикам спектра 70…2000 Гц; гармоники, дающие «чужие» ноты, ослаблены
  chroma(a4 = 440) {
    const { mag, bin } = this, c = new Float64Array(12);
    const lo = Math.floor(70 / bin), hi = Math.ceil(2000 / bin);
    let max = 0; for (let k = lo; k < hi; k++) if (mag[k] > max) max = mag[k];
    if (!max) return { c, max: 0 };
    const peaks = [];
    for (let k = lo + 1; k < hi; k++) {
      const v = mag[k];
      if (v < max * 0.02 || v <= mag[k - 1] || v < mag[k + 1]) continue;
      const a = Math.log(mag[k - 1] + 1e-12), b = Math.log(v), cc = Math.log(mag[k + 1] + 1e-12), den = a + cc - 2 * b;
      peaks.push({ f: (k + (den ? (a - cc) / (2 * den) : 0)) * bin, a: v });
    }
    for (const p of peaks) {
      const m = freqToMidi(p.f, a4), r = Math.round(m);
      if (Math.abs(m - r) > 0.35) continue;
      const harmonic = peaks.some(q => q !== p && q.a > p.a * 0.3 && [3, 5, 6, 7].some(k => Math.abs(p.f / q.f - k) < k * 0.02));
      c[((r % 12) + 12) % 12] += Math.sqrt(p.a) * (harmonic ? 0.2 : 1);
    }
    let sum = 0; for (let k = 0; k < 12; k++) sum += c[k];
    if (sum > 0) for (let k = 0; k < 12; k++) c[k] /= sum;
    return { c, max };
  }
}

// ---- Проверка аккорда по спектру удара ----
// strings — MIDI струн с 6-й по 1-ю (null — эту струну не играют). Спектр sp уже посчитан.
// Струна «под вопросом», если её основной тон совпадает с обертоном более низкой струны:
// по спектру её не отличить, такие струны проверяет режим «по одной струне».
export function judgeChord(sp, strings, a4 = 440) {
  const { c, max } = sp.chroma(a4), { mag, bin } = sp;
  const voiced = strings.map((m, i) => (m == null ? null : { m, i, f: midiToFreq(m, a4) })).filter(Boolean);
  const pcs = [...new Set(voiced.map(o => ((o.m % 12) + 12) % 12))];
  let inChord = 0; for (const pc of pcs) inChord += c[pc];
  let top = 0; for (let k = Math.floor(70 / bin); k < 1000 / bin; k++) if (mag[k] > top) top = mag[k];
  const level = strings.map(m => {
    if (m == null) return null;
    const f = midiToFreq(m, a4);
    if (f < 100 || voiced.some(l => l.m < m && [2, 3, 4, 5, 6].some(k => Math.abs(f / l.f - k) < 0.03 * k))) return null;
    return top ? sp.peak(f, 0.02) / top : 0;
  });
  const quiet = level.map((v, i) => v != null && v < 0.03);
  // глухая тонкая струна — ошибка; тихий бас — только подсказка (его часто задевают слабее)
  const dead = quiet.map((q, i) => q && midiToFreq(strings[i], a4) >= 180);
  const missing = pcs.filter(pc => c[pc] < 0.04);
  let foreign = null, fv = 0.12;
  for (let pc = 0; pc < 12; pc++) if (!pcs.includes(pc) && c[pc] > fv) { fv = c[pc]; foreign = pc; }
  const ok = max > 0 && inChord >= 0.7 && !missing.length && foreign == null && !dead.some(Boolean);
  return { ok, c, inChord, missing, foreign, dead, quiet, pcs };
}
