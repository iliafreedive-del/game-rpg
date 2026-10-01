import { house, houseProxy } from './_house.js';
export default { id: 'house_0', kind: 'prop', outline: false, opts: { w: 4.6, d: 3.6, floors: 2, wall: 0x7a6a50, wallTop: 0xc8b088, roof: 0x6a2a1e, roofTop: 0xc8603e, seed: 1 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
