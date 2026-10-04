// Пещерный зверь: массивный горбатый хищник с костяными шипами.
// Новая модель — зверь из Meshy на скелете серого волка (assets/models/beast.glb, tools/art/rig_transfer.mjs, анимации волка);
// пока не загрузилась или «Новые модели» выключены — процедурный (_beast.js).
import { beastModel } from './_beast.js';
export default { id: 'beast', kind: 'mob', outline: 'mob', build(kit) {
  if (kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded('beast')) return kit.mob.buildMob(kit, 'beast', { height: 1.5, radius: 0.5, shadow: 2.2, rimColor: 0xe8dcc0, speed0: 1.4 });
  return beastModel(kit, { anat: 'beast', id: 'beast', strip: 'short', stripMane: 'long' });
} };
