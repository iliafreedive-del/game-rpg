// Подземелье в 3D: пол из каменных плит (рисованная текстура flagTex, грязь и мох шумом, затенение у стен) и расстановка
// стен по тайлам карты. Стены и предметы рисует слой окружения (props.js), здесь — только пол и список кусков стен.
// Правило Torchlight: стены, которые закрывают пол от камеры (пол у них со стороны −x/−z), обрезаны низко,
// дальние стены (пол со стороны +x/+z, к камере) — в полную высоту.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import { noiseTex, flagTex } from './textures.js';

const isVoid = c => c === ' ' || c === undefined;
const isWall = c => c === '#';

function floorMaterial(look) {
  const m = toon(0xffffff, { vc: true, rim: 0.05 });
  const T = { tNoise: { value: noiseTex() }, tFlag: { value: flagTex() }, uFloor: { value: new THREE.Color(look.floor) }, uGrime: { value: new THREE.Color(look.grime) }, uMoss: { value: new THREE.Color(look.moss) } };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    prev(sh); Object.assign(sh.uniforms, T);
    sh.vertexShader = 'attribute float aEdge; varying float vEdge; varying vec2 vGW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge; vGW = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D tNoise, tFlag; uniform vec3 uFloor, uGrime, uMoss; varying float vEdge; varying vec2 vGW;\n' + sh.fragmentShader.replace('#include <color_fragment>', /* glsl */`
#include <color_fragment>
{
  vec2 wp = vGW;
  float f = texture2D(tFlag, wp * 0.4).r;
  vec4 nz = texture2D(tNoise, wp * 0.045), nz2 = texture2D(tNoise, wp * 0.17 + 0.3);
  vec3 col = uFloor * (0.45 + f * 1.1) * (0.85 + nz.g * 0.3);
  col = mix(col, uGrime * (0.6 + f * 0.6), smoothstep(0.45, 0.8, nz.r + vEdge * 0.35) * 0.75);   // грязь пятнами и к стенам
  col = mix(col, uMoss * (0.6 + f * 0.6), smoothstep(0.62, 0.85, nz2.b + vEdge * 0.25) * 0.55);   // мох в щелях у стен
  col *= 1.0 - vEdge * 0.42;                                                                       // тень у основания стен
  diffuseColor.rgb = col * diffuseColor.rgb;
}`);
  };
  m.customProgramCacheKey = () => 'dfloor';
  return m;
}

export function buildDungeonFloor(scene, zone, look) {
  const m = zone.map, W = m.w, H = m.h;
  const P = [], E = [], C = [], I = [], idx = new Map();
  // вес «у стены» в узле сетки: сколько из 4 соседних клеток — стены
  const edgeAt = (x, y) => { let n = 0; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (isWall(m.ch(x + dx, y + dy))) n++; return Math.min(1, n * 0.5); };
  const vert = (x, y) => { const k = y * (W + 1) + x; if (idx.has(k)) return idx.get(k); const i = P.length / 3; P.push(x, 0, y); E.push(edgeAt(x, y)); C.push(1, 1, 1, 1); idx.set(k, i); return i; };
  const open = (x, y) => { const c = m.ch(x, y); return !isVoid(c) && !isWall(c); };
  const nearOpen = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (open(x + dx, y + dy)) return true; return false; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m.ch(x, y);
    if (isVoid(c) || (isWall(c) && !nearOpen(x, y))) continue;   // пол — под проходимыми клетками и под стенами, но не под толщей скалы
    const a = vert(x, y), b = vert(x + 1, y), c2 = vert(x, y + 1), d = vert(x + 1, y + 1);
    I.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(E, 1)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
  geo.setIndex(I); geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, floorMaterial(look)); floor.receiveShadow = true; floor.userData.noOutline = true; scene.add(floor);
  return {
    grassU: null,
    setQuality() { }, lod() { }, update() { }, shadow() { },
    dispose() { floor.removeFromParent(); geo.dispose(); },
  };
}

// куски стен: { id, x, y, rot } — id 'dwall_hi' (дальняя, в полный рост) или 'dwall_lo' (ближняя, обрезанная), rot — к полу лицом (+z модели)
export function wallPieces(zone) {
  const m = zone.map, out = [];
  const floorish = (x, y) => { const c = m.ch(x, y); return !isVoid(c) && !isWall(c); };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!isWall(m.ch(x, y))) continue;
    // соседний пол по 4 сторонам (и по диагоналям — для углов)
    const toward = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => floorish(x + dx, y + dy));
    const diag = [[1, 1], [-1, 1], [1, -1], [-1, -1]].filter(([dx, dy]) => floorish(x + dx, y + dy));
    if (!toward.length && !diag.length) continue;
    // дальняя стена — если пол с её стороны, обращённой к камере (+x или +z)
    const far = toward.some(([dx, dy]) => dx > 0 || dy > 0) || (!toward.length && diag.some(([dx, dy]) => dx > 0 && dy > 0));
    const [fx, fy] = toward[0] || diag[0];
    const rot = Math.atan2(fx, fy);   // +z модели смотрит на пол
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    out.push({ id: far ? 'dwall_hi' : 'dwall_lo', x: x + 0.5, y: y + 0.5, rot, v: (h % 1000) / 1000 });
  }
  return out;
}
