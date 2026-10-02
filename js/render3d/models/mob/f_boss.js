// Ётун Скъёльд: великан палача в ледяной палитре — синяя кожа, корона из ледяных кристаллов, ядро-осколок вместо ядра Бездны.
import { bossModel } from './_boss.js';
export default { id: 'f_boss', kind: 'mob', outline: 'mob', build(kit) { return bossModel(kit, { SK: 0x6a94b4, SKL: 0xc4e4f6, HOOD: 0x24384e, HOODL: 0x6a9ac0, IR: 0x3a5068, IRL: 0xa0c0e0, LE: 0x3a4658, LEL: 0x7a96b0, rim: 0xcfeaff, core: 0x7acbff, crown: 0x8ad8ff, scale: 1.1 }); } };
