// Скорпион-панцирник: тёмно-красный панцирь, клешни, жало на хвосте.
// Новая модель — скорпион из Meshy (assets/models/b_scorpid.glb) на своём простом риге (glbrig.js scorpGlb: ноги качаются вперёд-назад, клешни бьют выпадом);
// пока не загрузилась или «Новые модели» выключены — прежний временный процедурный (зверь в панцире).
import { beastModel } from './_beast.js';
import { scorpGlb } from '../../glbrig.js';
export default { id: 'b_scorpid', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('b_scorpid')) { const m = scorpGlb(kit, 'b_scorpid', { height: 1.8, rimColor: 0xffc0a0 }); if (m) return m; }
  return beastModel(kit, { furLen: 0.05, furDens: 0.4, seed: 29, fur: 0x4a1a12, furL: 0x9a3a22, skin: 0x3a140e, eye: 0xffd04a, lean: 1.2, hump: 0.5, snout: 0.7, plates: true, spikes: true, horns: true, ears: 'point', scale: 1.15 });
} };
