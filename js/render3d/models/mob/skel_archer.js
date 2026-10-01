// Скелет-лучник: капюшон и плащ цвета охры, колчан за спиной, костяной лук; без наплечника, лёгкий. Каст — натянуть лук.
import { skeleton } from './_skeleton.js';
export default { id: 'skel_archer', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'hood', pauldron: false, quiver: true, cast: 'bow', cloth: 0x4a3a20, clothL: 0x8a6a3a, weapons: { handL: 'bow_bone' } }); } };
