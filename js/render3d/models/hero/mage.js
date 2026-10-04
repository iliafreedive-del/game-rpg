// Герой-маг «Хранитель Бездны»: остроконечная шляпа с широкими полями и звездой, длинная мантия с золотой каймой и поясом, воротник-мантия,
// светящийся кулон, фиолетовый плащ, борода. Посох — оружие в правой руке. Тело и риг — общие с воином (_hero.js).
import { heroModel } from './_hero.js';
function torso({ kit, STEEL, STEEL_L, STEEL_D, DARK, LEATHER, LEATHER_L, BR, BR_D, BONE, TOP }) {
  const { THREE, part, bbox, lathe, tube } = kit, L = [];
  L.push(lathe([[0.3, -0.95], [0.34, -0.7], [0.3, -0.3], [0.21, 0.05]], STEEL_D, [0, 0.0, 0.04], 0, [1.1, 1, 1.5], { top: STEEL, tex: 'cloth' }, 14));       // подол мантии до земли
  L.push(lathe([[0.3, -0.95], [0.3, -0.9]], BR, [0, 0, 0.04], 0, [1.1, 1, 1.5], { top: 0xf0c868 }, 14));
  L.push(lathe([[0.2, 0.05], [0.27, 0.2], [0.3, 0.4], [0.29, 0.52], [0.24, 0.63], [0.17, 0.7]], STEEL, [0, 0, 0], 0, [1.05, 1, 0.85], { top: STEEL_L, tex: 'cloth' }, 14));
  L.push(bbox(0.06, 1.35, 0.03, 0.01, BR_D, [0, -0.05, 0.255], [0.05, 0, 0], { top: BR }));                                                                      // золотая кайма по центру
  L.push(lathe([[0.24, 0], [0.26, 0.03], [0.26, 0.1], [0.24, 0.13]], 0x5a3a14, [0, 0, 0], 0, 1, { top: BR, tex: 'leather' }, 12), part(new THREE.OctahedronGeometry(0.06, 0), 0xb48cff, [0, 0.06, 0.26], 0, [1, 1.3, 0.6], { emit: true }));   // пояс с самоцветом
  L.push(bbox(0.13, 0.16, 0.04, 0.01, 0x6a2a2a, [0.22, -0.05, 0.2], [0, 0.5, 0.1], { top: 0xa04a4a, tex: 'leather' }));                                       // книга на поясе
  L.push(part(new THREE.TorusGeometry(0.25, 0.1, 8, 16), STEEL_D, [0, 0.66, 0.0], [Math.PI / 2, 0, 0], [1.1, 1, 0.9], { top: STEEL_L, tex: 'cloth' }));        // воротник-мантия
  L.push(part(new THREE.TorusGeometry(0.27, 0.025, 4, 16), BR, [0, 0.6, 0.0], [Math.PI / 2, 0, 0], [1.1, 1, 0.9], { top: 0xf0c868 }));
  for (const sx of [-1, 1]) L.push(part(new THREE.SphereGeometry(0.21, 10, 7, 0, 6.283, 0, 1.5708), STEEL_D, [sx * 0.46, 0.55, 0], [0, 0, -sx * 0.3], [1, 0.8, 1.05], { top: STEEL_L, tex: 'cloth' }), part(new THREE.TorusGeometry(0.21, 0.02, 4, 14), BR, [sx * 0.46, 0.55, 0], [Math.PI / 2, 0, 0], [1, 1.05, 1]));
  L.push(tube([[0, 0.64, 0.24], [0, 0.55, 0.28], [0, 0.45, 0.28]], 0.012, 0.012, BR, { top: 0xf0c868 }, 4), part(new THREE.IcosahedronGeometry(0.06, 1), 0x9ad8ff, [0, 0.42, 0.29], 0, 1, { emit: true }));   // кулон
  return L;
}
function head({ kit, STEEL, STEEL_L, STEEL_D, BR, BONE }) {
  const { THREE, part, bbox, lathe, tube } = kit, L = [];
  L.push(lathe([[0.0, 0.2], [0.24, 0.16], [0.28, 0.02], [0.26, -0.04]], STEEL_D, [0, 0, -0.02], 0, [1, 1, 1.08], { top: STEEL, tex: 'cloth' }, 12));                // капюшон под шляпой
  L.push(bbox(0.32, 0.18, 0.1, 0.03, 0x07050f, [0, 0.12, 0.2]), part(new THREE.BoxGeometry(0.07, 0.03, 0.02), 0x9ad8ff, [0.075, 0.14, 0.255], 0, 1, { emit: true }), part(new THREE.BoxGeometry(0.07, 0.03, 0.02), 0x9ad8ff, [-0.075, 0.14, 0.255], 0, 1, { emit: true }));
  L.push(part(new THREE.ConeGeometry(0.1, 0.34, 6), 0xe8e4f0, [0, -0.06, 0.2], [0.15, 0, 0], [1, 1, 0.8], { top: 0xffffff, tex: 'cloth' }));               // борода
  L.push(part(new THREE.CylinderGeometry(0.44, 0.46, 0.04, 18), STEEL_D, [0, 0.27, 0], 0, 1, { top: STEEL, tex: 'cloth' }), part(new THREE.TorusGeometry(0.45, 0.02, 4, 18), BR, [0, 0.29, 0], [Math.PI / 2, 0, 0], 1, { top: 0xf0c868 }));   // поля шляпы
  L.push(lathe([[0.26, 0.28], [0.2, 0.44], [0.12, 0.6], [0.05, 0.76]], STEEL, [0, 0, 0], 0, 1, { top: STEEL_L, tex: 'cloth' }, 12));
  L.push(tube([[0.05, 0.76, 0], [0.0, 0.84, -0.08], [-0.1, 0.86, -0.18]], 0.05, 0.012, STEEL, { top: STEEL_L, tex: 'cloth' }, 6));                           // загнутый кончик
  L.push(part(new THREE.TorusGeometry(0.255, 0.025, 4, 16), BR, [0, 0.33, 0], [Math.PI / 2, 0, 0], 1, { top: 0xf0c868 }), part(new THREE.OctahedronGeometry(0.06, 0), 0xb48cff, [0, 0.43, 0.25], 0, [1, 1.3, 0.5], { emit: true }));
  return L;
}
// новая модель — маг в маске с ригом Mixamo и своими ходьбой/бегом (art_meshy/in/mage_staff_rigged_fixed.glb → tools/art/glb_mixamo.py);
// посох — отдельная сетка, поставлен в правую кисть (как у процедурного мага). Прежняя «Starlight Archmage» — assets/models/mage_archmage.*
const SKIN = 'mage_staff';
export default { id: 'mage', kind: 'hero', outline: 'hero', build(kit) {
  const skin = !!(kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(SKIN));
  const m = heroModel(kit, { steel: 0x4a3a8a, steelL: 0x8a6ad8, steelD: 0x2a1c5c, dark: 0x1a1438, tex: 'cloth', rimColor: 0xcfa8ff, cape: 0x6a2ab0, capeHem: 0x2a1050, capeLen: 1.35, height: 2.6, torso, head, noCape: skin });
  return skin ? kit.skin.attachSkin(kit, m, SKIN, { noEquip: ['handR'], staffHand: 'handR', legK: 0.85, rimColor: 0xcfa8ff, rim: 0.7 }) : m;
} };
