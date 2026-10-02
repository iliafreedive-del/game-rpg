// Домик с соломенной крышей в фахверке (светлая штукатурка, зелёные ставни). Генератор — _cottage.js.
import { cottage, cottageProxy } from './_cottage.js';
export default { id: 'cottage_a', kind: 'prop', outline: false, opts: { w: 5.0, d: 3.8, seed: 4, wall: 0x9a8a68, wallTop: 0xeadcb8, roof: 0x5a4420, roofTop: 0xb08c46, chimney: 1 }, shadowProxy(kit) { return cottageProxy(kit, this.opts); }, build(kit) { return cottage(kit, this, this.opts); } };
