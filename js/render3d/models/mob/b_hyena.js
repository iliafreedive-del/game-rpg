// Пятнистая гиена: высокие плечи, покатая спина, короткая щетинистая грива, светлая песочная шерсть.
// Новая модель — гиена из Meshy на скелете серого волка (assets/models/hyena.glb, tools/art/rig_transfer.mjs, анимации волка);
// пока не загрузилась или «Новые модели» выключены — процедурная.
import { beastModel } from './_beast.js';
export default { id: 'b_hyena', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('hyena')) { const m = kit.mob.buildMob(kit, 'hyena', { height: 1.6, radius: 0.36, shadow: 1.7, rimColor: 0xffe2b8 }); if (m) return m; }
  return beastModel(kit, { furLen: 0.12, furDens: 0.9, seed: 23, fur: 0x8a6a3a, furL: 0xd8b878, skin: 0x5a4430, eye: 0xffd24a, lean: 0.7, hump: 0.95, snout: 1.1, snoutW: 0.7, plates: false, horns: false, ears: 'round', mane: 0x2a1a10, maneL: 0x5a3a20, scale: 0.8 });
} };
