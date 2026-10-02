// Драугр-щитоносец: скелет в изморози — рогатый шлем, ледяные кристаллы на плечах, топор и костяной щит.
import { skeleton } from './_skeleton.js';
export default { id: 'f_draugr', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'viking', pal: { bone: 0xb8d4e6, boneD: 0x6f8ea6, boneL: 0xeaf6ff, iron: 0x4a5f7a, ironL: 0xa8c4e0, rust: 0x3f5a7a, rustL: 0x9ac0e0, eye: 0x7aeaff }, spikes: 0x8ad8ff, cloth: 0x2a3f5a, clothL: 0x5a82aa, rimColor: 0xcfeaff, weapons: { handR: 'axe_hand', handL: 'shield_bone' } }); } };
