// Static decor of the two places: the oasis village Stillford (day) and the Sunken Ruins under it (night).
import * as X from './gfx.js';
const { THREE } = X;

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function kit() {
  const group = new THREE.Group(), circles = [], rects = [], animals = [];
  const add = (name, x, z, o = {}) => {
    const p = X.prop(name, x, z, o); if (!p) return null; group.add(p);
    const [sx, , sz] = p.userData.size;
    if (o.box) rects.push({ x0: x - o.box[0], y0: z - o.box[1], x1: x + o.box[0], y1: z + o.box[1] });
    else if (o.r !== 0) circles.push({ x, y: z, r: o.r ?? Math.min(sx, sz) * 0.4 });
    return p;
  };
  const obj = (m, x, z, o = {}) => { m.position.set(x, o.y || 0, z); if (o.rot) m.rotation.y = o.rot; group.add(m); if (o.r) circles.push({ x, y: z, r: o.r }); return m; };
  return { group, circles, rects, animals, add, obj };
}

// ================================================================ STILLFORD (oasis village, day)
export const VILLAGE = {
  w: 46, h: 46, mood: 'day', start: [23, 38],
  build() {
    seed = 11; const K = kit(), { add, obj, group } = K;
    group.add(X.ground(46, 46, 'day'));
    group.add(X.patch(23, 22, 7, 6, 0xb08a5a, 0, 0.6));            // plaza around the well
    group.add(X.patch(23, 31, 1.6, 8, 0xa88352, 0, 0.5));          // road to the south
    group.add(X.patch(15, 24, 7, 1.5, 0xa88352, 0.35, 0.45));      // to Mira
    group.add(X.patch(29, 26, 6, 1.4, 0xa88352, -0.7, 0.45));      // to Owen
    group.add(X.patch(15, 14, 7, 1.4, 0xa88352, -0.75, 0.45));     // to the old door
    group.add(X.patch(28, 16, 4, 1.3, 0xa88352, 0.6, 0.45));       // to the forge
    // oasis pond
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x2f7d8f, roughness: 0.12, metalness: 0.2, emissive: 0x0a2a33 }));
    pond.scale.set(4.2, 2.8, 1); pond.rotation.x = -Math.PI / 2; pond.position.set(8, 0.03, 32); group.add(pond); K.rects.push({ x0: 4.2, y0: 29.6, x1: 11.8, y1: 34.4 });
    group.add(X.patch(8, 32, 5.2, 3.6, 0x6f7a3a, 0, 0.55));
    for (const [x, z] of [[4.5, 29], [11.5, 29.5], [12, 35], [4.8, 35.2]]) add(['agave_b', 'grass_dry_a', 'bush_thorn_a'][Math.floor(rnd() * 3)], x, z, { r: 0.3 });
    add('tree_acacia_a', 6, 27.5, { r: 0.5 }); add('tree_acacia_c', 11, 37.5, { r: 0.6 });
    // houses
    add('bone_hall', 24, 11, { s: 0.72, box: [4.3, 3.1] });                 // the big house
    add('bone_hut_a', 8.5, 18, { s: 0.85, rot: 0.6, box: [1.3, 1.3] });     // the small house
    add('bone_hut_b', 35, 22.5, { s: 0.72, rot: -Math.PI / 2, box: [2.6, 1.7] });
    add('bone_hut_a', 15.5, 36, { s: 0.85, rot: 2.4, box: [1.3, 1.3] });
    add('bone_hut_b', 37.5, 12, { s: 0.7, rot: -0.9, box: [2.0, 2.0] });
    add('war_drum', 18.8, 11.5, { s: 0.8 }); add('bone_totem_a', 29.3, 8.4, { s: 0.8 }); add('bone_totem_b', 18.8, 8.2, { s: 0.75 });
    add('hide_rack', 10.8, 27.2, { rot: 0.4, s: 0.9, r: 0.45 }); add('clay_pots', 15.6, 27.3, { r: 0.4 }); add('clay_pots', 10.5, 21.8, { r: 0.4, rot: 1 });
    add('chest_hide', 36.5, 25.5, { r: 0.5 }); add('clay_pots', 33.5, 25.4, { r: 0.4 });
    // the forge: fire and anvil
    add('campfire', 33.2, 13.2, { s: 1.5, r: 0.55 }); obj(X.flame(0.25, 1.4), 33.2, 13.2);
    obj(X.anvil(), 31.7, 15.7, { r: 0.45, rot: 0.4 });
    // the stone of words (Owen) glow
    group.add(Object.assign(X.glowDisc(0x9a7aff, 1.5), {})); group.children[group.children.length - 1].position.set(31, 0.04, 30);
    // graves
    add('tusk_fence', 39, 35.8, { s: 0.8, rot: 0.2 }); add('bone_totem_b', 40.5, 39.5, { s: 0.7 });
    for (const [x, z, t] of [[36.5, 37.5, 0.2], [38.5, 38.5, 0.8], [36.8, 40.5, 0.5]]) obj(X.gravestone(t), x, z, { r: 0.35, rot: -0.3 });
    // the old door: ancient arch among rocks
    add('ruin_arch', 9, 8.2, { rot: Math.PI / 4, r: 0 }); K.circles.push({ x: 7.6, y: 9.6, r: 0.9 }, { x: 10.4, y: 6.8, r: 0.9 });
    add('sand_spire_b', 5, 9.5, { s: 0.9 }); add('sand_spire_a', 11.5, 4.6, { s: 0.9 }); add('ruin_column_b', 12.5, 9.8, { s: 0.7 }); add('ruin_statue', 6.8, 12.5, { s: 0.9 });
    // border: rocks and trees
    const ring = [];
    for (let i = 0; i < 46; i += 3.4) ring.push([i, 1.6], [i + 1.2, 44.4], [1.6, i + 0.8], [44.4, i]);
    for (const [x, z] of ring) { const r = rnd(); const n = r < 0.25 ? 'sand_spire_a' : r < 0.45 ? 'sand_mesa' : r < 0.6 ? 'sand_spire_c' : r < 0.8 ? 'tree_acacia_b' : 'tree_dead_desert_a'; add(n, x + (rnd() - 0.5), z + (rnd() - 0.5), { rot: rnd() * 6, s: 0.8 + rnd() * 0.4, r: 0 }); }
    // inner greenery
    for (const [x, z] of [[17, 18], [30, 19], [27.5, 34], [36, 30], [19.5, 41], [41, 18], [6, 39], [41, 27], [14, 6], [33, 5.5]]) add(rnd() < 0.7 ? 'tree_acacia_a' : 'tree_acacia_b', x, z, { rot: rnd() * 6, s: 0.75 + rnd() * 0.3, r: 0.45 });
    for (let i = 0; i < 46; i++) { const x = 4 + rnd() * 38, z = 4 + rnd() * 38; if (Math.hypot(x - 23, z - 22) < 8 || Math.abs(x - 23) < 2 && z > 22) continue; add(['grass_dry_a', 'grass_dry_b', 'flowers_desert_a', 'flowers_desert_b', 'flowers_desert_c', 'agave_a', 'bush_thorn_b', 'tumbleweed'][Math.floor(rnd() * 8)], x, z, { rot: rnd() * 6, r: 0 }); }
    for (const [x, z] of [[20, 35], [40, 33], [5.5, 22], [27, 40], [42, 8]]) add(['sand_rock_a', 'sand_rock_b', 'sand_rock_c'][Math.floor(rnd() * 3)], x, z, { rot: rnd() * 6, s: 0.9 + rnd() * 0.5 });
    return K;
  },
};
export async function villageAnimals(K) {
  const dog = await X.loadAnimal('dog_town'), cr = await X.loadAnimal('chicken_red'), cw = await X.loadAnimal('chicken_white');
  const mk = (g, h, home, range, speed) => { const a = new X.Animal(g, { h }); a.root.position.set(home[0], 0, home[1]); K.group.add(a.root); K.animals.push({ obj: a, home, range, speed }); };
  mk(dog, 0.75, [20, 26], 6, 1.6);
  mk(cr, 0.42, [12, 22], 3, 0.7); mk(cw, 0.42, [13, 21], 3, 0.7); mk(cw, 0.42, [34, 27], 3, 0.7); mk(cr, 0.42, [21, 31], 3, 0.7);
}

// ================================================================ THE SUNKEN RUINS (night), layout of the old catacombs
let rowsCache = null, torchCache = [];
export async function loadRuinRows() { if (!rowsCache) { const j = await fetch('assets/maps/catacombs.json').then(r => r.json()); rowsCache = j.rows; torchCache = j.torches || []; } return rowsCache; }
function stoneTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#5c5448'; x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
    const off = (r % 2) * 32, l = 70 + Math.random() * 40; x.fillStyle = `rgb(${l + 10},${l + 2},${l - 10})`; x.fillRect(k * 64 + off + 2, r * 32 + 2, 60, 28);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(k * 64 + off + 2, r * 32 + 26, 60, 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export const RUINS = {
  w: 64, h: 64, mood: 'night', start: [8.5, 8.6],
  build() {
    seed = 23; const K = kit(), { add, obj, group } = K; const rows = rowsCache;
    K.rows = rows;
    const gr = X.ground(64, 64, 'night'); group.add(gr);
    // floor slabs in rooms
    const slab = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95, color: 0x9a9080 });
    const fl = []; for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (rows[y][x] !== '#' && rows[y][x] !== ' ') fl.push([x, y]);
    const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 1), slab, fl.length); const M4 = new THREE.Matrix4();
    fl.forEach(([x, y], i) => { M4.makeTranslation(x + 0.5, 0.0, y + 0.5); fm.setMatrixAt(i, M4); }); fm.receiveShadow = true; group.add(fm);
    // ruined walls: short stone blocks on the edge tiles (low, so the camera sees over them)
    const wall = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.9, color: 0xb0a48e });
    const edges = [];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      if (rows[y][x] !== '#') continue; let e = false;
      for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const r = rows[y + dy]; const ch = r && r[x + dx]; if (ch && ch !== '#' && ch !== ' ') { e = true; break; } }
      if (e) edges.push([x, y]);
    }
    const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wall, edges.length);
    edges.forEach(([x, y], i) => { const h = 1.0 + ((x * 7 + y * 13) % 5) * 0.18; M4.compose(new THREE.Vector3(x + 0.5, h / 2, y + 0.5), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)); wm.setMatrixAt(i, M4); });
    wm.castShadow = true; wm.receiveShadow = true; group.add(wm);
    // wall torches (the old torch spots)
    for (const [x, y] of torchCache) {
      if (!rows[y] || rows[y][x] !== '#') continue;
      let fx = 0, fy = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rows[y + dy] && rows[y + dy][x + dx] === '.') { fx = dx; fy = dy; break; }
      obj(X.flame(1.4, 0.6), x + 0.5 + fx * 0.45, y + 0.5 + fy * 0.45);
    }
    // entry
    add('pillar', 5.5, 5.5, { h: 3, r: 0.3 }); add('pillar', 11.5, 5.5, { h: 3, r: 0.3 }); add('bones_scatter_a', 10.5, 9, { r: 0 });
    // tombs hall: giant ribs over the four tombs
    add('giant_ribs', 26.5, 7.5, { s: 0.9, r: 0, rot: Math.PI / 2 }); add('skull_pile', 26.5, 4.2, { s: 0.8 }); obj(X.flame(0.1, 0.5), 26.5, 7.5);
    // gallery columns
    for (const [x, z] of [[42.5, 6.5], [42.5, 12.5], [46.5, 6.5], [46.5, 12.5], [50.5, 6.5], [50.5, 12.5]]) add('pillar', x, z, { h: 3.4, r: 0.3 });
    // cave: rocks, dead trees, glowing crystals
    for (const [x, z] of [[6, 22], [13.5, 27], [5.5, 32.5], [12, 23]]) add(['sand_rock_a', 'sand_rock_b', 'sand_rock_c'][Math.floor(rnd() * 3)], x, z, { s: 1.2, rot: rnd() * 6 });
    add('tree_dead_desert_a', 12, 31, { s: 0.8, r: 0.3 }); add('giant_spine', 7, 27, { s: 0.8 });
    // cross hall
    for (const [x, z] of [[23, 22], [30, 22], [23, 29], [30, 29]]) add('ruin_column_a', x, z, { h: 3.2, r: 0.5 });
    obj(X.brazier(true), 26.5, 25.5, { r: 0.35 });
    // altar room
    add('ruin_statue', 43, 28.5, { s: 0.8 }); add('ruin_statue', 49, 28.5, { s: 0.8, rot: Math.PI });
    // guard room
    for (const [x, z] of [[23, 40], [32, 40], [23, 47], [32, 47]]) add('pillar', x, z, { h: 3, r: 0.3 });
    add('war_banner', 27.5, 38.8, { s: 0.8, r: 0.2 }); add('skull_pile', 22.5, 44, { s: 0.7, rot: 1.5 }); add('bones_scatter_b', 27, 44, { r: 0 });
    // the king's hall
    add('bone_portal', 49.5, 40.2, { s: 0.9, r: 0.8 }); add('giant_skull', 44, 46.5, { s: 0.6, rot: 1.2 }); add('giant_skull', 55.5, 46.5, { s: 0.6, rot: -1.8 });
    for (const [x, z] of [[44, 41], [55, 41], [44, 52], [55, 52]]) obj(X.brazier(true), x, z, { r: 0.35 });
    // secret room
    add('skull_pile', 7.2, 44, { s: 0.6 });
    return K;
  },
};
