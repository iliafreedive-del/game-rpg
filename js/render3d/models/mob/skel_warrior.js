// Скелет-воин Палача Бездны: шлем-котелок, железный наплечник, ржавый меч и щит (заготовка — _skeleton.js).
import { skeleton } from './_skeleton.js';
export default { id: 'skel_warrior', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'kettle' }); } };
