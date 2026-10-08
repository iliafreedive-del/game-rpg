// Браконьер: скелет-стрелок в зелёном капюшоне с меховым воротником, колчан и охотничий лук. Сборка 57 — модель w_poacher_m с Диска (папка «лес»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'w_poacher', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'hood', pauldron: false, quiver: true, cast: 'bow', fur: 0x6a5a38, furL: 0x9a8a58, pal: { bone: 0xc8c49a, boneD: 0x7f7a52, boneL: 0xf0ecc0, iron: 0x6a5a3a, ironL: 0xb09a6a, rust: 0x5a4a2a, rustL: 0xa08a5a, eye: 0xaaff6a }, cloth: 0x2a4a22, clothL: 0x5a8a3a, weapons: { handL: 'bow_bone' } }), 'w_poacher_m', { rimColor: 0xc8ffa0, bow: true }); } };
