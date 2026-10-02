// Ледяной волк: поджарый белый волк с острыми ушами, ледяные шипы на хребте, голубые глаза.
import { beastModel } from './_beast.js';
export default { id: 'f_wolf', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { fur: 0xc8d4e0, furL: 0xf4fbff, skin: 0x8a9aae, eye: 0x7aeaff, rim: 0xcfeaff, lean: 0.62, hump: 0.45, snout: 1.35, snoutW: 0.62, plates: false, horns: false, ears: 'point', bushy: true, spikes: 0x8ad8ff, scale: 0.78 }); } };
