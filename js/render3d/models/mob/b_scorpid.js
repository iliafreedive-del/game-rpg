// Скорпион-панцирник. ВРЕМЕННАЯ модель (сборка 17): зверь в тёмно-красном панцире; в сборке 18 — свой скорпион с клешнями и жалом.
import { beastModel } from './_beast.js';
export default { id: 'b_scorpid', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { furLen: 0.05, furDens: 0.4, seed: 29, fur: 0x4a1a12, furL: 0x9a3a22, skin: 0x3a140e, eye: 0xffd04a, lean: 1.2, hump: 0.5, snout: 0.7, plates: true, spikes: true, horns: true, ears: 'point', scale: 1.15 }); } };
