import { house, houseProxy } from './_house.js';
export default { id: 'house_2', kind: 'prop', outline: false, opts: { w: 4.0, d: 3.8, floors: 2, gf: 2.6, wall: 0x84704c, wallTop: 0xd0b27a, roof: 0x6a3a1c, roofTop: 0xc07a3a, seed: 3 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
