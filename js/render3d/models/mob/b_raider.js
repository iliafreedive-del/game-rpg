// Клыкач-рубака. ВРЕМЕННАЯ модель (сборка 17); сборка 57 — модель b_raider_m с Диска (папка «пустоши»): костяной воин в шкурах; в сборке 18 — клыкастый дикарь.
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'b_raider', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { gait: 'brute', head: 'viking', fur: 0x6a4228, furL: 0xa8784a, pal: { bone: 0xd8b890, boneD: 0x8a6a48, boneL: 0xf4dcb0, iron: 0x5a3a24, ironL: 0xa87a4a, rust: 0x6a2a14, rustL: 0xb85a30, eye: 0xff8a3a }, cloth: 0x6a1a12, clothL: 0xb83a22, weapons: { handR: 'axe_hand' } }), 'b_raider_m', { rimColor: 0xffd0a0, regrip: GRIP }); } };
// правки 4 (П4-10): топоры торчали из кулаков вверх, головой у плеча — как было у Захара (w_ataman.js). Так же: древко в центр кулака,
// топор вперёд от кулака, лезвие вниз; левый — зеркально правому (его оси в модели другие, поворот посчитан под зеркало)
const GRIP = [
  { bone: 'wpnR', at: [-0.394, 0.896, 0.186], to: [-0.385, 0.896, 0.096], rot: [1.25, 0, 0], spin: [0, 0, 1, Math.PI] },
  { bone: 'wpnL', at: [0.399, 0.967, 0.271], to: [0.455, 0.967, 0.165], rot: [-1.8281, -0.5146, 2.9641] },
];
