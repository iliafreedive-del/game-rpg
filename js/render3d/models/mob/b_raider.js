// Клыкач-рубака. ВРЕМЕННАЯ модель (сборка 17): костяной воин в шкурах; в сборке 18 — клыкастый дикарь.
import { skeleton } from './_skeleton.js';
export default { id: 'b_raider', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'viking', fur: 0x6a4228, furL: 0xa8784a, pal: { bone: 0xd8b890, boneD: 0x8a6a48, boneL: 0xf4dcb0, iron: 0x5a3a24, ironL: 0xa87a4a, rust: 0x6a2a14, rustL: 0xb85a30, eye: 0xff8a3a }, cloth: 0x6a1a12, clothL: 0xb83a22, weapons: { handR: 'axe_hand' } }); } };
