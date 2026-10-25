// Resource manager: images, JSON, sprite atlases; grouped lazy loading with progress.
const images = new Map(), jsons = new Map(), atlases = new Map();
let base = 'assets/';
export function setBase(b) { base = b; }

export function loadImage(path) {
  if (images.has(path)) return images.get(path);
  const p = new Promise((res, rej) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + path));
    im.src = base + path;
  });
  images.set(path, p); return p;
}
export async function loadJSON(path) {
  if (jsons.has(path)) return jsons.get(path);
  const p = fetch(base + path, { cache: 'force-cache' }).then(r => { if (!r.ok) throw new Error('json ' + path); return r.json(); });
  jsons.set(path, p); return p;
}
export class Atlas {
  constructor(name, meta, sheets) { this.name = name; this.meta = meta; this.sheets = sheets; this.frames = meta.frames; this.ppm = meta.ppm; this.clips = meta.clips || {}; this.dirs = meta.dirs; this.mirror = !!meta.mirror; }
  get(n) { return this.frames[n]; }
  has(n) { return n in this.frames; }
}
export async function loadAtlas(name) {
  if (atlases.has(name)) return atlases.get(name);
  const p = (async () => {
    const meta = await loadJSON('sprites/' + name + '.json');
    const sheets = await Promise.all(meta.sheets.map(s => loadImage('sprites/' + s)));
    return new Atlas(name, meta, sheets);
  })();
  atlases.set(name, p); return p;
}
export const atlas = name => atlases.get(name);   // promise
// сборка 75: атлас «сначала разметка» — готов (getAtlas), как только пришёл его json (кадры, длины клипов). Листы качаются потом —
// после входа в мир (releaseLite) или через 25 с: в 3D листы героя и мобов нужны лишь запасному 2D, а вход в мир ждал их (≈3 МБ)
// и делил с ними канал. Пока лист не пришёл, на его месте пустой холст 1×1 — drawFrame просто ничего не рисует.
// atlas(name)/loadGroup по-прежнему ждут листы целиком (wildmem копирует пиксели)
const liteQ = []; let liteGo = false;
export function releaseLite() { liteGo = true; for (const f of liteQ.splice(0)) f(); }
setTimeout(releaseLite, 25000);
function loadAtlasLite(name) {
  if (ready.has(name)) return Promise.resolve(ready.get(name));
  if (atlases.has(name)) return atlases.get(name);   // уже качается целиком — ждём, как раньше
  let full;
  const meta = loadJSON('sprites/' + name + '.json').then(meta => {
    const els = meta.sheets.map(() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c; });
    const A = new Atlas(name, meta, els); ready.set(name, A);
    full = Promise.all(meta.sheets.map((s, i) => {
      const pr = new Promise(res => { liteGo ? res() : liteQ.push(res); }).then(() => loadImage('sprites/' + s)).then(im => { els[i] = im; return im; });
      return pr;
    })).then(() => A); full.catch(() => { });
    return A;
  });
  atlases.set(name, meta.then(() => full));
  return meta;
}
export function loadGroupLite(names) { return Promise.all(names.map(n => loadAtlasLite(n).catch(e => { console.warn('atlas failed', n, e.message); return null; }))); }
const ready = new Map();
export function getAtlas(name) { return ready.get(name); }
export function putAtlas(name, A) { ready.set(name, A); atlases.set(name, Promise.resolve(A)); }   // runtime-derived atlases (recoloured/rescaled sprites)
export async function loadGroup(names, onProgress) {
  let done = 0;
  const all = names.map(n => loadAtlas(n).then(a => { ready.set(n, a); onProgress && onProgress(++done / names.length, n); return a; }, e => { console.warn('atlas failed', n, e.message); onProgress && onProgress(++done / names.length, n); return null; }));
  return Promise.all(all);
}
// Draw an atlas frame with its anchor at (x,y). scale = screen px per sprite px.
export function drawFrame(ctx, A, name, x, y, scale, flip = false, alpha = 1) {
  const f = A.frames[name]; if (!f) return false;
  const [si, sx, sy, w, h, ax, ay] = f; const img = A.sheets[si];
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, w, h, -ax * scale, -ay * scale, w * scale, h * scale); ctx.restore();
  } else ctx.drawImage(img, sx, sy, w, h, x - ax * scale, y - ay * scale, w * scale, h * scale);
  if (alpha !== 1) ctx.globalAlpha = 1;
  return true;
}
