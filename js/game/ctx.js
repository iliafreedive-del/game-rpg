// Shared game context. Systems communicate through the event bus to stay decoupled.
import { Camera } from '../core/iso.js';

const handlers = new Map();
export const bus = {
  on(ev, fn) { if (!handlers.has(ev)) handlers.set(ev, new Set()); handlers.get(ev).add(fn); return () => handlers.get(ev).delete(fn); },
  emit(ev, data) { const h = handlers.get(ev); if (h) for (const fn of [...h]) { try { fn(data); } catch (e) { console.error(ev, e); } } },
};

export const G = {
  profile: null,          // save data (see save.js)
  zone: null,             // current Zone
  zoneId: 'town',
  cam: new Camera(),
  player: null,
  enemies: [], projectiles: [], pickups: [], effects: [], texts: [], particles: [],
  time: 0, dt: 0, paused: false, modal: null,
  fps: 60, debug: false,
  stats: null,            // derived stats cache (recomputed on gear/attr/skill change)
  lastCombat: -99,        // time of last combat action (ads never shown shortly after)
};
export const inCombat = () => G.time - G.lastCombat < 4;
