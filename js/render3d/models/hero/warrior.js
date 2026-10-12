// Герой-воин «Рыцарь Ордена»: рогатый рыцарь 1:4 (заготовка — _hero.js; формат — docs/MODEL_SPEC.md).
import { heroModel } from './_hero.js';
// новая модель — тот же «Violet Vanguard» с ригом Mixamo и своими ходьбой/бегом (art_meshy/in/warrior_knight_*.glb → tools/art/glb_mixamo.py):
// меч в правой кисти, щит на левом предплечье, плащ — часть модели (плащ на Verlet не нужен). Прежняя статичная — assets/models/warrior_vanguard.*
// make(имя) — тот же воин с другой моделью-обликом (js/data/cosmetics.js HERO_MODELS)
export const make = (SKIN = 'warrior_knight') => ({ id: 'warrior', kind: 'hero', outline: 'hero', skin: SKIN, build(kit) {
  const skin = !!(kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(SKIN));
  const m = heroModel(kit, { noCape: skin });
  return skin ? kit.skin.attachSkin(kit, m, SKIN, { noEquip: ['handR', 'handL'], armOut: 0.25, legK: 0.91, rimColor: 0xc8a8ff, rim: 0.7 }) : m;
} });
export default make();
