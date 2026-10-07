// «Простор»: растягивает карту подземелья в k раз (сборка 18) — комнаты и коридоры шире, всё стоит на прежних местах относительно стен.
// Клетка новой карты берёт символ ближайшей клетки старой. Двери и печати ('D', 'G') остаются в одну клетку — остальные клетки
// их блока становятся стеной, а объект двери встаёт ровно на оставшуюся клетку. Факелы переезжают на клетку стены, смотрящую в пол.
// Масштабируются: объекты, спавны (и разброс), сюжетные точки, старт, комнаты, факелы. Вызывается до new Zone (game.js loadZone).
const SINGLE = new Set(['D', 'G']);
const SNAP = new Set(['door', 'gate', 'roomgate']);

export function widen(J, k = 1.5) {
  if (J.widened) return J;
  const W = J.w, H = J.h, W2 = Math.ceil(W * k), H2 = Math.ceil(H * k);
  // старые клетки, которые задевает новая клетка X (по одной оси): 1 или 2
  const span = (X, N) => { const a = Math.floor(X / k), b = Math.min(N - 1, Math.floor((X + 1) / k - 1e-6)); return a === b ? [a] : [a, b]; };
  const at = (x, y) => (J.rows[y] && J.rows[y][x]) || ' ';
  // пол, если задевает пол старой карты (узкий коридор становится шире); стена в 1 клетку всё равно остаётся (в ней всегда помещается целая новая клетка)
  const g = Array.from({ length: H2 }, (_, Y) => Array.from({ length: W2 }, (_, X) => {
    const cs = []; for (const y of span(Y, H)) for (const x of span(X, W)) cs.push(at(x, y));
    if (cs.some(c => SINGLE.has(c))) return '#';   // клетки дверей ставятся ниже
    return cs.includes('.') ? '.' : cs.includes('S') ? 'S' : cs.includes('#') ? '#' : ' ';
  }));
  const blockOf = (x, y) => { const out = []; for (let Y = Math.floor(y * k); Y < Math.min(H2, Math.ceil((y + 1) * k)); Y++) for (let X = Math.floor(x * k); X < Math.min(W2, Math.ceil((x + 1) * k)); X++) out.push([X, Y]); return out; };
  const center = (x, y) => [Math.min(W2 - 1, Math.floor((x + 0.5) * k)), Math.min(H2 - 1, Math.floor((y + 0.5) * k))];
  // двери и печати — одна клетка; клетки блока по оси прохода открыты (коридор не упирается в стену), поперёк — стена
  const singles = new Map(), wide = new Map();
  // сборка 47: дверь к Хранителю — на всю ширину прохода (раньше 1 клетка двери + клетка стены рядом выглядели как два кубика)
  const doorAt = new Set(J.objects.filter(o => o.t === 'door').map(o => Math.floor(o.x) + ',' + Math.floor(o.y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y); if (!SINGLE.has(c)) continue;
    const [cx, cy] = center(x, y), B = blockOf(x, y), horiz = at(x - 1, y) !== '#' && at(x + 1, y) !== '#';
    for (const [X, Y] of B) g[Y][X] = (horiz ? Y === cy : X === cx) ? '.' : '#';
    g[cy][cx] = c; singles.set(x + ',' + y, [cx, cy]);
    if (doorAt.has(x + ',' + y)) {
      const cells = B.filter(([X, Y]) => horiz ? X === cx : Y === cy); for (const [X, Y] of cells) g[Y][X] = c;
      const m = cells.reduce((a, [X, Y]) => [a[0] + X + 0.5, a[1] + Y + 0.5], [0, 0]).map(v => v / cells.length);
      wide.set(x + ',' + y, { x: m[0], y: m[1], tiles: cells.map(t => t.slice()), span: cells.length });
    }
  }
  const S = v => v * k, P = ([x, y]) => [S(x), S(y)];
  const objects = J.objects.map(o => {
    const n = { ...o, x: S(o.x), y: S(o.y) };
    if (SNAP.has(o.t)) { const s = singles.get(Math.floor(o.x) + ',' + Math.floor(o.y)); if (s) { n.x = s[0] + 0.5; n.y = s[1] + 0.5; } }
    const wd = o.t === 'door' && wide.get(Math.floor(o.x) + ',' + Math.floor(o.y)); if (wd) Object.assign(n, wd);
    return n;
  });
  const torches = (J.torches || []).map(([tx, ty]) => {
    const B = blockOf(tx, ty).filter(([X, Y]) => g[Y][X] === '#'), faces = ([X, Y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = (g[Y + dy] || [])[X + dx]; return c && c !== '#' && c !== ' '; });
    return (B.find(faces) || B[0] || center(tx, ty)).slice();
  });
  const out = {
    ...J, w: W2, h: H2, rows: g.map(r => r.join('')), objects, torches, widened: k,
    spawns: (J.spawns || []).map(s => { const n = s.slice(); n[1] = S(s[1]); n[2] = S(s[2]); if (typeof n[4] === 'number') n[4] = S(s[4]); return n; }),
    story: (J.story || []).map(s => { const n = s.slice(); n[1] = S(s[1]); n[2] = S(s[2]); return n; }),
    start: P(J.start),
    rooms: Object.fromEntries(Object.entries(J.rooms || {}).map(([id, r]) => [id, [Math.round(S(r[0])), Math.round(S(r[1])), Math.round(S(r[2])), Math.round(S(r[3]))]])),
  };
  if (J.floor) delete out.floor;
  if (out.floorN === undefined) out.floorN = 1;   // готовая картинка пола (2D) к новой карте не подходит
  return out;
}
