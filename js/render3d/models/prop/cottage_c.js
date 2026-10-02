// Длинный домик в фахверке с тёплой охристой штукатуркой и красными ставнями, крыша — тёмная старая солома. Генератор — _cottage.js.
import { cottage, cottageProxy } from './_cottage.js';
export default { id: 'cottage_c', kind: 'prop', outline: false, opts: { w: 5.6, d: 4.0, seed: 17, wall: 0x9a7448, wallTop: 0xe0b878, roof: 0x4a3c1e, roofTop: 0x96783c, chimney: -1, shutter: 0x6a2a20, shutterL: 0xb04a3a, h: 2.7 }, shadowProxy(kit) { return cottageProxy(kit, this.opts); }, build(kit) { return cottage(kit, this, this.opts); } };
