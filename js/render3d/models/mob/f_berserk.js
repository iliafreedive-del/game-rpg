// Берсерк: полуголый скелет с меховым воротником и рогатым шлемом, красные от крови кости, два топора. Сборка 57 — модель f_berserk_m с Диска (папка «фьорд»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'f_berserk', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'viking', pauldron: false, fur: 0x5a3a28, furL: 0x8a6a48, pal: { bone: 0xe0c8b0, boneD: 0x9a6a50, boneL: 0xfff0dc, iron: 0x59627a, eye: 0xff6a3a }, cloth: 0x6a1a14, clothL: 0xa83a2a, rimColor: 0xffb090, weapons: { handR: 'axe_hand', handL: 'axe_hand' } }), 'f_berserk_m', { rimColor: 0xcfeaff, swing: true }); } };
