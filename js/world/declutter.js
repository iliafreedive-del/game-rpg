// Сборка 47: предметы не входят друг в друга и в стены (сундук в колонне, жаровня в знамени, статуя в стене).
// Радиус — видимый след модели на полу (м). Важное (сундуки, саркофаги, порталы, двери) стоит на месте;
// мелочь, которая наползла на важное или на стену, сдвигается на ближайшее свободное место (до 1,6 м), иначе убирается (так и колонна, вставшая на место сундука).
const R = {
  pillar: 0.6, brazier: 0.45, barrel: 0.4, crate: 0.45, barrel_stack: 1.1, plank_pile: 1.35, log_stack: 1.3, cart: 1.1, cart_load: 1.1, signpost: 0.3,
  chest: 0.6, chest_rich_d: 0.65, wchest: 0.7, stash: 0.85, cache: 0.85, sarcophagus: 1.1, sarcophagus_d: 1.1, statue: 0.6, banner: 0.35, candles: 0.3,
  skulls: 0.35, bones: 0.35, rubble: 0.5, stalagmite: 0.45, mushrooms: 0.3, rocks: 0.5, altar_medallion: 0.9, castle_altar: 0.9, castle_trophy: 0.8,
  castle_treasury: 0.8, castle_trial: 0.8, castle_guide: 0.5, bonfire: 0.7, bone_totem: 0.5, hide_rack: 0.8, war_banner: 0.4, crystals: 0.4,
};
// не двигаются: то, у чего есть место по сюжету или что ведёт дальше
const FIXED = new Set(['portal', 'portal_return', 'castle_portal', 'floor_exit', 'wild_home', 'wild_next', 'door', 'gate', 'roomgate', 'socket', 'nem_wall', 'echo',
  'chest', 'chest_rich_d', 'wchest', 'sarcophagus', 'sarcophagus_d', 'altar_medallion', 'castle_altar', 'castle_trophy', 'castle_treasury', 'castle_trial', 'castle_guide', 'board_dungeon']);
const FIXED_R = 0.7;
const STAY = new Set(['stash', 'cache']);   // тайники двигаются, но не пропадают   // след неподвижных без своего радиуса (порталы, двери)

/** J — карта зоны (rows, objects); solidCh — символы стен. Меняет J.objects на месте, возвращает число сдвинутых/убранных. */
export function declutter(J, solidCh = '# SDG', skip = null) {
  const rows = J.rows, wall = (x, y) => { const r = rows[Math.floor(y)]; const c = r ? r[Math.floor(x)] : undefined; return c === undefined || solidCh.includes(c); };
  const rOf = o => (skip && skip.has(o.t)) ? 0 : R[o.t] ?? (FIXED.has(o.t) ? FIXED_R : 0);
  // от центра до ближайшей стены (по клеткам вокруг), м
  const wallGap = (x, y, r) => { let g = 9; for (let ty = Math.floor(y - r - 1); ty <= y + r + 1; ty++) for (let tx = Math.floor(x - r - 1); tx <= x + r + 1; tx++) if (wall(tx + 0.5, ty + 0.5)) g = Math.min(g, Math.hypot(Math.max(tx - x, 0, x - tx - 1), Math.max(ty - y, 0, y - ty - 1))); return g; };
  const placed = [], out = []; let fixed = 0;
  const ok = (o, x, y, r) => wallGap(x, y, r) >= r * 0.85 && placed.every(p => Math.hypot(p.x - x, p.y - y) >= (p.r + r) * 0.9);
  const order = J.objects.map((o, i) => ({ o, i, r: rOf(o), fix: FIXED.has(o.t) })).sort((a, b) => (b.fix - a.fix) || (b.r - a.r) || (a.i - b.i));
  for (const it of order) {
    const { o, r } = it;
    if (!r || it.fix) { if (r) placed.push({ x: o.x, y: o.y, r }); out.push(it); continue; }
    if (ok(o, o.x, o.y, r)) { placed.push({ x: o.x, y: o.y, r }); out.push(it); continue; }
    let best = null;
    for (let d = 0.25; d <= 1.6 && !best; d += 0.25) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d; if (!wall(x, y) && ok(o, x, y, r)) { best = [x, y]; break; } }
    fixed++;
    if (best) { o.x = +best[0].toFixed(2); o.y = +best[1].toFixed(2); placed.push({ x: o.x, y: o.y, r }); out.push(it); }
    else if (STAY.has(o.t)) { placed.push({ x: o.x, y: o.y, r }); out.push(it); }
  }
  J.objects = out.sort((a, b) => a.i - b.i).map(it => it.o);
  return fixed;
}
