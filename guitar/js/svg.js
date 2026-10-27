// SVG-рисунки: схемы аккордов, гриф, голова грифа, табулатура, постановка рук.
import { CHORDS, OPEN, noteName, FINGERS } from './data.js';

const ink = 'var(--ink)', soft = 'var(--soft)', acc = 'var(--acc)', wood = 'var(--wood)';
// цвет пальца одинаковый во всех схемах и подсказках: 1 синий, 2 фиолетовый, 3 оранжевый, 4 розовый
export const fingerColor = f => (f >= 1 && f <= 4 ? `var(--f${f})` : 'var(--fT)');
export const fingerDot = f => `<i class="fdot" style="background:${fingerColor(f)}">${f}</i>`;

// Схема аккорда: гриф стоит вертикально, как будто гитару поставили перед собой грифом вверх.
// Слева 6-я (толстая) струна, справа 1-я. opts.st: состояние струн для проверки ('ok' | 'bad' | 'cur' | 'wait'), индекс 0 = 6-я
export function chordSVG(name, opts = {}) {
  const ch = CHORDS[name];
  const W = 196, H = 262, x0 = 46, y0 = 68, dx = 24, dy = 32, frets = 5;
  const st = opts.st || [], bad = new Set(opts.bad || []);
  const state = i => st[i] || (bad.has(i) ? 'bad' : '');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chord-svg" role="img" aria-label="Аккорд ${ch.name}: ${ch.ru}">`;
  s += `<text x="${x0 + dx * 2.5}" y="20" text-anchor="middle" class="t-title">${ch.name}</text>`;
  for (let i = 0; i < 6; i++) s += `<text x="${x0 + i * dx}" y="38" text-anchor="middle" class="t-snum">${6 - i}</text>`;
  s += `<rect x="${x0 - 2}" y="${y0 - 6}" width="${dx * 5 + 4}" height="6" rx="1" fill="${ink}"/>`;
  for (let f = 1; f <= frets; f++) s += `<line x1="${x0}" x2="${x0 + dx * 5}" y1="${y0 + f * dy}" y2="${y0 + f * dy}" stroke="${soft}" stroke-width="2"/>`;
  for (let f = 1; f <= frets; f++) s += `<text x="${x0 - 28}" y="${y0 + (f - 0.5) * dy + 4}" text-anchor="middle" class="t-small">${f}</text>`;
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * dx, k = state(i), f = ch.frets[i];
    const col = k === 'bad' ? 'var(--bad)' : k === 'ok' ? 'var(--good)' : ink;
    if (k === 'cur') s += `<rect x="${x - 10}" y="${y0 - 2}" width="20" height="${frets * dy + 4}" rx="10" class="s-cur"/>`;
    s += `<line x1="${x}" x2="${x}" y1="${y0}" y2="${y0 + frets * dy}" stroke="${col}" stroke-width="${1 + (5 - i) * 0.42}"/>`;
    if (f < 0) s += `<text x="${x}" y="${y0 - 14}" text-anchor="middle" class="t-mark" fill="var(--bad)">✕</text>`;
    else if (f === 0) s += `<circle cx="${x}" cy="${y0 - 19}" r="6.5" fill="${k === 'ok' ? 'var(--good)' : 'none'}" stroke="${col}" stroke-width="2"/>`;
    else {
      const cy = y0 + (f - 0.5) * dy, fg = ch.fingers[i];
      s += `<circle cx="${x}" cy="${cy}" r="11" fill="${fingerColor(fg)}" stroke="${k === 'bad' ? 'var(--bad)' : k === 'ok' ? 'var(--good)' : 'none'}" stroke-width="3"/>`;
      s += `<text x="${x}" y="${cy + 4.5}" text-anchor="middle" class="t-finger">${fg}</text>`;
    }
    if (f >= 0) s += `<text x="${x}" y="${y0 + frets * dy + 20}" text-anchor="middle" class="t-small ${k ? 'st-' + k : ''}">${noteName(OPEN[i] + f).lat}</text>`;
  }
  return s + '</svg>';
}

// Горизонтальный гриф: 1-я (тонкая) струна сверху, как в табулатуре (гитара лежит на коленях декой вверх).
// flip — наоборот, 6-я сверху: так струны выглядят на гитаре в руках. marks: [{s, f, t, cls, finger}] cls: 'target' | 'done' | 'next' | 'wrong' | 'hint' | 'note'
// opts: { names — подписать ноты на всех ладах, pick — струны можно нажимать, hl — подсветить струну,
//   nolabels — без номеров струн слева (для упражнения «найди струну»), dy — расстояние между струнами, flip }
export function fretboardSVG(marks = [], maxFret = 12, opts = {}) {
  const lab = !opts.nolabels, dy = opts.dy || 22, row = n => (opts.flip ? 6 - n : n - 1);
  const x0 = lab ? 78 : 34, y0 = 24, fw = maxFret <= 5 ? 62 : maxFret <= 7 ? 52 : 44, W = x0 + 12 + fw * maxFret, H = y0 + dy * 5 + 38;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="fret-svg" role="img" aria-label="Гриф">`;
  s += `<rect x="${x0}" y="${y0 - 10}" width="${fw * maxFret}" height="${dy * 5 + 20}" rx="3" fill="${wood}"/>`;
  [3, 5, 7, 9].forEach(f => f <= maxFret && (s += `<circle cx="${x0 + (f - 0.5) * fw}" cy="${y0 + dy * 2.5}" r="5" fill="var(--inlay)"/>`));
  if (maxFret >= 12) [1.5, 3.5].forEach(k => (s += `<circle cx="${x0 + 11.5 * fw}" cy="${y0 + dy * k}" r="5" fill="var(--inlay)"/>`));
  s += `<rect x="${x0 - 5}" y="${y0 - 10}" width="7" height="${dy * 5 + 20}" fill="var(--nut)"/>`;
  for (let f = 1; f <= maxFret; f++) {
    s += `<line x1="${x0 + f * fw}" x2="${x0 + f * fw}" y1="${y0 - 10}" y2="${y0 + dy * 5 + 10}" stroke="var(--fretwire)" stroke-width="2.5"/>`;
    s += `<text x="${x0 + (f - 0.5) * fw}" y="${H - 8}" text-anchor="middle" class="t-small">${f}</text>`;
  }
  s += `<text x="${x0 - 2}" y="${H - 8}" text-anchor="middle" class="t-small">0</text>`;
  for (let n = 1; n <= 6; n++) {
    const y = y0 + row(n) * dy, hl = opts.hl === n;
    if (hl) s += `<rect x="4" y="${y - dy / 2 + 1}" width="${W - 8}" height="${dy - 2}" rx="8" class="s-hl"/>`;
    s += `<line x1="${x0}" x2="${W - 12}" y1="${y}" y2="${y}" stroke="var(--string)" stroke-width="${0.9 + (n - 1) * 0.5}"/>`;
    if (lab) {
      s += `<text x="12" y="${y + 5}" text-anchor="middle" class="t-snum">${n}</text>`;
      s += `<text x="40" y="${y + 4}" text-anchor="middle" class="t-small">${noteName(OPEN[6 - n]).ru}</text>`;
    }
    if (opts.names) for (let f = 1; f <= maxFret; f++) {
      const nn = noteName(OPEN[6 - n] + f);
      if (nn.lat.length === 1) s += `<text x="${x0 + (f - 0.5) * fw}" y="${y + 4}" text-anchor="middle" class="t-fname">${nn.ru}</text>`;
    }
    if (opts.pick) s += `<rect x="0" y="${y - dy / 2}" width="${W}" height="${dy}" fill="transparent" class="s-pick" data-s="${n}"/>`;
  }
  for (const m of marks) {
    const y = y0 + row(m.s) * dy;
    const x = m.f === 0 ? x0 - 18 : x0 + (m.f - 0.5) * fw;
    const r = m.f === 0 ? 8 : 10;
    const fill = m.finger && m.cls !== 'done' && m.cls !== 'wrong' ? ` style="fill:${fingerColor(m.finger)}"` : '';
    s += `<circle cx="${x}" cy="${y}" r="${r}" class="fm ${m.cls || 'target'}"${fill}/>`;
    if (m.finger) s += `<text x="${x}" y="${y + 4}" text-anchor="middle" class="t-finger">${m.finger}</text>`;
    if (m.t) s += `<text x="${x}" y="${y - 13}" text-anchor="middle" class="t-label">${m.t}</text>`;
  }
  return s + '</svg>';
}

// Голова грифа 3+3, вид спереди: слева колки 6-5-4 (6-й дальше всех от порожка), справа 1-2-3
// cur — струна сейчас, tuned — набор настроенных
export function headstockSVG(cur, tuned = new Set()) {
  // колки: [струна, x стойки, y]; стойки слегка расходятся к верху, как на настоящей голове
  const posts = [[6, 92, 62], [5, 96, 122], [4, 100, 182], [1, 148, 62], [2, 144, 122], [3, 140, 182]];
  const nutX = n => 88 + (6 - n) * 12.8;
  let s = `<svg viewBox="0 0 240 300" class="head-svg" role="img" aria-label="Голова грифа: какой колок у какой струны">`;
  s += `<path d="M78 290 L70 30 Q70 8 92 8 L148 8 Q170 8 170 30 L162 290 Z" fill="${wood}" stroke="var(--line)" stroke-width="2"/>`;
  s += `<rect x="80" y="284" width="80" height="8" rx="2" fill="var(--nut)"/>`;
  for (const [n, px, y] of posts) {
    const left = n >= 4, on = n === cur, ok = tuned.has(n), ex = left ? px + 7 : px - 7;
    s += `<line x1="${nutX(n)}" y1="288" x2="${ex}" y2="${y}" stroke="${on ? 'var(--acc2)' : 'var(--string)'}" stroke-width="${on ? 2.6 : 1 + (n - 1) * 0.3}"/>`;
    s += `<circle cx="${px}" cy="${y}" r="7" fill="#cfc6b8"/>`;
    const bx = left ? 30 : 210;
    s += `<g class="peg ${on ? 'on' : ''} ${ok ? 'ok' : ''}" data-s="${n}">`;
    s += `<line x1="${left ? 72 : 168}" y1="${y}" x2="${bx}" y2="${y}" stroke="#bbb" stroke-width="5"/>`;
    s += `<ellipse cx="${bx}" cy="${y}" rx="24" ry="17" class="peg-b"/>`;
    s += `<text x="${bx}" y="${y - 2}" text-anchor="middle" class="peg-n">${n}</text>`;
    s += `<text x="${bx}" y="${y + 11}" text-anchor="middle" class="peg-l">${noteName(OPEN[6 - n]).lat}${ok ? ' ✓' : ''}</text></g>`;
  }
  return s + '</svg>';
}

// Табулатура: 6 линий, сверху 1-я струна; цифра — лад (0 — открытая). cur — индекс текущей ноты
export function tabSVG(targets, cur = -1) {
  const x0 = 34, dx = 32, y0 = 18, dy = 15, W = x0 + 16 + dx * targets.length, H = y0 + dy * 5 + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="tab-svg" style="min-width:${Math.min(W, 900)}px" role="img" aria-label="Табулатура">`;
  ['e', 'B', 'G', 'D', 'A', 'E'].forEach((l, i) => {
    s += `<line x1="${x0 - 6}" x2="${W - 6}" y1="${y0 + i * dy}" y2="${y0 + i * dy}" stroke="var(--soft)" stroke-width="1"/>`;
    s += `<text x="10" y="${y0 + i * dy + 4}" class="t-small">${i + 1} ${l}</text>`;
  });
  targets.forEach((t, k) => {
    const x = x0 + 12 + k * dx, y = y0 + (t.s - 1) * dy, cls = k < cur ? 'done' : k === cur ? 'cur' : '';
    if (cls === 'cur') s += `<rect x="${x - 12}" y="${y0 - 10}" width="24" height="${dy * 5 + 20}" rx="8" class="tab-cur"/>`;
    s += `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" rx="4" fill="var(--card)"/>`;
    s += `<text x="${x}" y="${y + 5}" text-anchor="middle" class="t-tab ${cls}">${t.f}</text>`;
    if (t.label) s += `<text x="${x}" y="${H - 6}" text-anchor="middle" class="t-small ${cls}">${t.label}</text>`;
  });
  return s + '</svg>';
}

function guitarShape(tx, ty, rot, scale = 1) {
  return `<g transform="translate(${tx} ${ty}) rotate(${rot}) scale(${scale})">
    <rect x="58" y="-7" width="150" height="14" rx="2" fill="#6b4a2b"/>
    ${[78, 98, 116, 133, 149, 164, 178, 191].map(x => `<line x1="${x}" x2="${x}" y1="-7" y2="7" stroke="#cfc6b8" stroke-width="1.3"/>`).join('')}
    <path d="M206 -10 L238 -13 L238 13 L206 10 Z" fill="#4a3220"/>
    ${[214, 224, 234].map(x => `<circle cx="${x}" cy="-15" r="3" fill="#bbb"/><circle cx="${x}" cy="15" r="3" fill="#bbb"/>`).join('')}
    <path d="M-60 0 C-60 -48 -22 -50 -4 -34 C8 -24 18 -40 40 -40 C66 -40 70 -16 70 0 C70 16 66 40 40 40 C18 40 8 24 -4 34 C-22 50 -60 48 -60 0 Z" fill="#d9a35b" stroke="#8a5a2b" stroke-width="3"/>
    <circle cx="26" cy="0" r="14" fill="#2b1c10"/>
    <rect x="-40" y="-14" width="8" height="28" rx="2" fill="#5a3a20"/>
    ${[-5, -3, -1, 1, 3, 5].map(y => `<line x1="-36" x2="238" y1="${y}" y2="${y}" stroke="#eee" stroke-width="0.6"/>`).join('')}
  </g>`;
}

const label = (x, y, txt, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="t-label">${txt}</text>`;
const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${acc}" stroke-width="1.5" marker-end="url(#ah)"/>`;
const defs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${acc}"/></marker></defs>`;

export const ILLUSTRATIONS = {
  parts: {
    caption: 'Устройство гитары',
    svg: `<svg viewBox="0 0 360 200" class="ill">${defs}
      ${guitarShape(70, 105, 0, 1.15)}
      ${label(250, 40, 'Голова и колки', 'middle')}${arrow(290, 46, 320, 82)}
      ${label(200, 175, 'Гриф с ладами', 'middle')}${arrow(200, 162, 200, 116)}
      ${label(60, 30, 'Корпус', 'middle')}${arrow(60, 36, 50, 62)}
      ${label(130, 30, 'Розетка', 'middle')}${arrow(120, 36, 100, 92)}
      ${label(20, 190, 'Подставка')}${arrow(40, 178, 30, 120)}
      ${label(318, 175, '1-й лад', 'middle')}${arrow(312, 162, 299, 113)}
    </svg>`,
  },
  posture: {
    caption: 'Посадка: вид спереди',
    svg: `<svg viewBox="0 0 360 260" class="ill">${defs}
      <rect x="110" y="168" width="110" height="10" rx="3" fill="${soft}"/>
      <rect x="118" y="178" width="8" height="70" fill="${soft}"/><rect x="204" y="178" width="8" height="70" fill="${soft}"/>
      <circle cx="165" cy="38" r="20" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M140 66 L190 66 L186 160 L144 160 Z" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M144 160 L130 170 L132 246 M186 160 L196 170 L194 246" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M124 246 L142 246 M188 246 L206 246" stroke="${ink}" stroke-width="4"/>
      ${guitarShape(140, 140, -16, 0.72)}
      <path d="M142 72 L120 104 L140 128" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M188 72 L230 104 L262 86" fill="none" stroke="${ink}" stroke-width="3"/>
      ${label(8, 70, 'Плечи опущены')}${arrow(60, 74, 138, 72)}
      ${label(8, 120, 'Предплечье')}${label(8, 134, 'на корпусе')}${arrow(70, 122, 118, 110)}
      ${label(250, 46, 'Гриф чуть вверх')}${arrow(290, 52, 280, 72)}
      ${label(250, 140, 'Спина прямая')}${arrow(248, 136, 192, 116)}
      ${label(240, 230, 'Ступни на полу')}${arrow(238, 234, 208, 244)}
    </svg>`,
  },
  fingers: {
    caption: 'Номера пальцев левой руки',
    svg: `<svg viewBox="0 0 380 190" class="ill">
      <path d="M90 180 L90 110 Q90 95 105 95 L215 95 Q230 95 230 110 L230 180" fill="var(--skin)" stroke="${ink}" stroke-width="2"/>
      ${[[105, 30, '1', 'указательный'], [140, 14, '2', 'средний'], [175, 22, '3', 'безымянный'], [208, 44, '4', 'мизинец']].map(([x, y, n, t]) =>
        `<rect x="${x - 13}" y="${y}" width="26" height="${100 - y}" rx="13" fill="var(--skin)" stroke="${ink}" stroke-width="2"/>
         <circle cx="${x}" cy="${y + 16}" r="11" fill="${acc}"/><text x="${x}" y="${y + 21}" text-anchor="middle" class="t-finger">${n}</text>`).join('')}
      <rect x="40" y="120" width="60" height="24" rx="12" transform="rotate(-25 70 132)" fill="var(--skin)" stroke="${ink}" stroke-width="2"/>
      <text x="6" y="170" class="t-label">большой (T)</text>
      ${label(250, 70, '1 — указательный')}${label(250, 92, '2 — средний')}${label(250, 114, '3 — безымянный')}${label(250, 136, '4 — мизинец')}
    </svg>`,
  },
  leftFront: {
    caption: 'Левая рука: куда ставить пальцы',
    svg: `<svg viewBox="0 0 360 200" class="ill">${defs}
      <rect x="20" y="40" width="320" height="100" fill="${wood}"/>
      <rect x="20" y="40" width="7" height="100" fill="var(--nut)"/>
      ${[95, 170, 245, 320].map(x => `<line x1="${x}" x2="${x}" y1="40" y2="140" stroke="var(--fretwire)" stroke-width="4"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="20" x2="340" y1="${50 + i * 16}" y2="${50 + i * 16}" stroke="var(--string)" stroke-width="${0.8 + i * 0.45}"/>`).join('')}
      ${[[82, 50, 1], [157, 66, 2], [232, 82, 3], [307, 98, 4]].map(([x, y, n]) =>
        `<path d="M${x} ${y} Q${x - 6} ${y + 60} ${x - 14} 200" stroke="var(--skin)" stroke-width="20" fill="none" stroke-linecap="round" opacity=".9"/>
         <circle cx="${x}" cy="${y}" r="9" fill="${acc}"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="t-finger">${n}</text>`).join('')}
      <ellipse cx="150" cy="128" rx="20" ry="9" fill="none" stroke="${ink}" stroke-dasharray="4 3" stroke-width="2"/>
      ${label(20, 22, 'Кончик пальца — у самого порожка, со стороны корпуса')}
      ${arrow(110, 28, 92, 46)}
      ${label(178, 166, 'Большой палец за грифом')}${label(178, 182, '(пунктир), напротив 2-го')}${arrow(176, 160, 160, 134)}
    </svg>`,
  },
  leftSide: {
    caption: 'Левая рука: вид сбоку на гриф',
    svg: `<svg viewBox="0 0 360 210" class="ill">${defs}
      <path d="M130 70 L230 70 Q240 70 238 84 Q224 132 180 136 Q136 132 122 84 Q120 70 130 70 Z" fill="${wood}" stroke="${ink}" stroke-width="2"/>
      ${[140, 156, 172, 188, 204, 220].map((x, i) => `<circle cx="${x}" cy="64" r="${1.8 + (5 - i) * 0.35}" fill="var(--string)"/>`).join('')}
      <path d="M216 63 Q214 30 240 22 Q280 14 300 60 Q310 110 280 160" fill="none" stroke="var(--skin)" stroke-width="20" stroke-linecap="round"/>
      <path d="M216 63 Q214 30 240 22 Q280 14 300 60 Q310 110 280 160" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="2 4"/>
      <path d="M150 150 Q170 175 200 170" fill="none" stroke="var(--skin)" stroke-width="18" stroke-linecap="round"/>
      <path d="M200 170 Q250 175 280 160" fill="none" stroke="var(--skin)" stroke-width="26" stroke-linecap="round"/>
      ${label(8, 30, 'Палец «домиком»,')}${label(8, 46, 'давим кончиком')}${arrow(110, 36, 212, 58)}
      ${label(8, 120, 'Большой палец')}${label(8, 136, 'на спинке грифа')}${arrow(104, 130, 148, 150)}
      ${label(250, 200, 'Ладонь не касается грифа', 'middle')}${arrow(260, 190, 238, 140)}
    </svg>`,
  },
  rightHand: {
    caption: 'Правая рука: бой',
    svg: `<svg viewBox="0 0 360 210" class="ill">${defs}
      <circle cx="120" cy="105" r="70" fill="#2b1c10"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${60 + i * 24}" x2="${60 + i * 24}" y1="10" y2="200" stroke="var(--string)" stroke-width="${3 - i * 0.4}"/>`).join('')}
      <text x="60" y="206" text-anchor="middle" class="t-small">6</text><text x="180" y="206" text-anchor="middle" class="t-small">1</text>
      <ellipse cx="210" cy="96" rx="36" ry="26" fill="var(--skin)" stroke="${ink}" stroke-width="2"/>
      <path d="M190 112 L176 130" stroke="var(--skin)" stroke-width="14" stroke-linecap="round"/>
      <path d="M170 128 L180 140 L164 140 Z" fill="${acc}"/>
      <path d="M250 70 L250 140" stroke="${acc}" stroke-width="4" marker-end="url(#ah)"/>
      <path d="M268 140 L268 84" stroke="var(--soft)" stroke-width="4" marker-end="url(#ah)"/>
      ${label(282, 112, '↓ вниз:')}${label(282, 128, 'все струны')}
      ${label(282, 74, '↑ вверх:')}${label(282, 90, '1–3 струны')}
      ${label(200, 180, 'Медиатор: большой +', 'middle')}${label(200, 196, 'бок указательного', 'middle')}
      ${label(200, 30, 'Кисть свободная,', 'middle')}${label(200, 46, 'движение от запястья', 'middle')}
    </svg>`,
  },
};

// дополнительные рисунки (добавляются к ILLUSTRATIONS ниже)
const EXTRA = {
  stringsFront: {
    caption: 'Гитара в руках, вид спереди: 6-я струна сверху (у лица), 1-я внизу (у пола)',
    svg: `<svg viewBox="0 0 360 200" class="ill">
      <rect x="12" y="30" width="150" height="140" rx="6" fill="${wood}"/>
      ${[0, 1, 2, 3, 4, 5].map(i => { const y = 46 + i * 22, n = 6 - i; return `<line x1="12" x2="172" y1="${y}" y2="${y}" stroke="var(--string)" stroke-width="${3.4 - i * 0.5}"/>
        <text x="182" y="${y + 5}" class="t-label"><tspan class="t-snum">${n}</tspan>  ${['ми — самая толстая', 'ля', 'ре', 'соль', 'си', 'ми — самая тонкая'][i]}</text>`; }).join('')}
      <text x="87" y="22" text-anchor="middle" class="t-small">↑ к лицу</text>
      <text x="87" y="190" text-anchor="middle" class="t-small">↓ к полу</text>
    </svg>`,
  },
  press: {
    caption: 'Куда ставить палец: у ладового порожка, со стороны корпуса',
    svg: `<svg viewBox="0 0 360 170" class="ill">
      <rect x="10" y="96" width="340" height="16" fill="${wood}"/>
      <line x1="10" x2="350" y1="92" y2="92" stroke="var(--string)" stroke-width="2.5"/>
      ${[70, 180, 290].map(x => `<rect x="${x - 3}" y="84" width="6" height="12" rx="2" fill="var(--fretwire)"/>`).join('')}
      <path d="M160 92 Q158 50 172 30" stroke="var(--skin)" stroke-width="22" fill="none" stroke-linecap="round"/>
      <circle cx="161" cy="88" r="5" fill="var(--good)"/>
      <path d="M118 92 Q116 54 128 36" stroke="var(--skin)" stroke-width="22" fill="none" stroke-linecap="round" opacity=".45"/>
      <text x="166" y="138" text-anchor="middle" class="t-label" fill="var(--good)">✓ здесь: чисто и легко</text>
      <text x="112" y="158" text-anchor="middle" class="t-small">посередине лада — нужна сила, дребезжит</text>
      <text x="290" y="70" text-anchor="middle" class="t-small">на самом порожке —</text><text x="290" y="84" text-anchor="middle" class="t-small">звук глухой</text>
      <text x="40" y="78" class="t-small">← голова</text><text x="300" y="134" class="t-small">корпус →</text>
    </svg>`,
  },
  pima: {
    caption: 'Перебор: каждый палец правой руки отвечает за свою струну',
    svg: `<svg viewBox="0 0 360 210" class="ill">
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${70 + i * 34}" x2="${70 + i * 34}" y1="60" y2="200" stroke="var(--string)" stroke-width="${3.4 - i * 0.5}"/><text x="${70 + i * 34}" y="52" text-anchor="middle" class="t-snum">${6 - i}</text>`).join('')}
      <rect x="56" y="108" width="96" height="30" rx="15" fill="var(--fT)" opacity=".9"/><text x="104" y="128" text-anchor="middle" class="t-finger">p — большой</text>
      ${[['i', 172, 'var(--f1)'], ['m', 206, 'var(--f2)'], ['a', 240, 'var(--f3)']].map(([l, x, c]) => `<circle cx="${x}" cy="150" r="14" fill="${c}"/><text x="${x}" y="155" text-anchor="middle" class="t-finger">${l}</text>`).join('')}
      <text x="104" y="22" text-anchor="middle" class="t-label">басы: 6, 5, 4</text>
      <text x="206" y="22" text-anchor="middle" class="t-label">3 · 2 · 1</text>
      <text x="300" y="120" class="t-small">i — указат.</text><text x="300" y="136" class="t-small">m — средний</text><text x="300" y="152" class="t-small">a — безымян.</text>
    </svg>`,
  },
  mute: {
    caption: 'Глушение: ребро ладони падает на струны, получается сухой щелчок «чк»',
    svg: `<svg viewBox="0 0 360 190" class="ill">${defs}
      <circle cx="110" cy="100" r="62" fill="#2b1c10"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${50 + i * 22}" x2="${50 + i * 22}" y1="10" y2="186" stroke="var(--string)" stroke-width="${3 - i * 0.4}"/>`).join('')}
      <rect x="196" y="40" width="20" height="120" rx="6" fill="var(--bridge)"/>
      <path d="M150 128 Q205 104 268 112 Q300 118 304 140 Q276 158 220 152 Q176 148 150 128 Z" fill="var(--skin)" stroke="${ink}" stroke-width="2"/>
      ${arrow(260, 70, 236, 108)}
      <text x="250" y="40" class="t-label">ребро ладони</text><text x="250" y="56" class="t-label">ложится на струны</text>
      <text x="200" y="182" text-anchor="middle" class="t-small">одновременно с ударом вниз</text>
    </svg>`,
  },
};

Object.assign(ILLUSTRATIONS, EXTRA);

export function illustration(id) {
  const it = ILLUSTRATIONS[id];
  return `<figure class="figure">${it.svg}<figcaption>${it.caption}</figcaption></figure>`;
}
