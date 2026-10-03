// Герой-воин «Рыцарь Ордена»: рогатый рыцарь 1:4 (заготовка — _hero.js; формат — docs/MODEL_SPEC.md).
import { heroModel } from './_hero.js';
// новая модель «Violet Vanguard» (Meshy → tools/art/glb_rig.py): меч, щит и плащ — часть модели, поэтому плащ на Verlet не нужен
const SKIN = 'warrior_vanguard';
export default { id: 'warrior', kind: 'hero', outline: 'hero', build(kit) {
  const skin = !!(kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(SKIN));
  const m = heroModel(kit, { noCape: skin });
  return skin ? kit.skin.attachSkin(kit, m, SKIN, { noEquip: ['handR', 'handL'], legK: 1.09, rimColor: 0xc8a8ff, rim: 0.7 }) : m;
} };
