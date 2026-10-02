// Леший: тощий дух чащи — рога-ветвистые, мох по плечам и на мантии, посох-корень с зелёным огоньком.
import { skeleton } from './_skeleton.js';
export default { id: 'w_leshy', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'antler', pauldron: false, robe: true, hover: true, cast: 'staff', moss: 0x3a6a2a, pal: { bone: 0xc8c49a, boneD: 0x7f7a52, boneL: 0xf0ecc0, iron: 0x6a5a3a, ironL: 0xb09a6a, rust: 0x5a4a2a, rustL: 0xa08a5a, eye: 0xaaff6a }, cloth: 0x2a3a1a, clothL: 0x5a7a30, rimColor: 0xc8ffa0, scale: 1.12, weapons: { handR: 'staff_root' } }); } };
