// 300 раскладок: все сюжетные вещи на месте, достижимы со старта (двери/печать открыты), алтарь и арена — только через дверь/печать
// Запуск: node tools/qa/cata_layouts.mjs [N=300] — проверка генератора катакомб (П30) без браузера
const { generateCatacombs } = await import(new URL('../../js/world/floorgen.js', import.meta.url));
const N = +(process.argv[2] || 300); let bad = 0; const sig = new Set(), kinds = new Set();
const need = ['portal', 'portal_return', 'altar_medallion', 'door', 'gate'], needId = ['c_entry', 'c_oss', 'c_alt', 'c_gal', 'c_cave', 'c_secret', 'c_guard', 'c_hall', 'sarc0', 'sarc1', 'sarc2', 'sarc3', 'sarc4', 'medallion', 'door_altar', 'gate'];
const NAMES = ['entry', 'ossuary', 'gallery', 'cave', 'cross', 'altar', 'secret', 'guard', 'arena', 'crypt', 'hall'];
let fracs = [], stashN = [99, 0], sarc = [99, 0], keyRooms = {}; let t0 = Date.now(), skelMin = 1e9, mobs = [0, 1e9];
for (let s = 0; s < N; s++) {
  const J = generateCatacombs(s * 7919 + 13); const err = [];
  if (!J) { bad++; console.log('null', s); continue; }
  const W = J.w, H = J.h, ch = (x, y) => (J.rows[y] || '')[x];
  for (const t of need) if (!J.objects.some(o => o.t === t)) err.push('no ' + t);
  for (const id of needId) if (J.objects.filter(o => o.id === id).length !== 1) err.push('id ' + id);
  for (const n of NAMES) if (!J.rooms[n]) err.push('room ' + n);
  if (Object.keys(J.rooms).length !== 21) err.push('rooms ' + Object.keys(J.rooms).length);
  if (J.objects.find(o => o.id === 'sarc3').loot !== 'key') err.push('key');
  const flood = open => { const seen = new Uint8Array(W * H), q = [Math.floor(J.start[1]) * W + Math.floor(J.start[0])]; seen[q[0]] = 1;
    for (let k = 0; k < q.length; k++) { const c = q[k], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, c2 = ch(X, Y); if (!c2 || seen[Y * W + X] || !(c2 === '.' || open.includes(c2))) continue; seen[Y * W + X] = 1; q.push(Y * W + X); } } return seen; };
  const all = flood('DG'), shut = flood('');
  const at = (S, x, y) => S[Math.floor(y) * W + Math.floor(x)];
  const nearOk = (S, x, y, r = 1.2) => { for (let dy = -r; dy <= r; dy += 0.5) for (let dx = -r; dx <= r; dx += 0.5) if (at(S, x + dx, y + dy)) return true; return false; };
  for (const o of J.objects) if (o.id || o.t === 'portal' || o.t === 'portal_return') { if (!nearOk(all, o.x, o.y)) err.push('unreach ' + (o.id || o.t)); }
  let tot = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ch(x, y) === '.' && !all[y * W + x]) tot++; if (tot) err.push('islands ' + tot);
  // без двери и печати: ключ, вход, все сундуки кроме алтаря — доступны; амулет и арена — нет
  for (const id of ['sarc3', 'c_entry', 'c_oss', 'c_gal', 'c_cave', 'c_secret', 'c_guard', 'c_hall']) { const o = J.objects.find(o => o.id === id); if (!nearOk(shut, o.x, o.y)) err.push('locked ' + id); }
  for (const id of ['medallion', 'c_alt']) { const o = J.objects.find(o => o.id === id); if (nearOk(shut, o.x, o.y, 0.4)) err.push('open ' + id); }
  const [ex, ey] = J.story[0], [, bx, by] = J.story[1]; if (at(shut, J.story[0][1], J.story[0][2]) || at(shut, bx, by)) err.push('elite/boss reachable w/o door');
  if (!at(all, J.story[0][1], J.story[0][2]) || !at(all, bx, by)) err.push('elite/boss unreachable');
  const inR = (n, x, y) => { const r = J.rooms[n]; return x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]; };
  if (!inR('altar', J.story[0][1], J.story[0][2]) || !inR('arena', bx, by)) err.push('story room');
  const d = J.objects.find(o => o.id === 'door_altar'), g = J.objects.find(o => o.id === 'gate');
  if (!(d.x > J.rooms.hall[0] + J.rooms.hall[2] && d.x < J.rooms.altar[0])) err.push('door not east of hall');
  if (!(g.x > J.rooms.guard[0] + J.rooms.guard[2] && g.x < J.rooms.arena[0])) err.push('gate not east of guard');
  for (const s of J.spawns) if (!at(all, s[1], s[2])) err.push('spawn ' + s[0]);
  const sk = J.spawns.filter(s => /^skel|bone_wolf/.test(s[0]) && !inR('altar', s[1], s[2])).reduce((a, s) => a + s[3], 0); skelMin = Math.min(skelMin, sk);
  const m = J.spawns.reduce((a, s) => a + s[3], 0); mobs = [Math.max(mobs[0], m), Math.min(mobs[1], m)];
  const sar = J.objects.filter(o => o.t === 'sarcophagus'); sarc = [Math.min(sarc[0], sar.length), Math.max(sarc[1], sar.length)]; if (sar.length < 8 || sar.length > 12) err.push('sarcs ' + sar.length);
  if (sar.filter(o => o.loot === 'key').length !== 1) err.push('keys');
  { const k = sar.find(o => o.loot === 'key'), rn = Object.keys(J.rooms).find(n => inR(n, k.x, k.y)); keyRooms[rn] = (keyRooms[rn] || 0) + 1; if (['entry', 'hall', 'guard', 'altar', 'arena'].includes(rn) || !rn) err.push('key in ' + rn);
    // путь от входа до ключа короче пути до двери Алтаря и до печати
    const D = new Int32Array(W * H).fill(-1), q = [Math.floor(J.start[1]) * W + Math.floor(J.start[0])]; D[q[0]] = 0;
    for (let i = 0; i < q.length; i++) { const c = q[i], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, c2 = ch(X, Y); if (!c2 || D[Y * W + X] >= 0 || !'.DG'.includes(c2)) continue; D[Y * W + X] = D[c] + 1; q.push(Y * W + X); } }
    const dAt = o => { let b = 1e9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = D[(Math.floor(o.y) + dy) * W + Math.floor(o.x) + dx]; if (v >= 0) b = Math.min(b, v); } return b; };
    const fr = dAt(k) / Math.max(dAt(J.objects.find(o => o.id === 'gate')), dAt(J.objects.find(o => o.id === 'door_altar'))); fracs.push(fr); }
  // тайники (бочки/ящики): достижимы со старта, стоят на полу, не у прохода, не впритык к другой обстановке
  const st = J.objects.filter(o => o.t === 'stash'); stashN = [Math.min(stashN[0], st.length), Math.max(stashN[1], st.length)];
  for (const o of st) { if (ch(Math.floor(o.x), Math.floor(o.y)) !== '.' || !nearOk(shut, o.x, o.y)) err.push('stash ' + o.id); if (J.objects.some(p => p !== o && Math.hypot(p.x - o.x, p.y - o.y) < 1.0)) err.push('stash crowd ' + o.id); }
  J.roomKinds.forEach(k => kinds.add(k)); sig.add(J.rows.join(''));
  if (err.length) { bad++; if (bad < 6) console.log('seed', s, err.join(', ')); }
}
fracs.sort((a, b) => a - b); console.log('share >0.8', (fracs.filter(f => f > 0.8).length / fracs.length).toFixed(2), '<0.25', (fracs.filter(f => f < 0.25).length / fracs.length).toFixed(2)); console.log('key path / farthest-gate path: min', fracs[0].toFixed(2), 'median', fracs[fracs.length >> 1].toFixed(2), 'max', fracs.at(-1).toFixed(2)); console.log('stashes min/max', stashN, 'sarcophagi min/max', sarc, 'key rooms', JSON.stringify(keyRooms)); console.log('layouts', N, 'bad', bad, 'unique', sig.size, 'skeletons min', skelMin, 'mobs max/min', mobs, 'kinds', [...kinds].join(','), 'ms/layout', ((Date.now() - t0) / N).toFixed(1));
// тупики: у тайника, алтаря и арены ровно один проход
let deg = 0;
for (let s = 0; s < N; s++) { const J = generateCatacombs(s * 7919 + 13), ch = (x, y) => (J.rows[y] || '')[x];
  for (const n of ['secret', 'altar', 'arena']) { const [x0, y0, w, h] = J.rooms[n]; let runs = 0, prev = false;
    const ring = []; for (let x = x0; x < x0 + w; x++) ring.push([x, y0 - 1]); for (let y = y0; y < y0 + h; y++) ring.push([x0 + w, y]); for (let x = x0 + w - 1; x >= x0; x--) ring.push([x, y0 + h]); for (let y = y0 + h - 1; y >= y0; y--) ring.push([x0 - 1, y]);
    for (const [x, y] of ring) { const o = ch(x, y) !== '#'; if (o && !prev) runs++; prev = o; }
    if (runs !== 1 && !(n !== 'secret' && runs === 1)) { deg++; if (deg < 4) console.log('seed', s, n, 'mouths', runs); } } }
console.log('dead-end violations', deg);
