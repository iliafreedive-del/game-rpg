// Питомец из Meshy (сборка 60, tools/art/pet_meshy.py → assets/models/pet_<id>.*): свой лёгкий скелет в анатомических
// точках зверька, движение — походка его типа (gaits.js). Пока шкура не загрузилась или «Новые модели» выключены —
// прежняя процедурная модель (fallback).
import { GAITS, posePet } from './gaits.js';
import { toon, outline } from '../../toon.js';
import { OUTLINE } from '../../style.js';
const CLIPS = { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.5, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1 }, cast: { dur: 0.5, fire: 0.5 } };
export function meshyPet(kit, name, fallback) {
  const sk = kit.skin, d = sk && sk.SKINS.on && sk.skinData(name);
  if (!d || !GAITS[d.meta.gait]) return fallback();
  const { THREE } = kit, meta = d.meta, root = new THREE.Group(), B = {}, bones = [];
  for (const [n, p, at] of meta.bones) {
    const b = new THREE.Bone(); b.name = n; const pa = p ? meta.bones.find(x => x[0] === p)[2] : [0, 0, 0];
    b.position.set(at[0] - pa[0], at[1] - pa[1], at[2] - pa[2]); b.userData.rest = b.position.clone();
    (p ? B[p] : root).add(b); B[n] = b; bones.push(b);
  }
  const mat = toon(0xffffff, { map: d.tex, rim: 0.55, rimColor: 0xffe0b0, ao: 0.8, aoH: 0.4 });
  const mesh = new THREE.SkinnedMesh(d.geo, mat); mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.noBake = true; mesh.userData.noOutline = true;
  root.add(mesh); root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  const ol = new THREE.SkinnedMesh(d.geo, outline({ width: OUTLINE.mob, color: OUTLINE.heroColor })); ol.frustumCulled = false; ol.userData.isOutline = true; ol.userData.noBake = true;
  root.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);
  const r0 = meta.bones[0], o = { root: r0[0], rootY: r0[2][1], lift: meta.lift || 0, stride: meta.stride || 0.5, trot: meta.trot ?? 2.5, swing: meta.swing };
  const st = {}, fly = !!meta.lift;
  const run = mode => a => posePet(B, meta.gait, { ...a, mode }, st, o);
  return {
    root, height: fly ? meta.lift + meta.height : meta.height, radius: 0.3, shadow: Math.min(0.9, (meta.span || 0.6)), materials: [mat], sockets: {}, bones: B, clips: CLIPS,
    anims: { idle: run('idle'), walk: run('walk'), attack: run('attack'), cast: run('attack'), hit: run('hit'), death: run('death') },
    skin: name,
  };
}
