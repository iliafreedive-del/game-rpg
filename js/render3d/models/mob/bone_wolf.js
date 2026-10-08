// Костяной волк (сборка 57): нежить подземелий. Риг, ходьба и бег — от серого волка (Meshy, assets/models/wolf_grey.glb, glbmob.js),
// шкура волка спрятана, вместо неё — кости, привязанные к его костям: череп с пастью и светящимися глазницами, шейные и спинные
// позвонки с шипами, рёбра, таз, кости лап с когтями, хвост из позвонков. Пока волк не загрузился — процедурный зверь в цвет кости.
import { beastModel } from './_beast.js';

function boneWolf(kit, m) {
  const { THREE, MOB, PAL, part, merge, ball } = kit, B = m.bones, root = m.root;
  const BONE = MOB.bone, BD = MOB.boneD, T = { top: 0xfff4dc }, EYE = PAL.abyss;
  // шкура волка — спрятать (и её обводку)
  root.traverse(o => { if (o.isSkinnedMesh) o.visible = false; });
  m.anims.idle({ t: 0, dt: 0, time: 0, speed: 0, env: {} });
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const P = n => B[n] ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inv, B[n].matrixWorld)) : null;
  const V = (...a) => new THREE.Vector3(...a), H = m.height;
  const mat = kit.mat({ rim: 0.7, rimColor: MOB.rimColor.skel });
  // кусок геометрии строится в пространстве корня модели и вешается на кость (Actor сольёт всё в один меш с обводкой)
  const attach = (bone, geos) => {
    if (!B[bone] || !geos.length) return;
    const g = merge(geos), rel = new THREE.Matrix4().multiplyMatrices(inv, B[bone].matrixWorld).invert();
    g.applyMatrix4(rel); B[bone].add(new THREE.Mesh(g, mat));
  };
  const tube = (a, b, r0, r1, c = BONE) => kit.tube([a.toArray(), a.clone().lerp(b, 0.5).toArray(), b.toArray()], r0, r1, c, T, 6);
  const knob = (p, r, c = BONE) => ball(r, c, p.toArray(), 1, T);
  const hips = P('Hips'), chest = P('chest'), head = P('head'), hend = P('headend');
  const fwd = V(0, 0, 1);
  // позвоночник: поясница (таз → грудь) и шея (грудь → голова) — позвонки с остистыми шипами вверх
  const verts = (a, b, n, r) => { const out = []; for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); out.push(part(new THREE.CylinderGeometry(r, r * 0.9, r * 1.4, 6), BONE, p.toArray(), [Math.PI / 2, 0, 0], 1, T), part(new THREE.ConeGeometry(r * 0.5, r * 2.2, 4), BD, [p.x, p.y + r * 1.4, p.z - r * 0.3], [-0.35, 0, 0], 1, T)); } return out; };
  const back = hips.clone().lerp(chest, 0.5);
  attach('Hips', [...verts(hips, back, 3, 0.045 * H),
    // таз: две лопасти и крестец
    ...[-1, 1].map(s => part(new THREE.SphereGeometry(0.05 * H, 7, 5), BONE, [hips.x + s * 0.055 * H, hips.y - 0.03 * H, hips.z - 0.02 * H], [0.35, 0, s * 0.35], [0.4, 1, 1.25], T)),
    knob(hips, 0.04 * H, BD)]);
  // рёбра: дуги от позвоночника вниз и вокруг, от груди к пояснице короче
  const ribs = [];
  const NR = 6, W = 0.15 * H, D = 0.3 * H;
  for (let i = 0; i < NR; i++) {
    const k = i / (NR - 1), p = chest.clone().lerp(hips, 0.08 + k * 0.6), d = D * (1 - k * 0.45), w = W * (1 - k * 0.3);
    for (const s of [-1, 1]) ribs.push(kit.tube([[p.x, p.y, p.z], [p.x + s * w, p.y - d * 0.25, p.z - 0.01], [p.x + s * w * 0.9, p.y - d * 0.7, p.z + 0.01], [p.x + s * w * 0.3, p.y - d, p.z + 0.02]], 0.016 * H, 0.011 * H, BONE, T, 5));
  }
  const st0 = chest.clone().add(V(0, -D, 0.02)), st1 = chest.clone().lerp(hips, 0.5).add(V(0, -D * 0.6, 0.02));
  ribs.push(tube(st0, st1, 0.022 * H, 0.016 * H, BD));   // грудина
  attach('chest', [...verts(back, chest, 3, 0.05 * H), ...ribs, ...verts(chest, head, 3, 0.04 * H)]);
  // череп: черепная коробка, вытянутая морда к headend, нижняя челюсть, клыки, глазницы со светом Бездны, рожки-уши
  if (head && hend) {
    const dir = V(0, -0.28, 1).normalize(), L = 0.36 * H;   // headend у рига близко к голове — длина черепа своя
    const up = V(0, 1, 0).addScaledVector(dir, -dir.y).normalize(), side = new THREE.Vector3().crossVectors(up, dir).normalize();
    const at = (f, u = 0, s = 0) => head.clone().addScaledVector(dir, f * L).addScaledVector(up, u * L).addScaledVector(side, s * L);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir), e = new THREE.Euler().setFromQuaternion(q);
    const S = [
      part(new THREE.SphereGeometry(0.2 * L, 10, 8), BONE, at(0.12, 0.1).toArray(), [e.x, e.y, e.z], [1.05, 0.9, 1.2], T),          // черепная коробка
      kit.tube([at(0.22, 0.08).toArray(), at(0.6, 0.03).toArray(), at(0.95, -0.01).toArray()], 0.12 * L, 0.055 * L, BONE, T, 7),         // морда
      kit.tube([at(0.2, -0.08).toArray(), at(0.6, -0.13).toArray(), at(0.9, -0.1).toArray()], 0.045 * L, 0.03 * L, BD, T, 5),           // челюсть
      ...[-1, 1].map(s => part(new THREE.SphereGeometry(0.065 * L, 7, 5), 0x0d0a16, at(0.24, 0.15, s * 0.1).toArray())),                  // глазницы
      ...[-1, 1].map(s => ball(0.04 * L, EYE, at(0.27, 0.15, s * 0.1).toArray(), 1, { emit: true })),                                    // свет в глазницах
      ...[-1, 1].flatMap(s => [0.85, 0.65].map(f => part(new THREE.ConeGeometry(0.022 * L, 0.1 * L, 4), 0xfff8e8, at(f, -0.06, s * 0.045).toArray(), [Math.PI, 0, 0]))),   // клыки
    ];
    for (const n of ['earend', 'R_earend']) { const ep = P(n); if (!ep) continue; const sd = ep.x > head.x ? 1 : -1, b0 = at(0.05, 0.2, sd * 0.11), tip = b0.clone().add(V(sd * 0.03, 0.09, -0.05).multiplyScalar(H)); S.push(kit.tube([b0.toArray(), tip.toArray()], 0.04 * L, 0.006, BD, T, 4)); }   // уши — короткие костяные рожки
    attach('head', S);
  }
  // лапы: кости между суставами, шарики в суставах, когти на лапе
  for (const pre of ['', 'R_']) for (const leg of ['frontleg', 'backleg']) {
    const names = leg === 'frontleg' ? [leg, leg + '0', leg + '1', leg + '2'] : [leg + '0', leg + '1', leg + '2'];
    for (let i = 0; i < names.length - 1; i++) {
      const a = P(pre + names[i]), b = P(pre + names[i + 1]); if (!a || !b) continue;
      const r = (i === 0 && leg === 'frontleg' ? 0.022 : i === 0 ? 0.034 : 0.025) * H;   // лопатка тоньше бедра
      attach(pre + names[i], [tube(a, b, r, r * 0.8), knob(b, r * 1.15, BD)]);
    }
    const toe = P(pre + names[names.length - 1]); if (!toe) continue;
    attach(pre + names[names.length - 1], [part(new THREE.BoxGeometry(0.07 * H, 0.03 * H, 0.09 * H), BONE, [toe.x, toe.y - 0.005 * H, toe.z + 0.035 * H], 0, 1, T),
      ...[-1, 0, 1].map(s => part(new THREE.ConeGeometry(0.012 * H, 0.05 * H, 4), 0xfff8e8, [toe.x + s * 0.024 * H, toe.y - 0.005 * H, toe.z + 0.09 * H], [Math.PI / 2, 0, 0]))]);
  }
  // хвост: позвонки, к концу мельче
  const tl = ['tailstart', 'tail1', 'tail2', 'tail3'];
  for (let i = 0; i < tl.length - 1; i++) {
    const a = P(tl[i]), b = P(tl[i + 1]); if (!a || !b) continue;
    const r = 0.028 * H * (1 - i * 0.25);
    attach(tl[i], [tube(a, b, r * 0.7, r * 0.55, BD), knob(a, r, BONE), knob(a.clone().lerp(b, 0.5), r * 0.85, BONE)]);
  }
  m.materials = [...(m.materials || []), mat];
  return m;
}

export default { id: 'bone_wolf', kind: 'mob', outline: 'mob', build(kit) {
  // сборка 57: модель с Диска (The Bonewraith Hound) на скелете серого волка — assets/models/bone_wolf.glb, tools/art/rig_transfer.mjs
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('bone_wolf')) { const m = kit.mob.buildMob(kit, 'bone_wolf', { height: 1.15, radius: 0.34, shadow: 1.5, rimColor: kit.MOB.rimColor.skel }); if (m) return m; }
  if (kit.mob && kit.mob.mobLoaded('wolf_grey')) { const m = kit.mob.buildMob(kit, 'wolf_grey', { height: 1.15, radius: 0.34, shadow: 1.5 }); if (m && m.bones.Hips) return boneWolf(kit, m); }
  return beastModel(kit, { anat: 'wolf', id: 'bone_wolf', strip: 'short', tw: 0.9, furLen: 0.05, furDens: 0.3, seed: 9, fur: kit.MOB.boneD, furL: kit.MOB.bone, skin: kit.MOB.boneD, eye: 0xb48cff, lean: 0.62, hump: 0.45, snout: 1.35, snoutW: 0.62, plates: false, horns: false, ears: 'point', bushy: false, scale: 0.78 });
} };
