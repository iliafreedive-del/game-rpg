// Ледяной волк: поджарый белый волк с острыми ушами, ледяные шипы на хребте, голубые глаза.
// Новая модель — ледяной волк из Meshy на скелете серого волка (assets/models/wolf_ice.glb, tools/art/rig_transfer.mjs, анимации волка);
// пока не загрузилась или «Новые модели» выключены — процедурный (_beast.js).
import { beastModel } from './_beast.js';
export default { id: 'f_wolf', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('wolf_ice')) return kit.mob.buildMob(kit, 'wolf_ice', { height: 1.25, radius: 0.34, shadow: 1.6, rimColor: 0xcfeaff, tint: 0xd6e6ff });
  return beastModel(kit, { anat: 'wolf', id: 'f_wolf', strip: 'short', stripMane: 'frost', tw: 0.9, furLen: 0.2, furDens: 1.1, seed: 3, fur: 0xc8d4e0, furL: 0xf4fbff, skin: 0x8a9aae, eye: 0x7aeaff, rim: 0xcfeaff, lean: 0.62, hump: 0.45, snout: 1.35, snoutW: 0.62, plates: false, horns: false, ears: 'point', bushy: true, spikes: 0x8ad8ff, scale: 0.78 });
} };
