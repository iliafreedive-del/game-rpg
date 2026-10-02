// Ётун-великан: скелет-исполин в мехах и инее, рога, ледяные шипы по спине, огромная дубина.
import { skeleton } from './_skeleton.js';
export default { id: 'f_jotun', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'viking', heavy: true, scale: 2.3, fur: 0xdfe8f0, furL: 0xffffff, spikes: 0x8ad8ff, pal: { bone: 0xb8d4e6, boneD: 0x6f8ea6, boneL: 0xeaf6ff, iron: 0x4a5f7a, ironL: 0xa8c4e0, rust: 0x3f5a7a, rustL: 0x9ac0e0, eye: 0x7aeaff }, cloth: 0x3a5a7a, clothL: 0x8ab4d8, rimColor: 0xcfeaff, weapons: { handR: 'club_giant' } }); } };
