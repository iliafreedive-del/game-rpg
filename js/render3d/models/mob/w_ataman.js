// Атаман Рваное Ухо: разбойник-страж в кирасе, меховой воротник, топор и щит; охристая палитра. Сборка 57 — модель w_ataman_m с Диска (папка «лес»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'w_ataman', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'kettle', heavy: true, scale: 1.4, fur: 0x6a4a2a, furL: 0xa07a48, pal: { bone: 0xc8c49a, boneD: 0x7f7a52, boneL: 0xf0ecc0, iron: 0x6a5a3a, ironL: 0xb09a6a, rust: 0x5a4a2a, rustL: 0xa08a5a, eye: 0xaaff6a }, cloth: 0x5a3a1a, clothL: 0xa0703a, weapons: { handR: 'axe_hand', handL: 'shield_bone' } }), 'w_ataman_m', { rimColor: 0xc8ffa0 }); } };
