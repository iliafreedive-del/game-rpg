// Секач: приземистый кабан с клыками, щетинистым загривком и коротким рылом.
// Новая модель — секач из Meshy (assets/models/w_boar.glb) на ПРЕЖНЕМ риге зверя (glbrig.js beastGlb: те же кости и анимация, что у процедурного);
// пока не загрузилась или «Новые модели» выключены — процедурный.
import { beastModel } from './_beast.js';
import { beastGlb } from '../../glbrig.js';
export default { id: 'w_boar', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('w_boar')) { const m = beastGlb(kit, 'w_boar', { height: 1.45, rimColor: 0xffd0a0 }); if (m) return m; }
  return beastModel(kit, { anat: 'boar', id: 'w_boar', strip: 'bristle', stripMane: 'bristle', stripCollar: 'bristle', stripCheek: 'bristle', ftex: 'bristle', tw: 0.8, ridgeL: 3.2, ridgeLift: 1.1, cardL: 2.0, furLen: 0.12, furDens: 0.9, furStiff: 0.5, seed: 11, fur: 0x4a3626, furL: 0x8a6a48, skin: 0x6a4a3a, eye: 0xff8a4a, lean: 1.15, hump: 0.7, snout: 0.8, plates: false, horns: false, ears: 'round', tusks: true, mane: 0x2a1a10, maneL: 0x6a4a30, scale: 0.9 });
} };
