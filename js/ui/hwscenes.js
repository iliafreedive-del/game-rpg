// Фоны «Летописи битв»: четыре главы по 30 этапов — подземелье, лес, снега, скалы. Каждый фон рисуется один раз на холсте нужного размера;
// потом двигаются только облака, туман и частицы (искры, пыльца, снег, пыль).
export const SCENES = [
  { name: 'Подземелья Ордена' }, { name: 'Старый Лес' }, { name: 'Фьорды Скъёльда' }, { name: 'Пепельные скалы' },
];
const mk = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
const grad = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

export function paintScene(ci, W, H) {
  let seed = 7919 * (ci + 3); const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const [far, f] = mk(W, H), [near, n] = mk(W, H);
  const horizon = H * 0.64;
  const glow = (c, x, y, R, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); c.fillStyle = g; c.fillRect(x - R, y - R, R * 2, R * 2); };
  let parts, clouds = [];

  if (ci === 0) {   // подземелье: кирпичная стена с арками и факелами, плиточный пол
    f.fillStyle = grad(f, 0, H, [[0, '#07060e'], [0.6, '#17142a'], [1, '#221c38']]); f.fillRect(0, 0, W, H);
    for (let y = 0; y < horizon; y += 22) for (let x = -((y / 22) % 2) * 26; x < W; x += 52) { f.fillStyle = `rgba(${60 + r() * 30},${56 + r() * 26},${80 + r() * 30},0.22)`; f.fillRect(x + 1, y + 1, 50, 20); }
    const AW = Math.max(90, W / 4.2);
    for (let x = AW * 0.1; x < W; x += AW) {   // арки с тёмным провалом и холодным светом вдали
      f.fillStyle = '#05040a'; f.beginPath(); f.moveTo(x, horizon); f.lineTo(x, horizon * 0.55); f.quadraticCurveTo(x + AW * 0.4, horizon * 0.18, x + AW * 0.8, horizon * 0.55); f.lineTo(x + AW * 0.8, horizon); f.fill();
      f.strokeStyle = 'rgba(150,140,190,0.35)'; f.lineWidth = 5; f.stroke();
      glow(f, x + AW * 0.4, horizon * 0.7, AW * 0.5, 'rgba(120,110,220,A)', 0.2);
    }
    for (let x = 0; x < W + AW; x += AW) { f.fillStyle = '#2a2640'; f.fillRect(x - 12, 0, 24, horizon); f.fillStyle = 'rgba(180,170,220,0.18)'; f.fillRect(x - 12, 0, 5, horizon); }
    for (const tx of [W * 0.12, W * 0.5, W * 0.88]) { f.fillStyle = '#3a2a1a'; f.fillRect(tx - 3, horizon * 0.42, 6, 26); glow(f, tx, horizon * 0.4, 110, 'rgba(255,150,60,A)', 0.55); f.fillStyle = '#ffb050'; f.beginPath(); f.ellipse(tx, horizon * 0.4, 6, 11, 0, 0, 7); f.fill(); }
    n.fillStyle = grad(n, horizon, H, [[0, '#1a1628'], [1, '#0a0812']]); n.fillRect(0, horizon, W, H - horizon);
    n.strokeStyle = 'rgba(120,110,160,0.28)'; n.lineWidth = 1.5;
    for (let i = -8; i <= 8; i++) { n.beginPath(); n.moveTo(W / 2 + i * 14, horizon); n.lineTo(W / 2 + i * W * 0.2, H); n.stroke(); }
    for (let k = 0; k < 7; k++) { const y = horizon + (H - horizon) * Math.pow(k / 7, 1.8) + 6; n.beginPath(); n.moveTo(0, y); n.lineTo(W, y); n.stroke(); }
    for (let k = 0; k < 3; k++) { n.fillStyle = 'rgba(90,120,170,0.18)'; n.beginPath(); n.ellipse(r() * W, H * (0.78 + r() * 0.15), 50 + r() * 60, 8 + r() * 6, 0, 0, 7); n.fill(); }
    for (const px of [-W * 0.02, W * 1.02]) { n.fillStyle = '#100e1c'; n.fillRect(px - 38, 0, 76, H); n.fillStyle = 'rgba(170,160,210,0.15)'; n.fillRect(px - 38, 0, 10, H); }
    parts = Array.from({ length: 34 }, () => ({ x: r() * W, y: r() * H, vy: -(8 + r() * 20), r: 1 + r() * 1.6, c: r() < 0.6 ? '#ffa850' : '#b8a8ff', a: 0.4 + r() * 0.5, f: 1 + r() * 2, o: r() * 6 }));
    clouds = Array.from({ length: 4 }, () => ({ x: r() * W, y: H * (0.5 + r() * 0.25), w: 260 + r() * 260, v: 4 + r() * 6, a: 0.16 }));
  } else if (ci === 1) {   // лес
    f.fillStyle = grad(f, 0, horizon, [[0, '#5aa0d8'], [0.6, '#a8d8e8'], [1, '#e8f0c8']]); f.fillRect(0, 0, W, H);
    glow(f, W * 0.75, H * 0.14, W * 0.6, 'rgba(255,245,190,A)', 0.55);
    for (let k = 0; k < 6; k++) { f.fillStyle = 'rgba(255,250,200,0.07)'; f.beginPath(); const x0 = W * (0.55 + k * 0.05); f.moveTo(x0, 0); f.lineTo(x0 + 40, 0); f.lineTo(x0 - W * 0.4 + k * 30, horizon); f.lineTo(x0 - W * 0.5 + k * 30, horizon); f.fill(); }
    const layer = (y, hMin, hMax, col, step, pine) => { f.fillStyle = col; for (let x = -20; x < W + 20; x += step * (0.7 + r() * 0.6)) { const h = H * (hMin + r() * (hMax - hMin)); f.beginPath(); if (pine) { f.moveTo(x, y - h); f.lineTo(x - h * 0.22, y); f.lineTo(x + h * 0.22, y); } else { f.arc(x, y - h * 0.7, h * 0.32, 0, 7); f.rect(x - h * 0.04, y - h * 0.5, h * 0.08, h * 0.5); } f.fill(); } };
    layer(horizon, 0.18, 0.3, '#5a8a78', 26, true); layer(horizon + 4, 0.14, 0.26, '#3f7a5a', 34, false); layer(horizon + 8, 0.1, 0.2, '#2c6a40', 44, true);
    n.fillStyle = grad(n, horizon, H, [[0, '#6aa040'], [0.4, '#4a8030'], [1, '#2a5020']]); n.fillRect(0, horizon - 4, W, H - horizon + 4);
    n.fillStyle = 'rgba(120,90,50,0.55)'; n.beginPath(); n.moveTo(W * 0.3, H); n.quadraticCurveTo(W * 0.5, H * 0.78, W * 0.62, horizon + 6); n.lineTo(W * 0.7, horizon + 6); n.quadraticCurveTo(W * 0.78, H * 0.8, W * 0.8, H); n.fill();   // тропа
    for (let k = 0; k < 90; k++) { const x = r() * W, y = H * (0.67 + r() * 0.32); n.strokeStyle = r() < 0.5 ? '#8ac048' : '#3a6a22'; n.lineWidth = 1.4; n.beginPath(); n.moveTo(x, y); n.lineTo(x - 2, y - 7 - r() * 6); n.moveTo(x, y); n.lineTo(x + 3, y - 6 - r() * 6); n.stroke(); }
    for (let k = 0; k < 24; k++) { n.fillStyle = ['#ffe060', '#ff8aa0', '#ffffff'][k % 3]; n.beginPath(); n.arc(r() * W, H * (0.7 + r() * 0.28), 2.2, 0, 7); n.fill(); }
    for (const [x, w, c] of [[-W * 0.03, W * 0.13, '#2a1a10'], [W * 1.03, W * 0.15, '#2a1a10']]) { n.fillStyle = c; n.fillRect(x - w / 2, 0, w, H); n.fillStyle = '#1f4a22'; n.beginPath(); n.arc(x, H * 0.12, w * 1.4, 0, 7); n.fill(); }   // стволы и кроны по краям
    parts = Array.from({ length: 40 }, () => ({ x: r() * W, y: r() * H, vy: -(3 + r() * 8), r: 1.4 + r() * 1.6, c: r() < 0.7 ? '#fff0a0' : '#c8ff90', a: 0.5 + r() * 0.5, f: 1 + r() * 2, o: r() * 6 }));
    clouds = Array.from({ length: 5 }, () => ({ x: r() * W, y: H * (0.04 + r() * 0.2), w: 160 + r() * 220, v: 6 + r() * 10, a: 0.5 + r() * 0.3 }));
  } else if (ci === 2) {   // снега
    f.fillStyle = grad(f, 0, horizon, [[0, '#4a78b8'], [0.6, '#9cc4e8'], [1, '#eef6ff']]); f.fillRect(0, 0, W, H);
    glow(f, W * 0.25, H * 0.2, W * 0.5, 'rgba(255,255,255,A)', 0.5);
    const range = (base, amp, step, col, tip) => { const pts = []; for (let x = -step; x <= W + step; x += step * (0.6 + r() * 0.8)) pts.push([x, base - amp * (0.35 + r() * 0.65)]); f.fillStyle = col; f.beginPath(); f.moveTo(0, H); for (const [x, y] of pts) f.lineTo(x, y); f.lineTo(W, H); f.fill(); if (tip) { f.fillStyle = tip; for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i]; if (y < base - amp * 0.7) { f.beginPath(); f.moveTo(x, y); f.lineTo(x - amp * 0.12, y + amp * 0.16); f.lineTo(x + amp * 0.1, y + amp * 0.16); f.fill(); } } } };
    range(H * 0.52, H * 0.34, 90, '#a8bcd8', '#ffffff'); f.fillStyle = 'rgba(255,255,255,0.22)'; f.fillRect(0, H * 0.3, W, H * 0.3); range(H * 0.58, H * 0.24, 70, '#7890b4', '#ffffff'); range(H * 0.64, H * 0.14, 50, '#5a6e94', null);
    f.fillStyle = '#2e4a5a'; for (let x = -10; x < W + 10; x += 10 + r() * 14) { const h = H * (0.05 + r() * 0.08), y = H * 0.635 + r() * 6; f.beginPath(); f.moveTo(x, y - h); f.lineTo(x - h * 0.28, y); f.lineTo(x + h * 0.28, y); f.fill(); f.fillStyle = '#e8f2fa'; f.beginPath(); f.moveTo(x, y - h); f.lineTo(x - h * 0.12, y - h * 0.62); f.lineTo(x + h * 0.12, y - h * 0.62); f.fill(); f.fillStyle = '#2e4a5a'; }
    n.fillStyle = grad(n, horizon, H, [[0, '#eef4fa'], [0.5, '#c8d8e8'], [1, '#9ab0c8']]); n.fillRect(0, horizon - 4, W, H - horizon + 4);
    for (let k = 0; k < 70; k++) { n.fillStyle = 'rgba(120,150,190,0.25)'; n.beginPath(); n.ellipse(r() * W, H * (0.67 + r() * 0.3), 4 + r() * 14, 1 + r() * 3, 0, 0, 7); n.fill(); }
    for (const [x, w] of [[-20, W * 0.16], [W + 20, W * 0.18]]) { n.fillStyle = '#f4f8fc'; n.beginPath(); n.ellipse(x, H + 12, w, H * 0.19, 0, Math.PI, 0); n.fill(); }
    parts = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, vy: 22 + r() * 24, r: 1.2 + r() * 1.8, c: '#ffffff', a: 0.55 + r() * 0.4, f: 1 + r() * 2, o: r() * 6 }));
    clouds = Array.from({ length: 5 }, () => ({ x: r() * W, y: H * (0.04 + r() * 0.2), w: 180 + r() * 220, v: 8 + r() * 12, a: 0.5 + r() * 0.3 }));
  } else {   // скалы: закатный каньон, пласты породы, валуны, пыль
    f.fillStyle = grad(f, 0, horizon, [[0, '#3a2a58'], [0.5, '#b0605a'], [1, '#f0b878']]); f.fillRect(0, 0, W, H);
    glow(f, W * 0.7, H * 0.4, W * 0.5, 'rgba(255,190,110,A)', 0.6); f.fillStyle = '#ffe0a0'; f.beginPath(); f.arc(W * 0.7, H * 0.4, 38, 0, 7); f.fill();
    const mesa = (base, amp, step, col, strata) => { f.fillStyle = col; f.beginPath(); f.moveTo(0, H); let x = -20; while (x < W + 40) { const w = step * (0.8 + r() * 1.2), h = amp * (0.35 + r() * 0.65); f.lineTo(x, base - h); f.lineTo(x + w * 0.1, base - h - 6); f.lineTo(x + w * 0.9, base - h - 6); f.lineTo(x + w, base - h * 0.2); x += w; } f.lineTo(W, H); f.fill(); if (strata) { f.strokeStyle = 'rgba(0,0,0,0.16)'; f.lineWidth = 2; for (let y = base - amp; y < base; y += 11) { f.beginPath(); f.moveTo(0, y); f.lineTo(W, y + (r() - 0.5) * 6); f.stroke(); } } };
    mesa(H * 0.56, H * 0.34, 120, '#8a5a52', true); f.fillStyle = 'rgba(255,200,150,0.18)'; f.fillRect(0, H * 0.34, W, H * 0.26); mesa(H * 0.62, H * 0.22, 90, '#6a4440', true); mesa(horizon + 4, H * 0.12, 70, '#4a302e', false);
    n.fillStyle = grad(n, horizon, H, [[0, '#8a6448'], [0.5, '#5a4030'], [1, '#2a1c16']]); n.fillRect(0, horizon - 4, W, H - horizon + 4);
    for (let k = 0; k < 22; k++) { n.strokeStyle = 'rgba(20,10,6,0.55)'; n.lineWidth = 1.4; n.beginPath(); let x = r() * W, y = H * (0.68 + r() * 0.3); n.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (r() - 0.5) * 50; y += (r() - 0.3) * 10; n.lineTo(x, y); } n.stroke(); }
    for (let k = 0; k < 7; k++) { const x = r() * W, y = H * (0.7 + r() * 0.26), w = 14 + r() * 26; n.fillStyle = '#3a2a24'; n.beginPath(); n.ellipse(x, y, w, w * 0.55, 0, Math.PI, 0); n.fill(); n.fillStyle = 'rgba(255,200,150,0.16)'; n.beginPath(); n.ellipse(x - w * 0.2, y - w * 0.15, w * 0.5, w * 0.2, 0, Math.PI, 0); n.fill(); }
    for (const [x, w] of [[-20, W * 0.17], [W + 20, W * 0.19]]) { n.fillStyle = '#1a100c'; n.beginPath(); n.ellipse(x, H + 12, w, H * 0.22, 0, Math.PI, 0); n.fill(); }
    parts = Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * H, vy: -(2 + r() * 10), r: 1.2 + r() * 1.8, c: r() < 0.5 ? '#ffb070' : '#e8c8a0', a: 0.35 + r() * 0.5, f: 1 + r() * 2, o: r() * 6 }));
    clouds = Array.from({ length: 4 }, () => ({ x: r() * W, y: H * (0.1 + r() * 0.25), w: 200 + r() * 260, v: 10 + r() * 14, a: 0.28 }));
  }
  // виньетка
  const vg = n.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); n.fillStyle = vg; n.fillRect(0, 0, W, H);
  // спрайт облака / тумана
  const [cl, cx] = mk(256, 100); const tone = ci === 0 ? '90,80,140' : ci === 3 ? '120,70,60' : '255,255,255';
  for (let k = 0; k < 7; k++) { const gx = cx.createRadialGradient(40 + k * 28, 55 - (k % 3) * 10, 0, 40 + k * 28, 55 - (k % 3) * 10, 38); gx.addColorStop(0, `rgba(${tone},0.9)`); gx.addColorStop(1, `rgba(${tone},0)`); cx.fillStyle = gx; cx.fillRect(0, 0, 256, 100); }
  return { far, near, cloud: cl, clouds, parts };
}
