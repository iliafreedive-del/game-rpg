// Zone: builds walls, props, lights, colliders and interactables from a level JSON.
import { GridMap } from './map.js';
import { DECOR } from '../data/upgrades.js';
import { rand } from '../core/util.js';
import { REALMS } from '../data/wild.js';

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return h; };

// sprite, collider radius (or box half extents), light
const PROP = {
  brazier: { spr: 'brazier', r: 0.3, light: { r: 5, c: [255, 150, 60], flicker: 1 } },
  bones: { spr: 'bones' }, skulls: { spr: 'skulls', r: 0.25 }, rubble: { spr: 'rubble', r: 0.3 },
  candles: { spr: 'candles', light: { r: 2.5, c: [255, 190, 110], flicker: 1 } },
  rocks: { spr: 'rocks', r: 0.35 }, barrel: { spr: 'barrel', r: 0.3 }, crate: { spr: 'crate', r: 0.35 },
  pillar: { spr: 'pillar', r: 0.38, tall: 1 },
  puddle: { spr: 'puddle', flat: 1 }, mushrooms: { spr: 'mushrooms', light: { r: 2.5, c: [90, 230, 220], flicker: 0.2 } },
  stalagmite: { spr: 'stalagmite', r: 0.3, tall: 1 }, lavarock: { spr: 'lavarock', r: 0.45, light: { r: 3, c: [255, 110, 40], flicker: 0.5 } },
  crystals: { spr: 'crystals', r: 0.3, light: { r: 3.2, c: [190, 120, 255], flicker: 0.3 } },
  banner: { spr: 'banner', r: 0.15, tall: 1 }, bookshelf: { spr: 'bookshelf', box: [0.55, 0.2] }, weapon_rack: { spr: 'weapon_rack', box: [0.6, 0.18] },
  statue: { spr: 'statue', r: 0.42, tall: 1 }, throne: { spr: 'throne', r: 0.55 }, rug: { spr: 'rug', flat: 1 }, deadroot: { spr: 'deadtree', r: 0.25, tall: 1 }, deadtree: { spr: 'deadtree', r: 0.25, tall: 1 },
  board_dungeon: { spr: 'board', r: 0.3 },
  well: { spr: 'well', r: 0.62 },
  runebed: { spr: 'runebed', r: 1.1, light: { r: 5, c: [110, 230, 255], flicker: 0.25, z: 0.8 } }, forge: { spr: 'forge', box: [0.75, 0.6], light: { r: 4, c: [255, 120, 40], flicker: 1, dx: 0, dy: 0.2 } },
  stall: { spr: 'stall', box: [0.95, 0.45] }, lamp: { spr: 'lamp', r: 0.12, tall: 1, light: { r: 5.5, c: [255, 190, 110], flicker: 0.5, z: 1.9 } },
  tree_0: { spr: 'tree_0', r: 0.3, tall: 1 }, tree_1: { spr: 'tree_1', r: 0.3, tall: 1 },
  hay: { spr: 'hay', r: 0.45 }, grave: { spr: 'grave', r: 0.2 }, fence_x: { spr: 'fence_x', box: [0.5, 0.08] }, fence_y: { spr: 'fence_y', box: [0.08, 0.5] },
  house_0: { spr: 'house_0', box: [2.85, 2.2], tall: 1 }, house_1: { spr: 'house_1', box: [3.25, 2.4], tall: 1 }, house_2: { spr: 'house_2', box: [2.95, 2.2], tall: 1 },   // под крупные 3D-дома (ART_BIBLE, раздел 7)
  fort_hall: { spr: 'house_0', box: [3.7, 1.9], tall: 1, model: 'fort_hall' }, tent: { spr: 'hay', r: 1.6, model: 'tent' }, fort_gate: { spr: 'banner', model: 'fort_gate' }, fort_tower: { spr: 'pillar', tall: 1, model: 'fort_tower' },   // постройки лагерей походов: в 3D свои модели, в 2D — запасные спрайты
  shrine: { spr: 'altar', r: 0.45, light: { r: 3, c: [190, 140, 255], flicker: 0.3 } },
};

export class Zone {
  constructor(id, json, profile) {
    this.id = id; this.json = json; this.name = json.name;
    if (id === 'town') json.walkableHash = true;
    this.map = new GridMap(json);
    this.floor = json.floor; this.dark = id !== 'town';
    this.statics = [];       // drawables {x,y,spr,flip,wall,tall,alpha}
    this.lights = [];        // {x,y,z,r,c,flicker,on}
    this.inter = [];         // interactables
    this.rooms = json.rooms || {};
    this.start = json.start;
    const W = profile.world.opened;
    if (id === 'wild') this.buildWild(json); else if (id === 'catacombs' || json.dungeon) this.buildDungeon(json, W); else this.buildTown(json, W);
  }
  addLight(x, y, o) { const L = { x: x + (o.dx || 0), y: y + (o.dy || 0), z: o.z || 1, r: o.r, c: o.c, flicker: o.flicker || 0, on: true, seed: rand() * 10 }; this.lights.push(L); return L; }
  add(d) { this.statics.push(d); return d; }
  prop(o) {
    const P = PROP[o.t]; if (!P) return null;
    const d = this.add({ x: o.x, y: o.y, spr: P.spr, tall: P.tall, flat: P.flat });
    if (P.model) { d.model = P.model; d.rot = o.rot || 0; }
    if (P.r) this.map.circles.push({ x: o.x, y: o.y, r: P.r });
    if (P.box) this.map.rects.push({ x0: o.x - P.box[0], y0: o.y - P.box[1], x1: o.x + P.box[0], y1: o.y + P.box[1] });
    if (P.light) this.addLight(o.x, o.y, P.light);
    return d;
  }
  roomAt(x, y) { for (const [k, r] of Object.entries(this.rooms)) if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) return k; return null; }

  buildDungeon(J, W) {
    const m = this.map, torch = new Set((J.torches || []).map(([x, y]) => x + ',' + y));
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = m.ch(x, y);
      if (c !== '#') continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) { const n = m.ch(x + dx, y + dy); if (n !== '#' && !(x + dx < 0 || y + dy < 0 || x + dx >= m.w || y + dy >= m.h)) { edge = true; break; } }
      if (!edge) continue;
      const isT = torch.has(x + ',' + y);
      this.add({ x: x + 0.5, y: y + 0.5, spr: isT ? 'wall_torch' : 'wall_' + (hash(x, y) % 4), wall: true });
      if (isT) {
        // light goes on the floor side of the wall
        let fx = 0, fy = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.ch(x + dx, y + dy) !== '#') { fx = dx; fy = dy; break; }
        this.addLight(x + 0.5 + fx * 0.7, y + 0.5 + fy * 0.7, { r: 5.5, c: [255, 150, 70], flicker: 1, z: 1.2 });
      }
    }
    for (const o of J.objects) {
      const id = o.id;
      switch (o.t) {
        case 'portal': case 'portal_return': {
          const hidden = o.t === 'portal_return' && !W.bossPortal;
          const d = this.add({ x: o.x, y: o.y, spr: 'portal', hidden, anim: 'portal' });
          const L = this.addLight(o.x, o.y, { r: 4.5, c: [150, 110, 255], flicker: 0.3, z: 1.2 }); L.on = !hidden;
          this.inter.push({ id: o.t === 'portal' ? 'portal_dungeon' : 'portal_return', type: 'portal', to: 'town', x: o.x, y: o.y, r: 1.6, label: 'Портал в деревню', draw: d, light: L, hidden });
          break;
        }
        case 'castle_portal': {
          const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' }); this.addLight(o.x, o.y, { r: 5, c: [255, 200, 110], flicker: 0.3, z: 1.2 });
          this.inter.push({ id: 'castle_exit', type: 'portal', to: 'town', x: o.x, y: o.y, r: 1.6, label: 'В деревню', draw: d, plate: 'В деревню' }); break;
        }
        case 'roomgate': {
          const open = !!(W.castle && W.castle[o.id]); const tx = Math.floor(o.x), ty = Math.floor(o.y);
          const flip = m.ch(tx - 1, ty) !== '#';
          const d = this.add({ x: o.x, y: o.y, spr: open ? 'door_open' : 'gate_sealed', flip, wall: true });
          if (open) m.setSolid(tx, ty, 0);
          this.inter.push({ id: 'gate_' + o.id, room: o.id, type: 'roomgate', x: o.x, y: o.y, r: 2.0, draw: d, done: open, tile: [tx, ty], panel: true, plate: null });
          break;
        }
        case 'castle_altar': case 'castle_trial': case 'castle_treasury': case 'castle_trophy': {
          const room = o.t.slice(7);
          const spr = { altar: 'altar_medallion', trial: 'gate_sealed', treasury: 'chest_rich', trophy: 'altar' }[room];
          const d = this.add({ x: o.x, y: o.y, spr }); this.map.circles.push({ x: o.x, y: o.y, r: 0.5 });
          const col = { altar: [255, 210, 90], trial: [255, 90, 70], treasury: [190, 110, 255], trophy: [120, 220, 255] }[room];
          this.addLight(o.x, o.y, { r: 4.2, c: col, flicker: 0.3, z: 1 });
          this.inter.push({ id: 'room_' + room, room, type: 'room', x: o.x, y: o.y, r: 2.3, draw: d, panel: true });
          break;
        }
        case 'socket': {
          const dec = W.castle && W.castle.decor && W.castle.decor[o.id]; const D = dec && DECOR[dec];
          const d = this.add({ x: o.x, y: o.y, spr: D ? D.spr : 'rug', hidden: !D, flat: D && D.spr === 'rug', tall: D && (D.spr === 'statue' || D.spr === 'banner') });
          this.inter.push({ id: 'socket_' + o.id, sid: o.id, room: o.room, type: 'socket', x: o.x, y: o.y, r: 0.85, draw: d, panel: true });
          break;
        }
        case 'nem_wall': {
          const d = this.add({ x: o.x, y: o.y, spr: 'banner', tall: true }); this.addLight(o.x, o.y, { r: 4, c: [255, 120, 90], flicker: 0.4, z: 1 });
          this.inter.push({ id: 'nem_wall', type: 'nemwall', x: o.x, y: o.y, r: 2.2, draw: d, panel: true, plate: o.plate }); break;
        }
        case 'castle_guide': {
          this.add({ x: o.x, y: o.y, spr: 'board' }); this.addLight(o.x, o.y, { r: 3.5, c: [255, 220, 150], flicker: 0.2, z: 1.2 });
          this.inter.push({ id: 'castle_guide', type: 'castleguide', x: o.x, y: o.y, r: 1.8, panel: true, plate: 'Карта цитадели' });
          break;
        }
        case 'chest_rich_d': this.add({ x: o.x, y: o.y, spr: 'chest_rich' }); this.map.circles.push({ x: o.x, y: o.y, r: 0.35 }); break;
        case 'sarcophagus_d': this.add({ x: o.x, y: o.y, spr: 'sarcophagus' }); this.map.rects.push({ x0: o.x - 0.45, y0: o.y - 0.9, x1: o.x + 0.45, y1: o.y + 0.9 }); break;
        case 'floor_exit': {
          const d = this.add({ x: o.x, y: o.y, spr: 'portal', hidden: !!o.hidden, anim: 'portal' });
          const L = this.addLight(o.x, o.y, { r: 4.5, c: [120, 200, 255], flicker: 0.3, z: 1.2 }); L.on = !o.hidden;
          this.inter.push({ id: 'floor_exit', type: 'exit', x: o.x, y: o.y, r: 1.6, label: 'Завершить этаж', draw: d, light: L, hidden: !!o.hidden });
          break;
        }
        case 'sarcophagus': {
          const opened = !!W[id];
          const d = this.add({ x: o.x, y: o.y, spr: opened ? 'sarcophagus_open' : 'sarcophagus' });
          this.map.rects.push({ x0: o.x - 0.45, y0: o.y - 0.9, x1: o.x + 0.45, y1: o.y + 0.9 });
          this.inter.push({ id, type: 'sarc', loot: o.loot, x: o.x, y: o.y, r: 1.6, label: 'Открыть саркофаг', draw: d, done: opened, persist: o.loot === 'key' });
          break;
        }
        case 'chest': {
          const rich = !!o.rich; const persist = rich; // rich chests are one-time story rewards; regular chests refill each descent
          const opened = persist && !!W[id];
          const d = this.add({ x: o.x, y: o.y, spr: (rich ? 'chest_rich' : 'chest') + (opened ? '_open' : '') });
          this.map.circles.push({ x: o.x, y: o.y, r: 0.35 });
          this.inter.push({ id, type: 'chest', rich, x: o.x, y: o.y, r: 1.4, label: 'Открыть сундук', draw: d, done: opened, persist });
          break;
        }
        case 'altar_medallion': {
          const taken = !!W.medallion;
          const d = this.add({ x: o.x, y: o.y, spr: taken ? 'altar' : 'altar_medallion' });
          this.map.circles.push({ x: o.x, y: o.y, r: 0.5 });
          const L = this.addLight(o.x, o.y, { r: 3, c: [255, 210, 120], flicker: 0.2 }); L.on = !taken;
          this.inter.push({ id: 'medallion', type: 'medallion', x: o.x, y: o.y, r: 1.6, label: 'Взять медальон', draw: d, done: taken, light: L });
          break;
        }
        case 'door': {
          const tx = Math.floor(o.x), ty = Math.floor(o.y), open = !!W[id];
          const flip = m.ch(tx - 1, ty) !== '#';   // corridor runs along x → rotate door
          const d = this.add({ x: o.x, y: o.y, spr: open ? 'door_open' : 'door', flip, wall: true });
          if (open) m.setSolid(tx, ty, 0);
          this.inter.push({ id, type: 'door', key: o.key, x: o.x, y: o.y, r: 1.7, label: 'Отпереть дверь', draw: d, done: open, tile: [tx, ty] });
          break;
        }
        case 'secretwall': {
          const open = !!W[id]; const tiles = [];
          for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.ch(x, y) === 'S') tiles.push([x, y]);
          const ds = tiles.map(([x, y]) => this.add({ x: x + 0.5, y: y + 0.5, spr: 'wall_3', wall: true, hidden: open }));
          if (open) tiles.forEach(([x, y]) => m.setSolid(x, y, 0));
          else tiles.forEach(([x, y]) => this.add({ x: x + 0.5, y: y + 1.2, spr: 'rubble', hidden: false, tag: id }));
          this.inter.push({ id, type: 'secret', x: o.x, y: o.y + 0.8, r: 1.6, label: 'Осмотреть трещину', draws: ds, done: open, tiles });
          break;
        }
        case 'gate': {
          const tx = Math.floor(o.x), ty = Math.floor(o.y), open = !!W.gateOpen;
          const flip = m.ch(tx - 1, ty) !== '#';
          const d = this.add({ x: o.x, y: o.y, spr: open ? 'door_open' : 'gate_sealed', flip, wall: true });
          const L = this.addLight(o.x, o.y, { r: 3.5, c: [170, 90, 255], flicker: 0.4 }); L.on = !open;
          if (open) m.setSolid(tx, ty, 0);
          this.inter.push({ id: 'gate', type: 'gate', x: o.x, y: o.y, r: 1.8, label: 'Приложить медальон', draw: d, done: open, tile: [tx, ty], light: L });
          break;
        }
        case 'board_dungeon': break;   // notice board lives only in the village
        default: this.prop(o);
      }
    }
  }

  buildTown(J, W) {
    const m = this.map;
    // border forest (collision comes from 'x' tiles)
    for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) {
      if (m.ch(x, y) !== 'x') continue;
      const inner = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.ch(X, Y) !== 'x'; });
      const hsh = hash(x, y);
      if (inner && hsh % 3 !== 0) this.add({ x: x + 0.3 + (hsh % 5) / 10, y: y + 0.3 + ((hsh >> 3) % 5) / 10, spr: hsh % 2 ? 'tree_0' : 'tree_1', tall: 1 });
      else if (!inner && hsh % 4 === 0) this.add({ x: x + 0.5, y: y + 0.5, spr: hsh % 2 ? 'tree_1' : 'tree_0', tall: 1 });
    }
    for (const o of J.objects) {
      if (o.t === 'portal') {
        const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' });
        this.addLight(o.x, o.y, { r: 5, c: [150, 110, 255], flicker: 0.3, z: 1.2 });
        this.inter.push({ id: 'portal_town', type: 'portal', to: 'catacombs', x: o.x, y: o.y, r: 1.8, label: 'Спуститься в катакомбы', draw: d, reqLevel: 1, plate: 'Катакомбы' });
        this.map.circles.push({ x: o.x, y: o.y - 0.1, r: 0.2 });
      } else if (o.t === 'survportal') {
        const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' });
        this.addLight(o.x, o.y, { r: 5, c: [255, 60, 60], flicker: 0.4, z: 1.2 });
        this.inter.push({ id: 'portal_survival', type: 'survival', x: o.x, y: o.y, r: 1.8, label: 'Жатва Бездны', draw: d, reqLevel: 5, plate: 'Жатва Бездны' });
        this.map.circles.push({ x: o.x, y: o.y - 0.1, r: 0.2 });
      } else if (o.t === 'castle') {
        const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' });
        this.addLight(o.x, o.y, { r: 5, c: [255, 200, 110], flicker: 0.3, z: 1.2 });
        this.inter.push({ id: 'portal_castle', type: 'portal', to: 'castle', x: o.x, y: o.y, r: 1.8, label: 'Цитадель Ордена', draw: d, reqLevel: 3, plate: 'Цитадель' });
        this.map.circles.push({ x: o.x, y: o.y - 0.1, r: 0.2 });
      } else if (o.t === 'wheel') {
        this.prop({ ...o, t: 'runebed' }); this.addLight(o.x, o.y, { r: 4, c: [255, 210, 90], flicker: 0.3, z: 1 });
        this.inter.push({ id: 'wheel', type: 'wheel', x: o.x, y: o.y, r: 1.9, label: 'Колесо Фортуны', plate: 'Колесо Фортуны' });
      } else if (o.t === 'hwsign') {
        const d = this.add({ x: o.x, y: o.y, spr: 'banner', model: 'chronicle', tall: 1 }); for (const sx of [-1.7, 1.7]) this.map.circles.push({ x: o.x + sx, y: o.y, r: 0.45 });
        this.addLight(o.x, o.y, { r: 5, c: [255, 200, 110], flicker: 0.3, z: 1.4 });
        this.inter.push({ id: 'herospath', type: 'herospath', x: o.x, y: o.y + 0.2, r: 2.2, label: 'Летопись битв', plate: 'Летопись битв', reqLevel: 2 });
      } else if (o.t === 'depths') {
        const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' });
        this.addLight(o.x, o.y, { r: 5, c: [120, 200, 255], flicker: 0.3, z: 1.2 });
        this.inter.push({ id: 'portal_depths', type: 'depths', x: o.x, y: o.y, r: 1.8, label: 'Глубины катакомб', draw: d, reqLevel: 6, plate: 'Глубины' });
        this.map.circles.push({ x: o.x, y: o.y - 0.1, r: 0.2 });
      } else if (o.t === 'wildportal') {
        const RL = REALMS[o.realm]; const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' });
        this.addLight(o.x, o.y, { r: 5, c: RL.portalColor, flicker: 0.3, z: 1.2 });
        this.inter.push({ id: 'portal_' + o.realm, type: 'wildportal', realm: o.realm, x: o.x, y: o.y, r: 1.8, label: RL.name, draw: d, reqLevel: RL.reqLevel, plate: RL.name });
        this.map.circles.push({ x: o.x, y: o.y - 0.1, r: 0.2 });
      } else if (o.t === 'board') {
        this.prop({ ...o, t: 'board_dungeon' });
        this.addLight(o.x, o.y, { r: 4, c: [255, 210, 110], flicker: 0.2, z: 1.2 });
        this.inter.push({ id: 'board', type: 'board', x: o.x, y: o.y, r: 2.0, label: 'Доска заданий', plate: 'Доска заданий', panel: true });
      } else if (o.t === 'shrine') {
        this.prop(o);
        this.inter.push({ id: 'shrine', type: 'shrine', x: o.x, y: o.y, r: 1.7, label: 'Святилище благословений' });
      } else this.prop(o.t === 'well' ? { ...o, t: 'runebed' } : o);
    }
    for (const n of J.npcs) {
      this.map.circles.push({ x: n.x, y: n.y, r: 0.35 });
      this.inter.push({ id: n.id, type: 'npc', npc: n, x: n.x, y: n.y, r: 2.2, label: 'Говорить: ' + n.name.split(' ')[0], panel: n.id !== 'elder' });
    }
  }

  // Открытое поле похода (Фьорды / Старый Лес): чаща по 'x', стены форта по 'D', сундуки, тайники, порталы.
  buildWild(J) {
    const m = this.map, realm = J.wild.realm, fj = realm === 'fjord';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = m.ch(x, y), h = hash(x, y);
      if (c === 'D') { this.add({ x: x + 0.5, y: y + 0.5, spr: 'wall_' + (h % 4), wall: true }); continue; }
      if (c !== 'x') continue;
      const inner = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.ch(X, Y) !== 'x'; });
      if (!inner || h % 3 === 0) continue;
      const spr = fj ? ['rocks', 'stalagmite', 'tree_1', 'rocks'][h % 4] : (h % 5 === 0 ? 'rocks' : h % 2 ? 'tree_0' : 'tree_1');
      this.add({ x: x + 0.3 + (h % 5) / 10, y: y + 0.3 + ((h >> 3) % 5) / 10, spr, tall: spr === 'rocks' ? 0 : 1 });
    }
    const col = fj ? [150, 210, 255] : [120, 230, 120];
    for (const o of J.objects) {
      switch (o.t) {
        case 'wild_home': {
          const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal' }); this.addLight(o.x, o.y, { r: 4.5, c: [150, 110, 255], flicker: 0.3, z: 1.2 });
          this.inter.push({ id: 'wild_home', type: 'portal', to: 'town', x: o.x, y: o.y, r: 1.6, label: 'Вернуться в деревню', draw: d, plate: 'В деревню' }); break;
        }
        case 'wild_next': {
          const d = this.add({ x: o.x, y: o.y, spr: 'portal', anim: 'portal', hidden: true }); const L = this.addLight(o.x, o.y, { r: 5, c: col, flicker: 0.3, z: 1.2 }); L.on = false;
          this.inter.push({ id: 'wild_next', type: 'wildnext', x: o.x, y: o.y, r: 1.7, label: 'Вглубь', draw: d, light: L, hidden: true, plate: 'Вглубь' }); break;
        }
        case 'wchest': {
          const d = this.add({ x: o.x, y: o.y, spr: o.rich ? 'chest_rich' : 'chest' }); this.map.circles.push({ x: o.x, y: o.y, r: 0.35 });
          if (o.rich) this.addLight(o.x, o.y, { r: 3, c: [255, 210, 110], flicker: 0.3, z: 0.8 });
          this.inter.push({ id: o.id, type: 'chest', rich: !!o.rich, x: o.x, y: o.y, r: 1.4, label: 'Открыть сундук', draw: d }); break;
        }
        case 'cache': {
          const d = this.add({ x: o.x, y: o.y, spr: 'altar' }); this.map.circles.push({ x: o.x, y: o.y, r: 0.4 });
          const L = this.addLight(o.x, o.y, { r: 4.5, c: [255, 210, 110], flicker: 0.25, z: 1 });
          this.inter.push({ id: o.id, type: 'cache', x: o.x, y: o.y, r: 1.6, label: 'Схрон: вынести ношу', draw: d, light: L, plate: '▣ Схрон' }); break;
        }
        case 'echo': {
          const d = this.add({ x: o.x, y: o.y, spr: 'bones' }); const L = this.addLight(o.x, o.y, { r: 3.2, c: [140, 200, 255], flicker: 0.5, z: 0.8 });
          this.inter.push({ id: o.id, type: 'echo', x: o.x, y: o.y, r: 1.4, label: o.mine ? 'Эхо вашего падения' : 'Эхо павшего', draw: d, light: L, mine: !!o.mine, lost: o.lost || 0, cls: o.cls, key: o.key, tip: o.tip, name: o.name, lvl: o.lvl, mob: o.mob, dir: o.dir }); break;
        }
        case 'stash': {
          const d = this.add({ x: o.x, y: o.y, spr: o.kind }); this.map.circles.push({ x: o.x, y: o.y, r: 0.3 });
          this.inter.push({ id: o.id, type: 'stash', x: o.x, y: o.y, r: 1.3, label: 'Обыскать', draw: d }); break;
        }
        default: this.prop(o);
      }
    }
  }
}
