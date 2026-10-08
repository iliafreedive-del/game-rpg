// Шаман-костогрыз. ВРЕМЕННАЯ модель (сборка 17); сборка 57 — модель b_shaman_m с Диска (папка «пустоши»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'b_shaman', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'antler', pauldron: false, robe: true, cast: 'staff', pal: { bone: 0xd8b890, boneD: 0x8a6a48, boneL: 0xf4dcb0, iron: 0x5a3a24, ironL: 0xa87a4a, rust: 0x6a2a14, rustL: 0xb85a30, eye: 0xffa040 }, cloth: 0x5a2416, clothL: 0xa8502a, rimColor: 0xffc890, scale: 1.05, weapons: { handR: 'staff_bone' } }), 'b_shaman_m', { rimColor: 0xffc890 }); } };
