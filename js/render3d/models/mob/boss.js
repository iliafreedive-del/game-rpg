// Босс «Палач Бездны»: великан в капюшоне палача (заготовка — _boss.js; те же клипы attack/attack2/slam/roar у боссов походов; сборка 57 — модель boss_m).
import { bossModel } from './_boss.js';
import { mobSkin } from './_skin.js';
export default { id: 'boss', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, bossModel(kit, {}), 'boss_m', { rimColor: 0xc9aaff }); } };
