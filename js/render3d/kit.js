// «Набор художника»: всё, что нужно файлу модели. Модель получает его аргументом build(kit) и ничего не импортирует сама.
// Формат моделей описан в docs/MODEL_SPEC.md.
import * as THREE from '../vendor/three.module.min.js';
import { toon } from './toon.js';
import * as geo from './geo.js';
import * as rig from './rig.js';
import { Cape, blobShadow } from './cape.js';
import { PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, LOOKS } from './style.js';

export function makeKit(scene) {
  const { part, merge } = geo;
  return {
    THREE, scene, geo, rig, PAL, HERO, MOB, OUTLINE, RIM, FOLIAGE, Cape, blobShadow,
    part, merge,
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
    propMat: (def = {}) => toon(0xffffff, { vc: true, rim: def.rim ?? RIM.prop, rimColor: def.rimColor ?? LOOKS.torch.rim, fade: true, sway: def.sway, side: def.side === 'double' ? THREE.DoubleSide : undefined }),
    mat: (o = {}) => toon(0xffffff, { vc: true, rim: o.rim ?? 0.7, rimColor: o.rimColor ?? 0xffe2b8, side: o.side }),
  };
}
