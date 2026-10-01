// «Набор художника»: всё, что нужно файлу модели. Модель получает его аргументом build(kit) и ничего не импортирует сама.
// Формат моделей описан в docs/MODEL_SPEC.md.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import { leafTex, pineTex } from './textures.js';
import * as geo from './geo.js';
import * as rig from './rig.js';
import { Cape, blobShadow } from './cape.js';
import { PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, LOOKS, SHADOW } from './style.js';

export function makeKit(scene) {
  const { part, merge } = geo;
  return {
    THREE, scene, geo, rig, PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, Cape, blobShadow,
    part, merge,
    // бокс с фасками: размеры, фаска, цвет, позиция, поворот, опции покраски ({ top, tex, emit })
    bbox: (w, h, d, b, c, p, r, o) => part(geo.chamferBox(w, h, d, b), c, p, r, 1, o),
    // сужающаяся трубка по точкам (рога, рёбра, когти) и тело вращения по профилю [[r, y], …]
    tube: (pts, r0, r1, c, o, radial) => geo.paint(geo.taperTube(pts, r0, r1, radial), c, o || {}),
    lathe: (prof, c, p, r, s, o, segs) => part(geo.lathe(prof, segs), c, p, r, s, o),
    // шар: радиус, цвет, позиция, масштаб, опции покраски ({ top, emit })
    ball: (r, c, p, s, o) => part(new THREE.SphereGeometry(r, 10, 8), c, p, 0, s, o),
    // Group в позиции p внутри parent
    group(p = [0, 0, 0], parent = null) { const g = new THREE.Group(); g.position.set(...p); if (parent) parent.add(g); return g; },
    // ось падения/кувырка: root → spin (на высоте y) → body (сдвинут обратно), так что в покое всё стоит на земле; возвращает { spin, body }
    pivot(root, y) { const spin = new THREE.Group(); spin.position.y = y; root.add(spin); const body = new THREE.Group(); body.position.y = -y; spin.add(body); return { spin, body }; },
    // Mesh из объединённой геометрии с общим toon-материалом
    mesh: (geometry, material) => new THREE.Mesh(geometry, material),
    // материал персонажа: тон-рамп, rim-свет, самосвечение по альфе цвета вершины, вспышка при ударе
    // материал предмета окружения: ветер (def.sway), растворение между камерой и героем (fade), rim-свет
    propMat: (def = {}) => toon(0xffffff, { vc: true, rim: def.rim ?? RIM.prop, rimColor: def.rimColor ?? LOOKS.torch.rim, fade: true, sway: def.sway, side: def.side === 'double' ? THREE.DoubleSide : undefined, ao: def.ao ?? SHADOW.groundAO, aoH: def.aoH ?? 0.9, tex: true, map: typeof document === 'undefined' || !def.leaf ? null : def.leaf === 'pine' ? pineTex() : leafTex(), alphaTest: def.leaf ? 0.5 : 0 }),
    mat: (o = {}) => toon(0xffffff, { vc: true, rim: o.rim ?? 0.7, rimColor: o.rimColor ?? 0xffe2b8, side: o.side, ao: 0.72, aoH: 0.55, tex: true }),
  };
}
