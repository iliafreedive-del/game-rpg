// Снежная ведьма: парящая в ледяной мантии, капюшон, кристаллы на плечах, посох с ледяным навершием. Сборка 57 — модель f_hag_m с Диска (папка «фьорд»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'f_hag', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'hood', pauldron: false, robe: true, hover: true, cast: 'staff', spikes: 0xaee4ff, pal: { bone: 0xb8d4e6, boneD: 0x6f8ea6, boneL: 0xeaf6ff, iron: 0x4a5f7a, ironL: 0xa8c4e0, rust: 0x3f5a7a, rustL: 0x9ac0e0, eye: 0x7aeaff }, cloth: 0x2a4a6a, clothL: 0x8ac0e8, rimColor: 0xcfeaff, scale: 1.05, weapons: { handR: 'staff_ice' } }), 'f_hag_m', { rimColor: 0xcfeaff }); } };
