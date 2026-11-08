// Скелет-воин Палача Бездны: шлем-котелок, железный наплечник, ржавый меч и щит (заготовка — _skeleton.js; сборка 57 — модель skel_warrior_m).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'skel_warrior', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'kettle' }), 'skel_warrior_m'); } };
