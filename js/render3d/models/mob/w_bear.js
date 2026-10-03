// Медведь-шатун: огромный бурый медведь с горбом, круглыми ушами и жёлтыми глазами.
import { beastModel } from './_beast.js';
export default { id: 'w_bear', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { id: 'w_bear', strip: 'shaggy', stripMane: 'shaggy', stripCheek: 'shaggy', ftex: 'furS', tw: 1.3, chest: true, cardW: 0.28, cardL: 1.4, furLen: 0.3, furDens: 1.3, seed: 13, fur: 0x4a3222, furL: 0x8a6a4a, skin: 0x5a4030, eye: 0xffd45a, lean: 1.2, hump: 1.1, snout: 0.9, plates: false, horns: false, ears: 'round', scale: 1.4 }); } };
