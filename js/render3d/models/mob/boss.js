// Босс «Палач Бездны»: великан в капюшоне палача (заготовка — _boss.js; те же клипы attack/attack2/slam/roar у боссов походов).
import { bossModel } from './_boss.js';
export default { id: 'boss', kind: 'mob', outline: 'mob', build(kit) { return bossModel(kit, {}); } };
