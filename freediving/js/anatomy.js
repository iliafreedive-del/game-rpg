// Анатомия в разрезе (сагиттальный срез, лицо вправо): нос и носоглотка, мягкое нёбо, язык как поршень,
// голосовая щель, трахея, лёгкие, рёбра, диафрагма, живот, сердце, ухо с евстахиевой трубой.
// Воздух показан частицами, которые текут по дыхательным путям. Каждый режим — сценарий с подписями.
import { clamp, lerp, smooth } from './kit.js';

const W = 640, H = 780;
const C = {
  skin: '#f1c7ad', skinEdge: '#c98d70', cavity: '#ffe1d6', air: '#e0f7ff', airDot: '#57c7ff',
  lung: '#f7a6b0', lungEdge: '#d4687a', bone: '#f4efe2', boneEdge: '#c9bfa5', muscle: '#d0545e', muscleL: '#e98088',
  heart: '#c22c3c', organ: '#e9b38f', organEdge: '#c88b66', text: '#0f172a', label: '#334155', water: '#2a9fd6',
  tongue: '#e0707f', tongueEdge: '#b54b5b', cord: '#ffffff',
};

// ---------------------------------------------------------------- сценарии
// state: lung(объём 0..1), dia(диафрагма сокращена 0..1), belly(-1..1), ribs(0..1), glottis(0 откр..1 закр),
// velum(0..1 поднято), tongue{tip, back, piston}, pinch, ear(-1 вдавлена..0..1), eust(0..1 открыта),
// flow{path, rate}, hr, o2, co2, depth, spasm
function base() {
  return { lung: 0.5, dia: 0.3, belly: 0, ribs: 0.2, glottis: 0, velum: 0, tongue: { tip: 0, back: 0, piston: 0 }, pinch: 0, ear: 0, eust: 0, flow: { path: 'main', rate: 0 }, hr: 68, o2: 0.98, co2: 0.4, depth: 0, spasm: 0, warn: null, hold: false };
}
const ph = (t, a, b) => smooth(a, b, t);

export const MODES = {
  breathe: {
    title: 'Спокойная раздышка животом', dur: 12, loop: true,
    steps: [[0, 'Вдох носом 4 секунды. Диафрагма сокращается и опускается, живот мягко выходит вперёд. Плечи и грудь неподвижны.'], [4, 'Выдох 8 секунд, медленно, через губы или нос. Диафрагма расслабляется и поднимается куполом, живот уходит внутрь. Выдох вдвое длиннее вдоха успокаивает пульс.']],
    state(t) {
      const s = base();
      const inh = t < 4 ? smooth(0, 4, t) : 1 - smooth(4, 12, t);
      s.lung = 0.35 + 0.35 * inh; s.dia = 0.15 + 0.8 * inh; s.belly = -0.1 + 1.0 * inh; s.ribs = 0.15 + 0.15 * inh;
      s.flow = { path: 'main', rate: t < 4 ? 1 : -0.5 };
      s.hr = 66 - 6 * (t > 4 ? smooth(4, 12, t) : 0); s.co2 = 0.42; s.o2 = 0.98;
      return s;
    },
  },
  full: {
    title: 'Финальный вдох: живот → рёбра → грудь', dur: 13, loop: true,
    steps: [[0, 'Полный выдох без усилия.'], [2, '1. Живот: диафрагма опускается, воздух заполняет низ лёгких.'], [5, '2. Рёбра: межрёберные мышцы раздвигают грудную клетку в стороны.'], [7.5, '3. Грудь: последний воздух в верхушки лёгких. Без рывка и без запрокидывания головы.'], [9, 'Голосовая щель закрывается — воздух заперт. Плечи опущены, лицо и шея расслаблены. Только теперь — уход под воду.']],
    state(t) {
      const s = base();
      const ex = 1 - smooth(0, 2, t);
      const a = ph(t, 2, 5), b = ph(t, 5, 7.5), c = ph(t, 7.5, 9);
      const relax = smooth(11.5, 13, t);
      s.dia = lerp(0.05 + 0.25 * ex, 1, a) * (1 - relax) + 0.3 * relax;
      s.belly = lerp(-0.4 + 0.4 * ex, 0.9, a) - 0.25 * c;
      s.ribs = lerp(0.05, 1, b) * (1 - relax) + 0.2 * relax;
      s.lung = (0.18 + 0.45 * a + 0.27 * b + 0.1 * c) * (1 - relax) + 0.45 * relax;
      s.glottis = t > 9 && t < 11.5 ? 1 : 0;
      s.flow = { path: 'main', rate: t < 2 ? -0.6 : t < 9 ? 1 : t > 11.5 ? -0.6 : 0 };
      s.hold = s.glottis > 0;
      return s;
    },
  },
  hyper: {
    title: 'Ошибка: гипервентиляция', dur: 10, loop: true,
    steps: [[0, 'Частое глубокое дыхание «впрок» не добавляет кислорода — кровь и так насыщена на 97–99%. Зато оно вымывает CO₂.'], [4, 'CO₂ — это сигнал «пора дышать». Когда его мало, позывы приходят слишком поздно, а кислород уже на исходе.'], [7, 'Итог: потеря сознания без предупреждения, чаще всего у самой поверхности. Раздышка должна быть спокойной.']],
    state(t) {
      const s = base();
      const w = Math.sin(t * Math.PI * 2 / 1.6);
      s.lung = 0.5 + 0.35 * w; s.dia = 0.5 + 0.45 * w; s.belly = 0.3 + 0.5 * w; s.ribs = 0.5 + 0.4 * w;
      s.flow = { path: 'main', rate: w > 0 ? 2 : -2 };
      s.co2 = lerp(0.4, 0.08, smooth(0, 7, t)); s.o2 = 0.99; s.hr = 92;
      s.warn = t > 4 ? 'CO₂ низкий — тревожный сигнал отключён' : null;
      return s;
    },
  },
  frenzel: {
    title: 'Продувка Френзеля: язык — поршень', dur: 12, loop: true,
    steps: [[0, 'Нос зажат, голосовая щель закрыта — воздух из лёгких не участвует. Мягкое нёбо опущено: рот, глотка и носоглотка — одна камера.'], [2.5, 'Кончик языка упирается в зубы. Корень языка поднимается вверх и назад, как поршень — сжимает воздух в глотке.'], [5, 'Давление в носоглотке растёт, евстахиевы трубы открываются, воздух идёт в среднее ухо. Барабанная перепонка возвращается на место.'], [8, 'Маленькое движение, малый объём воздуха. Работает на любой глубине, потому что не зависит от сжатия лёгких.']],
    state(t) {
      const s = base();
      s.pinch = 1; s.glottis = 1; s.velum = 0; s.lung = 0.6; s.dia = 0.6; s.belly = 0.3; s.ribs = 0.5;
      const cyc = (t % 3) / 3, push = smooth(0.15, 0.45, cyc) * (1 - smooth(0.6, 0.9, cyc));
      s.tongue = { tip: 1, back: 0.35 + 0.4 * push, piston: push };
      const eq = t > 2.5 ? 1 : 0;
      s.ear = -0.8 + (eq ? 0.8 * smooth(0, 1, Math.min(1, (t - 2.5) / 2.5)) : 0) - (t < 2.5 ? 0 : 0);
      s.eust = push * eq;
      s.flow = { path: 'frenzel', rate: push > 0.2 ? 1.2 : 0 };
      s.depth = 6; s.hold = true;
      return s;
    },
  },
  valsalva: {
    title: 'Вальсальва — почему не подходит фридайверу', dur: 10, loop: true,
    steps: [[0, 'Вальсальва: нос зажат, голосовая щель открыта, давят мышцы груди и живота — воздух из лёгких выталкивается вверх.'], [4, 'Под водой лёгкие сжимаются: на 20 м у них уже треть объёма. Давить становится нечем, а напряжение груди и живота тратит кислород.'], [7.5, 'Сильное натуживание опасно для ушей и сердца. Учитесь Френзелю на суше с первого занятия.']],
    state(t) {
      const s = base();
      s.pinch = 1; s.glottis = 0;
      const push = smooth(0.5, 2, t % 5) * (1 - smooth(3.5, 4.5, t % 5));
      s.belly = 0.2 - 0.8 * push; s.ribs = 0.4 - 0.3 * push; s.dia = 0.6 - 0.3 * push; s.lung = 0.6 - 0.12 * push;
      s.flow = { path: 'valsalva', rate: push > 0.3 ? 1.5 : 0 };
      s.ear = -0.6 + 0.7 * push; s.eust = push;
      s.hr = 70 + 25 * push; s.warn = push > 0.5 ? 'Давление в груди растёт' : null; s.depth = 3;
      return s;
    },
  },
  descent: {
    title: 'Погружение: лёгкие сжимаются, уши требуют продувки', dur: 20, loop: true,
    steps: [[0, 'На поверхности давление 1 атмосфера. Лёгкие полны.'], [3, 'Каждые 10 метров давление растёт на 1 атм. На 10 м объём воздуха вдвое меньше (закон Бойля).'], [7, 'Вода давит на барабанную перепонку. Продувайте каждые 1–2 метра, заранее, не дожидаясь боли.'], [12, 'Рефлекс ныряния: пульс замедляется, сосуды рук и ног сужаются, кровь идёт к сердцу, лёгким и мозгу.'], [16, 'На 30 м — четверть исходного объёма. Диафрагма поднимается, грудь сжимается. Поэтому продувка — только Френзелем.']],
    state(t) {
      const s = base();
      const d = 30 * smooth(1, 18, t);
      s.depth = d;
      const V = 1 / (1 + d / 10);
      s.lung = 0.95 * V; s.dia = lerp(0.9, 0.0, 1 - V); s.belly = lerp(0.5, -0.4, 1 - V); s.ribs = lerp(0.9, 0.0, 1 - V);
      s.glottis = 1; s.pinch = 1; s.hold = true;
      // продувка каждые ~1.5 м: между продувками перепонка вдавливается
      const step = (d % 1.6) / 1.6;
      s.ear = -0.9 * step + 0.05;
      const push = 1 - smooth(0, 0.15, step);
      s.tongue = { tip: 1, back: 0.4 + 0.4 * push, piston: push };
      s.eust = push; s.flow = { path: 'frenzel', rate: push > 0.3 ? 1 : 0 };
      s.hr = lerp(70, 44, smooth(4, 16, t)); s.o2 = lerp(0.98, 0.9, t / 20); s.co2 = lerp(0.45, 0.6, t / 20);
      return s;
    },
  },
  contractions: {
    title: 'Позывы (сокращения диафрагмы)', dur: 12, loop: true,
    steps: [[0, 'Через минуту-две задержки CO₂ в крови растёт, и диафрагма начинает непроизвольно вздрагивать.'], [4, 'Это нормальная реакция, а не нехватка кислорода. Кислорода в этот момент ещё достаточно.'], [8, 'Не сопротивляйтесь: расслабьте живот, отпустите плечи, дайте волне пройти. Рост числа позывов — знак готовиться к выходу.']],
    state(t) {
      const s = base();
      s.glottis = 1; s.hold = true; s.lung = 0.75; s.ribs = 0.6; s.belly = 0.4;
      const sp = Math.max(0, Math.sin(t * 2.2)) ** 8;
      s.spasm = sp; s.dia = 0.7 + 0.25 * sp; s.belly = 0.4 - 0.6 * sp;
      s.co2 = lerp(0.65, 0.9, t / 12); s.o2 = lerp(0.9, 0.82, t / 12); s.hr = 58;
      return s;
    },
  },
  recovery: {
    title: 'Восстановительное дыхание после всплытия', dur: 12, loop: true,
    steps: [[0, '1. Короткий пассивный выдох — только часть воздуха, не до конца.'], [1.2, '2. Быстрый глубокий вдох.'], [2.4, '3. Задержать на 1–2 секунды с лёгким давлением: голосовая щель закрыта, живот и грудь чуть напряжены. Давление гонит кислород в кровь.'], [4.5, 'Повторить 3–5 раз. Затем знак «ОК» и слова «я в порядке». Страхующий смотрит ещё 30 секунд.']],
    state(t) {
      const s = base();
      const c = t % 4, k = Math.floor(t / 4);
      const ex = c < 0.8 ? smooth(0, 0.8, c) : 0;
      const inh = c >= 0.8 && c < 1.8 ? smooth(0.8, 1.8, c) : c >= 1.8 ? 1 : 0;
      const hold = c >= 1.8 && c < 3.6;
      s.lung = 0.55 - 0.2 * ex + 0.4 * inh * (c >= 0.8 ? 1 : 0);
      if (c < 0.8) s.lung = 0.7 - 0.25 * ex;
      s.dia = 0.3 + 0.65 * inh; s.belly = hold ? 0.55 : 0.1 + 0.6 * inh; s.ribs = 0.3 + 0.6 * inh;
      s.glottis = hold ? 1 : 0;
      s.flow = { path: 'main', rate: c < 0.8 ? -2 : c < 1.8 ? 2.2 : c > 3.6 ? -0.8 : 0 };
      s.o2 = lerp(0.72, 0.96, smooth(0, 12, t)); s.co2 = lerp(0.85, 0.55, smooth(0, 12, t)); s.hr = lerp(95, 78, t / 12);
      s.warn = hold ? 'Давление 1–2 с' : null;
      return s;
    },
  },
  reflex: {
    title: 'Рефлекс ныряния', dur: 12, loop: true,
    steps: [[0, 'Лицо касается прохладной воды — срабатывают рецепторы вокруг глаз и носа.'], [3, 'Брадикардия: сердце бьётся реже, экономит кислород.'], [6, 'Сужение сосудов рук и ног: кровь собирается в центре — сердце, мозг, лёгкие.'], [9, 'Селезёнка сокращается и выбрасывает запас красных кровяных клеток. Рефлекс тренируется: чем чаще ныряете, тем он сильнее.']],
    state(t) {
      const s = base();
      s.glottis = 1; s.hold = true; s.lung = 0.8; s.ribs = 0.7; s.belly = 0.5; s.dia = 0.8;
      s.hr = lerp(72, 46, smooth(1, 8, t)); s.depth = 2;
      s.vaso = smooth(5, 8, t); s.spleen = smooth(8.5, 10, t);
      return s;
    },
  },
  tongue: {
    title: 'Язык и нёбо: что где', dur: 12, loop: true,
    steps: [[0, 'Нейтрально: язык лежит, мягкое нёбо опущено, воздух свободно идёт носом.'], [3, 'Кончик языка к зубам — «замок» спереди.'], [6, 'Корень языка поднят к мягкому нёбу — рот отделён от глотки (замок «К»). Так держат воздух во рту.'], [9, 'Поршень: корень языка вверх-назад при закрытой голосовой щели — давление в носоглотке, продувка.']],
    state(t) {
      const s = base();
      s.lung = 0.6; s.dia = 0.5; s.belly = 0.2; s.ribs = 0.4;
      const a = smooth(3, 4, t), b = smooth(6, 7, t), c = smooth(9, 10, t);
      const pist = c * (0.5 + 0.5 * Math.sin(t * 5));
      s.tongue = { tip: a, back: b * 0.9, piston: pist };
      s.glottis = b; s.velum = 0; s.pinch = c;
      s.flow = { path: t < 3 ? 'main' : 'frenzel', rate: t < 3 ? 0.6 * Math.sin(t * 2) : c > 0.5 && pist > 0.6 ? 1 : 0 };
      s.eust = c * pist; s.ear = -0.3 * (1 - c);
      return s;
    },
  },
};

// ---------------------------------------------------------------- геометрия пути
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function polyAt(pts, u) {
  const L = polyLen(pts) * clamp(u, 0, 1);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + l >= L) { const k = (L - acc) / (l || 1); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; }
    acc += l;
  }
  return pts[pts.length - 1];
}
const PATHS = {
  main: [[432, 206], [400, 190], [355, 188], [326, 196], [320, 240], [324, 300], [334, 330], [335, 372], [335, 440], [335, 462]],
  frenzel: [[328, 262], [324, 230], [326, 200], [312, 188], [296, 178], [282, 168]],
  valsalva: [[335, 470], [335, 372], [334, 330], [324, 300], [320, 240], [326, 200], [312, 188], [296, 178], [282, 168]],
};

export class Anatomy {
  constructor(canvas, { onCaption } = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.onCaption = onCaption;
    this.mode = null; this.t = 0; this.s = base();
    this.parts = [];
    this.lastStep = -1;
    this.labels = true;
    this.alv = []; // «пузырьки воздуха» в лёгких
    for (let i = 0; i < 160; i++) this.alv.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
    this.guts = [];
    for (let i = 0; i < 26; i++) this.guts.push([Math.random(), Math.random(), 10 + Math.random() * 9]);
    this.speed = 1;
  }
  setMode(name) {
    this.mode = MODES[name] ? name : 'breathe';
    this.t = 0; this.lastStep = -1; this.parts = [];
    return MODES[this.mode];
  }
  get def() { return MODES[this.mode]; }
  update(dt) {
    if (!this.mode) return;
    const m = this.def;
    this.t += dt * this.speed;
    if (this.t > m.dur) { if (m.loop) { this.t = 0; this.lastStep = -1; } else this.t = m.dur; }
    this.s = m.state(this.t);
    let k = 0; for (let i = 0; i < m.steps.length; i++) if (this.t >= m.steps[i][0]) k = i;
    if (k !== this.lastStep) { this.lastStep = k; this.onCaption && this.onCaption(m.steps[k][1], k, m.steps.length, m.title); }
    // частицы воздуха
    const f = this.s.flow;
    if (f && f.rate) {
      const n = Math.abs(f.rate) * dt * 40;
      for (let i = 0; i < n; i++) if (Math.random() < n - i) this.parts.push({ path: f.path, u: f.rate > 0 ? Math.random() * 0.08 : 1 - Math.random() * 0.08, v: f.rate, o: (Math.random() - 0.5) * 8 });
    }
    for (const p of this.parts) p.u += p.v * dt * 0.45;
    this.parts = this.parts.filter((p) => p.u >= 0 && p.u <= 1 && (p.path === f.path || p.u < 1));
    if (this.parts.length > 300) this.parts.splice(0, this.parts.length - 300);
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.max(10, r.width * dpr); this.cv.height = Math.max(10, r.height * dpr);
  }

  draw() {
    const c = this.ctx, cv = this.cv, s = this.s;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    // фон: вода, если глубина > 0
    const g = c.createLinearGradient(0, 0, 0, cv.height);
    if (s.depth > 0.5) { const d = clamp(s.depth / 30, 0, 1); g.addColorStop(0, `rgba(40,150,200,${0.25 + 0.3 * d})`); g.addColorStop(1, `rgba(10,50,90,${0.35 + 0.4 * d})`); }
    else { g.addColorStop(0, '#eef7fb'); g.addColorStop(1, '#dcebf2'); }
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    // вписать фигуру
    const k = Math.min(cv.width / W, cv.height / H);
    c.setTransform(k, 0, 0, k, (cv.width - W * k) / 2, (cv.height - H * k) / 2);
    this._body(c, s);
    this._gauges(c, s);
  }

  _body(c, s) {
    const bel = s.belly, rib = s.ribs;
    const chestOut = rib * 12, bellyOut = bel * 26;
    // ------------------------------------------------ силуэт
    const front = [[300, 36], [360, 52], [396, 92], [406, 140], [412, 160], [442, 196], [424, 206], [428, 222], [424, 232], [428, 238], [420, 248], [416, 272], [372, 292], [356, 312], [350, 360], [366, 392], [410 + chestOut * 0.6, 430], [430 + chestOut, 500], [428 + chestOut * 0.6 + bellyOut * 0.2, 575], [424 + bellyOut * 0.8, 640], [430 + bellyOut, 700], [400 + bellyOut * 0.3, 762]];
    const back = [[210, 762], [226, 722], [236, 642], [216, 520], [224, 412], [254, 332], [248, 262], [224, 200], [214, 112], [244, 58]];
    c.beginPath(); c.moveTo(...front[0]);
    smoothPath(c, front.concat(back).concat([front[0]]));
    c.closePath();
    c.fillStyle = C.skin; c.fill(); c.lineWidth = 3; c.strokeStyle = C.skinEdge; c.stroke();
    // ------------------------------------------------ череп и мозг (контур)
    c.save(); c.globalAlpha = 0.35;
    c.beginPath(); c.ellipse(300, 118, 78, 72, -0.15, 0, Math.PI * 2); c.fillStyle = '#f5dccd'; c.fill(); c.restore();
    // лобная пазуха
    blob(c, 388, 118, 10, 7, C.air, '#9bb9c8');
    // ------------------------------------------------ позвоночник из мелких позвонков
    const spineP = [[270, 250], [272, 330], [258, 420], [252, 520], [262, 620], [256, 720]];
    for (let i = 0; i <= 26; i++) {
      const [x, y] = polyAt(spineP, i / 26);
      c.save(); c.translate(x, y);
      c.fillStyle = C.bone; c.strokeStyle = C.boneEdge; c.lineWidth = 1.5;
      roundRect(c, -12, -7, 22, 14, 4); c.fill(); c.stroke();
      c.fillStyle = '#e2d6bb'; roundRect(c, -24, -4, 12, 8, 3); c.fill();
      c.restore();
    }
    // ------------------------------------------------ рёбра (поднимаются «ручкой ведра»)
    for (let i = 0; i < 9; i++) {
      const y0 = 405 + i * 22, x0 = 250 + i * 0.5;
      const lift = rib * (8 + i * 0.6);
      const x1 = 402 + chestOut * (0.7 + i * 0.04) - i * 2, y1 = y0 + 46 - lift - i * 1.5;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + 40 - lift * 0.6, x1, y1);
      c.strokeStyle = 'rgba(201,191,165,.9)'; c.lineWidth = 6; c.stroke();
      c.strokeStyle = 'rgba(244,239,226,.95)'; c.lineWidth = 3.5; c.stroke();
      // межрёберные мышцы — тонкие штрихи
      if (i < 8) { c.strokeStyle = 'rgba(208,84,94,.35)'; c.lineWidth = 1; for (let j = 0; j < 5; j++) { const u = 0.2 + j * 0.15; c.beginPath(); c.moveTo(lerp(x0, x1, u), lerp(y0, y1, u) + 18 * Math.sin(u * Math.PI) * 0.9 + 4); c.lineTo(lerp(x0, x1, u + 0.04), lerp(y0, y1, u + 0.04) + 18 * Math.sin(u * Math.PI) * 0.9 + 16); c.stroke(); } }
    }
    // грудина
    c.beginPath(); c.moveTo(372, 398); c.lineTo(398 + chestOut * 0.8, 478); c.lineTo(404 + chestOut * 0.8, 560 - rib * 6);
    c.strokeStyle = C.boneEdge; c.lineWidth = 7; c.stroke(); c.strokeStyle = C.bone; c.lineWidth = 4.5; c.stroke();
    // ------------------------------------------------ диафрагма и органы живота
    const domeY = 540 + 62 * s.dia + 10 * s.spasm; // вершина купола
    const domeC = 2 * domeY - 307; // контрольная точка кривой
    const dFront = [410 + chestOut * 0.6, 598], dBack = [244, 632];
    // кишечник: петли из маленьких кругов, сдвигаются вниз и вперёд, когда диафрагма опускается
    c.save();
    c.beginPath(); c.moveTo(dBack[0], dBack[1]); c.quadraticCurveTo(330, domeC, dFront[0], dFront[1]);
    c.lineTo(424 + bellyOut * 0.8, 640); c.lineTo(428 + bellyOut, 700); c.lineTo(400 + bellyOut * 0.3, 758); c.lineTo(226, 758); c.lineTo(238, 642); c.closePath(); c.clip();
    for (const [u, v, r] of this.guts) {
      const x = lerp(262, 412 + bellyOut * 0.9, u), y = lerp(domeY + 40, 748, v) + s.dia * 12;
      blob(c, x, y, r, r * 0.8, C.organ, C.organEdge);
    }
    // желудок и печень
    blob(c, 380 + bellyOut * 0.3, domeY + 42, 34, 22, '#efb7a0', C.organEdge);
    blob(c, 300, domeY + 34, 48, 24, '#b8565e', '#8f3b43');
    if (s.spleen) { c.globalAlpha = s.spleen; for (let i = 0; i < 8; i++) blob(c, 268 + i * 6, domeY + 60 - i * 4, 3, 3, '#e01f35', '#a3101f'); c.globalAlpha = 1; }
    c.restore();
    // диафрагма — мышца-купол
    c.beginPath(); c.moveTo(dBack[0], dBack[1]); c.quadraticCurveTo(330, domeC, dFront[0], dFront[1]);
    c.lineWidth = 11; c.strokeStyle = C.muscle; c.stroke();
    c.lineWidth = 4; c.strokeStyle = C.muscleL; c.stroke();
    if (s.spasm > 0.2) { c.save(); c.globalAlpha = s.spasm; c.strokeStyle = '#ff2a4a'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(330, domeY + 2, 18 + i * 12, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } c.restore(); }
    // ------------------------------------------------ лёгкие
    const V = clamp(s.lung, 0.05, 1);
    const hil = [335, 470];
    const lungPts = [];
    const top = 398 + (1 - V) * 20;
    const outline = [[328, top], [355, top + 10], [390 + chestOut * 0.7, 440], [408 + chestOut * 0.9, 510], [dFront[0] - 10, dFront[1] - 10], [330, domeY - 10], [dBack[0] + 14, dBack[1] - 12], [240, 540], [244, 450], [278, top + 8]];
    const shrink = 0.62 + 0.38 * Math.cbrt(V);
    for (const [x, y] of outline) lungPts.push([hil[0] + (x - hil[0]) * shrink, hil[1] + (y - hil[1]) * shrink + (y > 560 ? (domeY - 610) * 0.2 : 0)]);
    c.beginPath(); c.moveTo(...lungPts[0]); smoothPath(c, lungPts.concat([lungPts[0]])); c.closePath();
    const lg = c.createRadialGradient(330, 500, 10, 330, 500, 140);
    lg.addColorStop(0, '#fbd0d5'); lg.addColorStop(1, C.lung);
    c.fillStyle = lg; c.fill(); c.lineWidth = 2.5; c.strokeStyle = C.lungEdge; c.stroke();
    // воздух в альвеолах — мелкие пузырьки; их число и размер растут с объёмом
    c.save(); c.clip();
    for (const [u, v, r] of this.alv) {
      const x = lerp(230, 420, u), y = lerp(top, domeY, v);
      const rr = r * (1.5 + 3.2 * V);
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2);
      c.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * V})`; c.fill();
      c.strokeStyle = 'rgba(212,104,122,.35)'; c.lineWidth = 0.8; c.stroke();
    }
    c.restore();
    // бронхиальное дерево
    c.strokeStyle = '#f3e9e3'; c.lineCap = 'round';
    const br = (x, y, a, l, w, d) => { if (d > 4) return; const x2 = x + Math.cos(a) * l * shrink, y2 = y + Math.sin(a) * l * shrink; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); br(x2, y2, a - 0.45, l * 0.72, w * 0.7, d + 1); br(x2, y2, a + 0.45, l * 0.72, w * 0.7, d + 1); };
    br(335, 455, Math.PI / 2 - 0.6, 38, 7, 0); br(335, 455, Math.PI / 2 + 0.6, 38, 7, 0);
    // ------------------------------------------------ сердце
    const beat = 1 + 0.07 * Math.max(0, Math.sin(this.t * Math.PI * 2 * s.hr / 60)) ** 4;
    c.save(); c.translate(372 + chestOut * 0.5, 530); c.scale(beat, beat); c.rotate(-0.4);
    c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(22, -40, 44, -14, 0, 28); c.bezierCurveTo(-44, -14, -22, -40, 0, -26);
    c.fillStyle = C.heart; c.fill(); c.lineWidth = 2; c.strokeStyle = '#8c1626'; c.stroke(); c.restore();
    // ------------------------------------------------ голова: полости
    // носовая полость
    c.beginPath(); smoothPoly(c, [[430, 204], [404, 172], [356, 166], [326, 178], [318, 200], [340, 212], [408, 214]]);
    c.fillStyle = C.air; c.fill(); c.strokeStyle = '#9bb9c8'; c.lineWidth = 2; c.stroke();
    // раковины носа — три тонких завитка
    c.strokeStyle = '#e8b3a0'; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(394 - i * 6, 178 + i * 10); c.quadraticCurveTo(366, 172 + i * 10, 346, 184 + i * 9); c.stroke(); }
    // глотка (задняя стенка) и гортаноглотка
    c.beginPath(); smoothPoly(c, [[326, 180], [312, 200], [310, 262], [314, 322], [322, 340], [346, 340], [348, 318], [338, 296], [330, 250], [338, 214]]);
    c.fillStyle = C.air; c.fill(); c.strokeStyle = '#9bb9c8'; c.lineWidth = 2; c.stroke();
    // ротовая полость
    c.beginPath(); smoothPoly(c, [[410, 216], [348, 216], [334, 250], [340, 290], [380, 284], [412, 250]]);
    c.fillStyle = C.cavity; c.fill();
    // твёрдое нёбо (кость)
    c.beginPath(); c.moveTo(412, 214); c.lineTo(348, 214); c.lineWidth = 6; c.strokeStyle = C.boneEdge; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = C.bone; c.stroke();
    // зубы
    c.fillStyle = '#fffdf6'; c.strokeStyle = '#cfc6b0'; c.lineWidth = 1;
    roundRect(c, 409, 214, 9, 14, 3); c.fill(); c.stroke(); roundRect(c, 407, 232, 9, 13, 3); c.fill(); c.stroke();
    // мягкое нёбо (язычок): поднимается и закрывает носоглотку
    const vu = s.velum;
    c.beginPath(); c.moveTo(350, 214); c.quadraticCurveTo(lerp(332, 326, vu), lerp(226, 206, vu), lerp(330, 314, vu), lerp(250, 206, vu));
    c.lineWidth = 9; c.strokeStyle = C.muscleL; c.lineCap = 'round'; c.stroke();
    // язык: кончик, спинка, корень-поршень
    const T = s.tongue || { tip: 0, back: 0, piston: 0 };
    const tipX = 404 - 2 * T.tip, tipY = 242 - 12 * T.tip;
    const backX = 344 - 10 * T.piston, backY = 254 - 26 * T.back - 10 * T.piston;
    const rootX = 334 - 8 * T.piston, rootY = 292 - 10 * T.piston;
    c.beginPath(); c.moveTo(tipX, tipY);
    c.bezierCurveTo(398, 228 - 6 * T.back, 368, 222 - 4 * T.back - 2 * T.piston, backX + 10, backY);
    c.bezierCurveTo(backX - 6, backY + 10, rootX - 4, rootY - 18, rootX, rootY);
    c.bezierCurveTo(342, 304, 368, 300, 382, 286);
    c.bezierCurveTo(398, 272, 410, 256, tipX, tipY);
    c.fillStyle = C.tongue; c.fill(); c.lineWidth = 2.5; c.strokeStyle = C.tongueEdge; c.stroke();
    // мышечные волокна языка — штрихи
    c.strokeStyle = 'rgba(181,75,91,.45)'; c.lineWidth = 1;
    for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(352 + i * 7, 292 - i * 2); c.lineTo(360 + i * 6 - 12 * T.piston, 240 - i * 1 - 10 * T.back); c.stroke(); }
    if (T.piston > 0.15) arrow(c, 352, 268, 340, 238, `rgba(255,255,255,${T.piston})`, 3);
    // надгортанник
    c.beginPath(); c.moveTo(338, 300); c.quadraticCurveTo(330, 304, 326, 318); c.lineWidth = 5; c.strokeStyle = '#f2b0a0'; c.stroke();
    // гортань и голосовая щель (связки сходятся)
    const gap = 9 * (1 - s.glottis);
    c.fillStyle = '#f6c6b8'; roundRect(c, 318, 326, 34, 30, 8); c.fill();
    c.fillStyle = C.air; c.fillRect(335 - gap, 330, gap * 2, 24);
    c.fillStyle = C.cord; c.strokeStyle = '#d8a090'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(320, 330); c.lineTo(335 - gap, 342); c.lineTo(320, 354); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(350, 330); c.lineTo(335 + gap, 342); c.lineTo(350, 354); c.closePath(); c.fill(); c.stroke();
    // трахея с кольцами хрящей
    c.fillStyle = C.air; c.fillRect(325, 356, 20, 100);
    for (let y = 358; y < 452; y += 7) { c.beginPath(); c.ellipse(335, y, 11, 3, 0, 0, Math.PI * 2); c.strokeStyle = '#c9bfa5'; c.lineWidth = 2; c.stroke(); }
    // пищевод (за трахеей)
    c.fillStyle = 'rgba(226,150,130,.45)'; c.fillRect(301, 352, 12, 50);
    // ------------------------------------------------ ухо: вынесено в лупу
    this._ear(c, s);
    // зажим носа пальцами
    if (s.pinch > 0.05) {
      c.save(); c.globalAlpha = s.pinch;
      blob(c, 446, 186, 16, 9, '#e9b494', '#b9805f'); blob(c, 446, 210, 16, 9, '#e9b494', '#b9805f');
      c.restore();
    }
    // ------------------------------------------------ частицы воздуха
    for (const p of this.parts) {
      const pts = PATHS[p.path]; if (!pts) continue;
      const [x, y] = polyAt(pts, p.u);
      c.beginPath(); c.arc(x + p.o * 0.6, y + p.o * 0.3, 3.2, 0, Math.PI * 2);
      c.fillStyle = C.airDot; c.fill();
    }
    // ------------------------------------------------ сужение сосудов (рефлекс ныряния)
    if (s.vaso) {
      c.save(); c.globalAlpha = s.vaso;
      for (const [x1, y1, x2, y2] of [[470, 470, 410, 500], [470, 640, 420, 620], [180, 470, 240, 500], [180, 660, 240, 630]]) arrow(c, x1, y1, x2, y2, '#d3263a', 4);
      c.restore();
    }
    // ------------------------------------------------ подписи
    if (this.labels) {
      c.font = '600 15px system-ui, sans-serif'; c.fillStyle = C.label;
      const L = (t, x, y, tx, ty) => { c.strokeStyle = 'rgba(51,65,85,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke(); c.fillText(t, tx + (tx > x ? 4 : -c.measureText(t).width - 4), ty + 5); };
      L('носоглотка', 322, 190, 470, 150);
      L('мягкое нёбо', 336, 232, 470, 262);
      L('язык', 372, 262, 470, 300);
      L('голосовая щель', 340, 342, 470, 344);
      L('трахея', 345, 400, 470, 390);
      L('лёгкое', 300, 500, 150, 520);
      L('сердце', 380, 530, 470, 540);
      L('диафрагма', 300, domeY + 2, 150, 600);
      L('рёбра', 258, 450, 150, 440);
      L('позвоночник', 262, 680, 150, 690);
    }
  }

  _ear(c, s) {
    const cx = 92, cy = 196, r = 74;
    // связь лупы с носоглоткой: евстахиева труба
    c.save();
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(51,65,85,.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cx + r * 0.7, cy + r * 0.7); c.lineTo(318, 196); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = '#fff7f2'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#94a3b8'; c.stroke();
    c.clip();
    // слуховой проход слева с водой
    c.fillStyle = s.depth > 0.5 ? 'rgba(42,159,214,.55)' : C.air;
    c.fillRect(cx - r, cy - 12, r - 6, 24);
    // перепонка: выгнута внутрь при давлении воды
    const bulge = s.ear * 16;
    c.beginPath(); c.moveTo(cx - 6, cy - 26); c.quadraticCurveTo(cx - 6 - bulge, cy, cx - 6, cy + 26);
    c.lineWidth = 4; c.strokeStyle = Math.abs(s.ear) > 0.5 ? '#e0453f' : '#c98d70'; c.stroke();
    // среднее ухо — воздух; косточки
    c.beginPath(); c.ellipse(cx + 22, cy, 24, 30, 0, 0, Math.PI * 2); c.fillStyle = C.air; c.fill(); c.strokeStyle = '#9bb9c8'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = '#c9bfa5'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 4 - bulge * 0.5, cy); c.lineTo(cx + 14, cy - 10); c.lineTo(cx + 26, cy + 2); c.lineTo(cx + 36, cy - 6); c.stroke();
    // евстахиева труба вниз-вправо
    const op = s.eust;
    c.beginPath(); c.moveTo(cx + 30, cy + 24); c.quadraticCurveTo(cx + 50, cy + 52, cx + 70, cy + 64);
    c.lineWidth = 6 + 6 * op; c.strokeStyle = op > 0.2 ? '#7fd3ff' : '#e8c3b2'; c.stroke();
    if (op > 0.2) for (let i = 0; i < 4; i++) { const u = ((this.t * 1.5 + i / 4) % 1); c.beginPath(); c.arc(lerp(cx + 70, cx + 32, u), lerp(cy + 64, cy + 26, u), 3, 0, Math.PI * 2); c.fillStyle = C.airDot; c.fill(); }
    // давление воды
    if (s.depth > 0.5) for (let i = 0; i < 3; i++) arrow(c, cx - r + 6, cy - 8 + i * 8, cx - 22, cy - 8 + i * 8, 'rgba(14,90,140,.8)', 2);
    c.restore();
    c.font = '600 13px system-ui, sans-serif'; c.fillStyle = C.label;
    c.fillText('ухо (увеличено)', cx - 48, cy + r + 18);
    c.fillText('перепонка', cx - 36, cy - r + 22);
  }

  _gauges(c, s) {
    const x = 492, y = 600;
    c.font = '700 14px system-ui, sans-serif'; c.fillStyle = C.text;
    const bar = (label, val, i, col, txt) => {
      const yy = y + i * 40;
      c.fillStyle = C.label; c.font = '600 13px system-ui, sans-serif'; c.fillText(label, x - 10, yy);
      c.fillStyle = 'rgba(15,23,42,.12)'; roundRect(c, x - 10, yy + 6, 86, 10, 5); c.fill();
      c.fillStyle = col; roundRect(c, x - 10, yy + 6, 86 * clamp(val, 0, 1), 10, 5); c.fill();
      if (txt) { c.fillStyle = C.text; c.font = '700 12px system-ui, sans-serif'; c.fillText(txt, x + 80, yy + 15); }
    };
    bar('O₂', s.o2, 0, '#22c55e', Math.round(s.o2 * 100) + '%');
    bar('CO₂', s.co2, 1, '#f59e0b');
    bar('Пульс', (s.hr - 30) / 80, 2, '#ef4444', Math.round(s.hr) + '');
    // глубина и объём лёгких — сверху справа
    c.fillStyle = C.text; c.font = '700 18px system-ui, sans-serif';
    const liters = (6 * s.lung).toFixed(1);
    c.fillText(`${s.depth.toFixed(0)} м · ${(1 + s.depth / 10).toFixed(1)} атм`, 380, 30);
    c.font = '600 14px system-ui, sans-serif'; c.fillStyle = C.label;
    c.fillText(`воздух в лёгких ≈ ${liters} л`, 380, 52);
    if (s.glottis > 0.5) { c.fillStyle = '#0369a1'; c.fillText('голосовая щель закрыта', 380, 72); }
    if (s.warn) { c.fillStyle = '#dc2626'; c.font = '700 14px system-ui, sans-serif'; c.fillText('⚠ ' + s.warn, 20, 770); }
  }
}

// ---------------------------------------------------------------- рисовалки
function smoothPath(c, pts) {
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]);
}
function smoothPoly(c, pts) {
  const n = pts.length;
  const m = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  const s = m(n - 1); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
  c.closePath();
}
function blob(c, x, y, rx, ry, fill, edge) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = 1.2; c.stroke(); } }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function arrow(c, x1, y1, x2, y2, col, w = 2) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1), h = 6 + w * 2;
  c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)); c.lineTo(x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)); c.closePath(); c.fill();
}
