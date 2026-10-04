// Медведь-шатун: огромный бурый медведь с горбом, круглыми ушами и жёлтыми глазами.
// Новая модель — медведь из Meshy (assets/models/w_bear.glb) на ПРЕЖНЕМ риге зверя (glbrig.js beastGlb); пока не загрузилась или «Новые модели» выключены — процедурный.
import { beastModel } from './_beast.js';
import { beastGlb } from '../../glbrig.js';
export default { id: 'w_bear', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('w_bear')) { const m = beastGlb(kit, 'w_bear', { height: 2.4, rimColor: 0xffd0a0 }); if (m) return m; }
  return beastModel(kit, { anat: 'bear', id: 'w_bear', crestL: 0.9, strip: 'shaggy', stripMane: 'shaggy', stripCheek: 'shaggy', ftex: 'furS', tw: 1.3, chest: true, cardW: 0.28, cardL: 1.4, furLen: 0.3, furDens: 1.3, seed: 13, fur: 0x4a3222, furL: 0x8a6a4a, skin: 0x5a4030, eye: 0xffd45a, lean: 1.2, hump: 1.1, snout: 0.9, plates: false, horns: false, ears: 'round', scale: 1.4 });
} };
