// Серый волк: поджарый зверь с острыми ушами и пушистым хвостом.
// Новая модель — ригнутый волк из Meshy с анимацией ходьбы (glbmob.js, assets/models/wolf_grey.glb); пока не загрузилась
// или «Новые модели» выключены — процедурный (_beast.js).
import { beastModel } from './_beast.js';
export default { id: 'w_wolf', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('wolf_grey')) return kit.mob.buildMob(kit, 'wolf_grey', { height: 1.2, radius: 0.34, shadow: 1.6, rimColor: 0xffe2b8, tint: 0xe6ecf6 });
  return beastModel(kit, { anat: 'wolf', id: 'w_wolf', strip: 'short', stripMane: 'long', tw: 0.9, furLen: 0.2, furDens: 1.1, seed: 5, fur: 0x4a4a4c, furL: 0x9a9a98, skin: 0x5a5450, eye: 0xffc84a, lean: 0.62, hump: 0.45, snout: 1.35, snoutW: 0.62, plates: false, horns: false, ears: 'point', bushy: true, scale: 0.78 });
} };
