// правки 5: «ничего не висит над обрывом». На островах походов земля есть только на клетках карты, кроме 'v' и 'h' (пропасть).
// Пятно предмета — круг радиуса r (ствол с корнями, основание скалы): центр, 8 точек по краю и 8 на полпути должны стоять на земле.
// fit — сдвинуть внутрь острова до 1,5 м; не вышло — null (предмет не ставится). Общая для логики (zone.js) и 3D-декора (props.js)
export const voidAt = (m, x, y) => { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true; const c = m.ch(tx, ty); return c === 'v' || c === 'h'; };
export function onGround(m, x, y, r) {
  if (voidAt(m, x, y)) return false;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); if (voidAt(m, x + c * r, y + s * r) || voidAt(m, x + c * r * 0.5, y + s * r * 0.5)) return false; }
  return true;
}
export function fit(m, x, y, r, ok = null) {   // ok(x, y) — где ещё можно стоять центру (деревья чащи — только на клетках чащи 'x')
  if (onGround(m, x, y, r)) return [x, y];
  for (let d = 0.3; d <= 1.5; d += 0.3) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d; if (onGround(m, nx, ny, r) && (!ok || ok(nx, ny))) return [nx, ny]; }
  return null;
}
// радиус пятна по виду предмета: скалы-столбы и утёсы шире, деревья и камни — средние, мелочь — узкая
export const footOf = (id, s = 1) => (/spire|mesa|tooth|crag|peak|pillar|longship|ruin/.test(id) ? 0.95 : /tree|acacia|rock|stone|boulder|slab|ledge|shard|chunk|block|pine|spruce|birch|oak|fir/.test(id) ? 0.65 : 0.35) * s + 0.1;
// правки 72: «сундук в скале» — то, что подбирают (сундук, тайник-бочка/ящик, схрон), не стоит внутри скалы, дерева, корабля.
// PICK_R — пятно подбираемого предмета (м, тип объекта карты); SOLID_RE — что в него не должно врастать (zone.js и 3D-декор props.js)
export const PICK_R = { wchest: 0.7, chest: 0.6, chest_rich_d: 0.65, stash: 0.5, cache: 0.6 };
export const SOLID_RE = /tree|rock|bush|fern|spire|tooth|mesa|agave|stalag|crystal|mushroom|crag|stone|boulder|slab|menhir|stump|longship|boat|ruin/;
