// Клыкач-метатель. ВРЕМЕННАЯ модель (сборка 17); сборка 57 — модель b_thrower_m с Диска (папка «пустоши»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'b_thrower', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'hood', pauldron: false, quiver: true, cast: kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded('b_thrower_m') ? 'staff' : 'bow',   /* у модели с Диска копьё: бросок — замах из-за головы */ fur: 0x6a4228, furL: 0xa8784a, pal: { bone: 0xd8b890, boneD: 0x8a6a48, boneL: 0xf4dcb0, iron: 0x5a3a24, ironL: 0xa87a4a, rust: 0x6a2a14, rustL: 0xb85a30, eye: 0xff8a3a }, cloth: 0x7a4a24, clothL: 0xc88a4a, weapons: { handL: 'bow_bone' } }), 'b_thrower_m', { rimColor: 0xffd0a0 }); } };
