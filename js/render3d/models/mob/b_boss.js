// Пробуждённый Костяной исполин — босс руин. ВРЕМЕННАЯ модель (сборка 17); сборка 57 — модель b_boss_m с Диска (папка «пустоши»): заготовка босса в костяных тонах.
import { bossModel } from './_boss.js';
import { mobSkin } from './_skin.js';
export default { id: 'b_boss', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, bossModel(kit, { SK: 0x8a6a48, SKL: 0xe8d4a8, HOOD: 0x4a2414, HOODL: 0x9a4a24, IR: 0x4a3a28, IRL: 0x9a8060, LE: 0x5a2e1c, LEL: 0x9a5a3a, rim: 0xffd0a0, core: 0xff8a3a, scale: 1.15, weapons: { handR: 'club_giant' } }), 'b_boss_m', { rimColor: 0xffd0a0 }); } };
