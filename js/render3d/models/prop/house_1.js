import { house, houseProxy } from './_house.js';
export default { id: 'house_1', kind: 'prop', outline: false, opts: { w: 5.4, d: 4.0, floors: 3, wall: 0x6a6058, wallTop: 0xb0a490, roof: 0x343a50, roofTop: 0x6c7898, seed: 2 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
