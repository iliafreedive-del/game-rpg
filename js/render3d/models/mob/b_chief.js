// Вождь Кровавый Клык. ВРЕМЕННАЯ модель (сборка 17); сборка 57 — модель b_chief_m с Диска (папка «пустоши»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'b_chief', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'crown', heavy: true, scale: 1.45, fur: 0x6a4228, furL: 0xa8784a, spikes: 0xe8dcc0, pal: { bone: 0xd8b890, boneD: 0x8a6a48, boneL: 0xf4dcb0, iron: 0x4a2a1a, ironL: 0x9a5a3a, rust: 0x6a2a14, rustL: 0xb85a30, eye: 0xff6a2a }, cloth: 0x6a140e, clothL: 0xb02a18, rimColor: 0xffd0a0, weapons: { handR: 'axe_great', handL: 'shield_bone' } }), 'b_chief_m', { rimColor: 0xffd0a0 }); } };
