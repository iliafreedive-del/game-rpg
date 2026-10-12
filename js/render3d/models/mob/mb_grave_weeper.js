// Плакальщица Кладбища (охота, П35): колдует — значит маг, а не скелет-воин: шкура костяного колдуна skel_mage_m (мантия, посох), в полтора раза крупнее, призрачно-бирюзовая подсветка.
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'mb_grave_weeper', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'hood', pauldron: false, robe: true, hover: true, cast: 'staff', pal: { eye: 0x7affe6 }, cloth: 0x1f3a3a, clothL: 0x6ad0c4, rimColor: 0x9affee, scale: 1.5, weapons: { handR: 'staff_bone' } }), 'skel_mage_m', { rimColor: 0x9affee }); } };
