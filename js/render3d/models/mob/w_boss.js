// Хозяин Чащи: великан-лесовик — мшистая кожа, оленьи рога, зелёное ядро, дубина вместо секиры. Сборка 57 — модель w_boss_m с Диска (папка «лес»).
import { bossModel } from './_boss.js';
import { mobSkin } from './_skin.js';
export default { id: 'w_boss', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, bossModel(kit, { SK: 0x4a5a3a, SKL: 0x9ab870, HOOD: 0x24321a, HOODL: 0x5a7a30, IR: 0x4a3a28, IRL: 0x9a8060, LE: 0x3a2a18, LEL: 0x7a5a38, rim: 0xc8ffa0, core: 0x9aff6a, antlers: true, scale: 1.1, weapons: { handR: 'club_giant' } }), 'w_boss_m', { rimColor: 0xc8ffa0 }); } };
