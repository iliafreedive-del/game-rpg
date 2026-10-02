// Временная графика походов (рендер не трогаем): перекрашенные спрайты мобов, «снежный» набор пропсов
// и изометрический пол поля, нарисованный канвасом. Заменить на готовые модели по docs/content/ART_REQUESTS.md.
import { Atlas, getAtlas, loadGroup, putAtlas } from '../core/assets.js';
import { WILD_MOBS } from '../data/wild.js';

const sheetCache = new Map();   // «атлас|фильтр» → перекрашенные листы
function recolor(A, key, filter) {
  const k = A.name + '|' + filter; if (sheetCache.has(k)) return sheetCache.get(k);
  const sheets = A.sheets.map(im => {
    const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
    const x = c.getContext('2d'); x.filter = filter; x.drawImage(im, 0, 0); return c;
  });
  sheetCache.set(k, sheets); return sheets;
}
// Готовит атласы мобов выбранного мира: wmob_<тип> = базовый спрайт × фильтр × размер.
export async function prepareWildAtlases(realm) {
  const types = Object.entries(WILD_MOBS).filter(([, m]) => m.realm === realm);
  await loadGroup([...new Set(types.map(([, m]) => m.from))]);
  for (const [t, m] of types) {
    const name = 'w_' + t; if (getAtlas(name)) continue;
    const B = getAtlas(m.from); if (!B) continue;
    putAtlas(name, new Atlas(name, { ...B.meta, ppm: B.meta.ppm / m.size }, recolor(B, name, m.filter)));
  }
}

// Набор пропсов: во Фьордах — заснеженный, в остальных зонах — оригинал.
let origProps = null, snowProps = null;
export function setPropsPalette(snow) {
  const cur = getAtlas('props'); if (!origProps) origProps = (cur && cur.name === 'props') ? cur : origProps; if (!origProps) return;
  if (!snow) { putAtlas('props', origProps); return; }
  if (!snowProps) {
    const sheets = origProps.sheets.map(im => {
      const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
      const x = c.getContext('2d'); x.filter = 'saturate(.3) brightness(1.22) contrast(1.05)'; x.drawImage(im, 0, 0);
      x.filter = 'none'; x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(170,205,255,0.22)'; x.fillRect(0, 0, c.width, c.height); return c;
    });
    snowProps = new Atlas('props', origProps.meta, sheets);
  }
  putAtlas('props', snowProps);
}

// Пол поля. Совместим с Zone/renderer: zone.floor + zone.floorImgs.
export function buildWildFloor(zone) {
  const J = zone.json, M = J.wild.mood, realm = J.wild.realm, fort = J.wild.fort;
  const W = (J.w + J.h) * 32, H = (J.w + J.h) * 16 + 34, ox = J.h * 32;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let s = J.floorN * 131 + 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = (u, v) => [ox + (u - v) * 32, (u + v) * 16];
  const diamond = (i, j, grow = 0.6) => { const [X, Y] = P(i, j); x.beginPath(); x.moveTo(X, Y - grow); x.lineTo(X + 32 + grow, Y + 16); x.lineTo(X, Y + 32 + grow); x.lineTo(X - 32 - grow, Y + 16); x.closePath(); };
  const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
  for (let j = 0; j < J.h; j++) for (let i = 0; i < J.w; i++) {
    const ch = J.rows[j][i];
    if (ch === '~') { x.fillStyle = rgb(M.water, 0.9 + rnd() * 0.2); diamond(i, j); x.fill(); continue; }
    const base = (i * 7 + j * 13) % 7 === 0 ? M.alt : M.ground;
    let k = 0.965 + rnd() * 0.07;
    if (ch === ',') { x.fillStyle = realm === 'fjord' ? rgb([150, 154, 164], k) : rgb([112, 92, 62], k); }
    else if (ch === 'x') x.fillStyle = rgb(base, 0.62 * k);
    else x.fillStyle = rgb(base, k);
    diamond(i, j); x.fill();
    if (ch === ',') {   // булыжник / утоптанная земля двора
      x.strokeStyle = 'rgba(30,24,18,0.28)'; x.lineWidth = 1; const [X, Y] = P(i, j);
      x.beginPath(); x.moveTo(X - 16, Y + 8); x.lineTo(X, Y + 16); x.lineTo(X + 16, Y + 8); x.moveTo(X, Y + 16); x.lineTo(X, Y + 30); x.stroke();
    }
  }
  // кромка берега
  for (let j = 0; j < J.h; j++) for (let i = 0; i < J.w; i++) {
    if (J.rows[j][i] !== '~') continue;
    for (const [dx, dy, a, b] of [[1, 0, [1, 0], [1, 1]], [0, 1, [0, 1], [1, 1]], [-1, 0, [0, 0], [0, 1]], [0, -1, [0, 0], [1, 0]]]) {
      if (J.rows[j + dy] && J.rows[j + dy][i + dx] === '~') continue;
      const [x1, y1] = P(i + a[0], j + a[1]), [x2, y2] = P(i + b[0], j + b[1]);
      x.strokeStyle = realm === 'fjord' ? 'rgba(235,245,255,0.85)' : 'rgba(170,200,150,0.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    }
  }
  // мелкие детали: снежные искры / травинки / блики на воде
  for (let k = 0; k < J.w * J.h * 1.2; k++) {
    const i = Math.floor(rnd() * J.w), j = Math.floor(rnd() * J.h), ch = J.rows[j][i]; const [X, Y] = P(i + rnd(), j + rnd());
    if (ch === '~') { x.strokeStyle = 'rgba(210,235,255,0.22)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X - 7, Y); x.lineTo(X + 7, Y); x.stroke(); }
    else if (ch === '.') {
      if (realm === 'fjord') { x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(X, Y, 2, 1.5); if (k % 7 === 0) { x.fillStyle = 'rgba(160,185,215,0.16)'; x.beginPath(); x.ellipse(X, Y, 14 + rnd() * 12, 5 + rnd() * 3, 0, 0, 7); x.fill(); } }
      else { x.strokeStyle = `rgba(${rnd() < 0.5 ? '30,60,22' : '120,160,70'},0.5)`; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (rnd() - 0.5) * 3, Y - 4 - rnd() * 3); x.stroke(); }
    }
  }
  // настроение глубины: оттенок поверх пола
  if (M.tint) { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = M.tint; x.fillRect(0, 0, W, H); x.restore(); }
  zone.floor = { w: W, h: H, scale: 1, ox };
  zone.floorImgs = [{ im: c, cx: 0, cy: 0, w: W, h: H }];
  zone.fog = M.fog; zone.biome = { id: 'wild_' + realm, particles: M.particles, light: null };
  zone.dark = false;   // в поле светло всегда: «тёмные» глубины читаются по цвету пола и тумана, а не по чёрной маске
}
