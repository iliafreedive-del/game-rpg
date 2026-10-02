// Каменный домик под соломой: стены из бутового камня, синие ставни, труба слева. Генератор — _cottage.js.
import { cottage, cottageProxy } from './_cottage.js';
export default { id: 'cottage_b', kind: 'prop', outline: false, opts: { w: 4.4, d: 3.6, seed: 9, walls: 'stone', stone: 0x6a6252, stoneTop: 0xb8ab8c, roof: 0x524020, roofTop: 0xa48442, chimney: -1, shutter: 0x2f4a6a, shutterL: 0x5a84a8, doorU: 0.6 }, shadowProxy(kit) { return cottageProxy(kit, this.opts); }, build(kit) { return cottage(kit, this, this.opts); } };
