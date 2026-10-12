// Облики (сборка 59): что открыто и что надето. Только вид — на силу не влияет.
// Сохранение — P.cosm: { own: { 'look:blood': 1, 'dye:a:crimson': 1, 'model:warrior_vanguard': 1, 'ghost:hero': 1, 'ghost:pet': 1 },
//   wear: { warrior: { look, dye: { a, b, c } | null, model, ghost } }, petGhost, petSkin: { fennec: 'snow' }, ads: { ключ: { n, t0 } } }.
// Вид рисует renderer3d (heroLook / petLook ниже — что передать в toon.applyLook).
import { G, bus } from './ctx.js';
import { HERO_LOOKS, DYES, HERO_MODELS, GHOST, DYE_PRICE, MODEL_PRICE, PET_SKINS, PET_SKIN_GET } from '../data/cosmetics.js';

const DAY = 864e5;
export function cosmOf(P = G.profile) {
  const C = P.cosm || (P.cosm = {});
  C.own = C.own || {}; C.wear = C.wear || {}; C.ads = C.ads || {};
  return C;
}
export function wearOf(P = G.profile) {
  const C = cosmOf(P), cls = P.cls || 'warrior';
  const w = C.wear[cls] || (C.wear[cls] = { look: 'base', dye: null, model: null, ghost: false });
  if (!HERO_LOOKS[w.look]) w.look = 'base';
  if (w.model && !(HERO_MODELS[cls] || {})[w.model]) w.model = null;
  return w;
}
// что открыто: облик без цены и исходные краски — всегда
export const owns = (key, P = G.profile) => !!cosmOf(P).own[key];
export function lookOwned(id) { const L = HERO_LOOKS[id]; return !!L && (!L.get || owns('look:' + id)); }
export const dyeOwned = (part, id) => DYES[part][id] && (DYES[part][id][1] == null || owns(`dye:${part}:${id}`));
export const modelOwned = (cls, id) => Object.keys(HERO_MODELS[cls] || {})[0] === id || owns('model:' + id);

// цвета для шейдера: свои краски поверх готового облика (краска null — оставить как в облике)
export function heroLook(P = G.profile) {
  const w = wearOf(P), base = HERO_LOOKS[w.look].look;
  let L = base ? { ...base } : {};
  if (w.dye) for (const k of ['a', 'b', 'c']) { const d = w.dye[k] && DYES[k][w.dye[k]]; if (d) L[k] = d[1]; }
  if (w.ghost && owns('ghost:hero', P)) L.ghost = true;
  return Object.keys(L).length ? L : null;
}
export function heroModel(P = G.profile) { const w = wearOf(P); return w.model && modelOwned(P.cls || 'warrior', w.model) ? w.model : null; }
export const petGhost = (P = G.profile) => !!(cosmOf(P).petGhost && owns('ghost:pet', P));
// облик питомца (P.cosm.petSkin: { id питомца: облик }) + призрак — что передать в applyLook
export const petSkinOwned = (pet, id) => !!(PET_SKINS[pet] && PET_SKINS[pet][id]) && owns(`pskin:${pet}:${id}`);
export function petSkinOf(pet, P = G.profile) { const id = (cosmOf(P).petSkin || {})[pet]; return id && petSkinOwned(pet, id) ? id : null; }
export function petLook(pet, P = G.profile) {
  const id = petSkinOf(pet, P), L = id ? { ...PET_SKINS[pet][id][1] } : {};
  if (petGhost(P)) L.ghost = true;
  return Object.keys(L).length ? L : null;
}
// ключ вида: renderer3d сравнивает его и перекрашивает только при смене
export const lookKey = (P = G.profile) => JSON.stringify([heroLook(P), heroModel(P), petGhost(P)]);

// ---------------------------------------------------------------- открыть
function spend(n) { const P = G.profile; if ((P.shards || 0) < n) { bus.emit('sfx', 'deny'); bus.emit('toast', { text: `Нужно ${n}◆ осколков Бездны`, sub: 'Осколки дают стражи, боссы, чемпионы, сундуки и недельные задания', kind: 'warn' }); return false; } P.shards -= n; return true; }
function grant(key, title) { cosmOf().own[key] = 1; bus.emit('toast', { text: 'Облик открыт', sub: title, kind: 'quest' }); bus.emit('sfx', 'rareDrop'); bus.emit('hud'); bus.emit('save'); bus.emit('cosm'); }
export function buyLook(id) { const L = HERO_LOOKS[id]; if (!L || !L.get || !L.get.shards || lookOwned(id) || !spend(L.get.shards)) return false; grant('look:' + id, L.name); wear({ look: id, dye: null }); return true; }
export function buyDye(part, id) { const d = DYES[part][id]; if (!d || dyeOwned(part, id) || !spend(DYE_PRICE)) return false; grant(`dye:${part}:${id}`, 'Краска «' + d[0] + '»'); return true; }
export function buyPetSkin(pet, id) { const S = PET_SKINS[pet] && PET_SKINS[pet][id], g = PET_SKIN_GET(id); if (!S || !g.shards || petSkinOwned(pet, id) || !spend(g.shards)) return false; grant(`pskin:${pet}:${id}`, S[0]); setPetSkin(pet, id); return true; }
export function buyModel(cls, id) { if (modelOwned(cls, id) || !spend(MODEL_PRICE)) return false; grant('model:' + id, HERO_MODELS[cls][id]); wear({ model: id }); return true; }

// реклама вместо покупки: get.ads просмотров за get.days дней, иначе прогресс сгорает
export function adProgress(key, get) {
  const a = cosmOf().ads[key]; if (!a) return { n: 0, left: get.days || 7 };
  const left = Math.ceil(((a.t0 + (get.days || 7) * DAY) - Date.now()) / DAY);
  if (left <= 0) { delete cosmOf().ads[key]; return { n: 0, left: get.days || 7 }; }
  return { n: a.n, left };
}
export async function watchFor(key, get, title) {
  const C = cosmOf(), p = adProgress(key, get), { watchRewarded, offerToken } = await import('../platform/monetize.js');   // лениво: рендер тоже читает этот файл
  return watchRewarded('cosm', offerToken('cosm', `${key}:${p.n}:${C.ads[key] ? C.ads[key].t0 : Date.now()}`), () => {
    const a = C.ads[key] || (C.ads[key] = { n: 0, t0: Date.now() }); a.n++;
    if (a.n >= get.ads) { delete C.ads[key]; grant(key, title); }
    else bus.emit('toast', { text: `${title}: ${a.n} из ${get.ads}`, sub: 'Реклама засчитана', kind: 'good' });
    bus.emit('cosm');
  });
}

// ---------------------------------------------------------------- надеть
export function wear(ch) { Object.assign(wearOf(), ch); bus.emit('cosm'); bus.emit('save'); }
export function setDye(part, id) { const w = wearOf(); w.dye = { ...(w.dye || {}), [part]: id }; bus.emit('cosm'); bus.emit('save'); }
export function setPetSkin(pet, id) { const C = cosmOf(); C.petSkin = { ...(C.petSkin || {}), [pet]: id }; bus.emit('cosm'); bus.emit('save'); }
export function setPetGhost(on) { cosmOf().petGhost = !!on; bus.emit('cosm'); bus.emit('save'); }
