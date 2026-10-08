// Скелет-лучник: капюшон и плащ цвета охры, колчан за спиной, костяной лук; без наплечника, лёгкий. Каст — натянуть лук (сборка 57 — модель skel_archer_m).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'skel_archer', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'hood', pauldron: false, quiver: true, cast: 'bow', cloth: 0x4a3a20, clothL: 0x8a6a3a, weapons: { handL: 'bow_bone' } }), 'skel_archer_m', { bow: true }); } };
