// CO2/O2-таблицы: расчёт от личного рекорда, редактор, таймер с голосом/звуком/вибрацией, позывы, история.
import * as S from './store.js';
import { beep, speak, vibrate } from './sfx.js';

export const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const r5 = (x) => Math.max(5, Math.round(x / 5) * 5);

// CO2: задержка постоянная (~50% рекорда), отдых убывает от 2:00 на 15 с
export function co2Table(pb, rounds = 8) {
  const hold = r5(pb * 0.5);
  return Array.from({ length: rounds }, (_, i) => ({ rest: Math.max(15, 120 - i * 15), hold }));
}
// O2: отдых постоянный 2:00, задержка растёт от ~40% до ~80% рекорда
export function o2Table(pb, rounds = 8) {
  return Array.from({ length: rounds }, (_, i) => ({ rest: 120, hold: r5(pb * (0.4 + (0.4 * i) / (rounds - 1))) }));
}
// Спокойная «пирамида» для новичка: короткие задержки, длинный отдых
export function easyTable(pb) {
  const k = [0.3, 0.4, 0.5, 0.55, 0.5, 0.4];
  return k.map((x) => ({ rest: 120, hold: r5(pb * x) }));
}
export const KINDS = {
  co2: { title: 'CO₂-таблица', sub: 'Задержка одна и та же, отдых всё короче. Учит терпеть высокий CO₂ и позывы.', make: co2Table },
  o2: { title: 'O₂-таблица', sub: 'Отдых одинаковый, задержка всё длиннее. Учит организм работать при низком кислороде.', make: o2Table },
  easy: { title: 'Мягкая пирамида', sub: 'Для первых недель: короткие задержки и полный отдых.', make: easyTable },
};
export const total = (rows) => rows.reduce((a, r) => a + r.rest + r.hold, 0);

// ---------------------------------------------------------------- таймер
export class TableTimer {
  constructor(rows, { title = 'Таблица', onTick, onDone } = {}) {
    this.rows = rows; this.title = title; this.onTick = onTick; this.onDone = onDone;
    this.phases = [];
    rows.forEach((r, i) => { this.phases.push({ type: 'breathe', dur: r.rest, round: i }); this.phases.push({ type: 'hold', dur: r.hold, round: i }); });
    this.i = 0; this.left = this.phases[0].dur; this.paused = true; this.contr = []; this.finished = false;
    this._lastWhole = Math.ceil(this.left);
    this.started = false;
  }
  get phase() { return this.phases[this.i]; }
  start() { this.paused = false; if (!this.started) { this.started = true; this._announce(); } }
  pause() { this.paused = !this.paused; }
  contraction() {
    const p = this.phase; if (!p || p.type !== 'hold') return;
    const at = p.dur - this.left;
    if (!this.contr[p.round]) this.contr[p.round] = Math.round(at);
    vibrate(30);
  }
  stop(early = true) {
    if (this.finished) return;
    this.finished = true; this.paused = true;
    const doneRounds = this.phases.slice(0, this.i).filter((p) => p.type === 'hold').length;
    S.addHistory('table', this.title, { rounds: doneRounds, of: this.rows.length, maxHold: Math.max(...this.rows.map((r) => r.hold)), contr: this.contr, early });
    S.markDay();
    this.onDone && this.onDone({ rounds: doneRounds, early });
  }
  _announce() {
    const p = this.phase;
    const st = S.load();
    if (p.type === 'hold') { if (st.sound) beep(880, 0.25); if (st.voice) speak('Задержка'); vibrate([80, 60, 80]); }
    else { if (st.sound) beep(520, 0.25); if (st.voice) speak(p.round === 0 && this.i === 0 ? 'Дышим спокойно' : 'Дыши'); vibrate(120); }
  }
  update(dt) {
    if (this.paused || this.finished) return;
    this.left -= dt;
    const whole = Math.ceil(this.left);
    if (whole !== this._lastWhole) {
      this._lastWhole = whole;
      const st = S.load();
      if (whole === 10 && this.phase.dur > 20) { if (st.sound) beep(660, 0.08); if (st.voice) speak('десять секунд'); }
      if (whole <= 3 && whole >= 1) { if (st.sound) beep(700, 0.06); vibrate(20); }
    }
    if (this.left <= 0) {
      this.i++;
      if (this.i >= this.phases.length) { if (S.load().sound) beep(990, 0.5); if (S.load().voice) speak('Таблица завершена. Отличная работа'); this.stop(false); return; }
      this.left = this.phase.dur; this._lastWhole = Math.ceil(this.left);
      this._announce();
    }
    this.onTick && this.onTick(this);
  }
}
