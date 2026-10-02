// Таверна «Кружка Ордена»: три этажа, угловая круглая башня с конической крышей и флажком, балкон, вывеска. Генератор — _house.js.
import { house, houseProxy } from './_house.js';
export default { id: 'house_1', kind: 'prop', outline: false, opts: { w: 6.2, d: 4.4, floors: 3, tower: true, balcony: true, sign: true, wall: 0x6a6058, wallTop: 0xc8b8a0, roof: 0x343a50, roofTop: 0x6c7898, shutter: 0x5a2a20, shutterL: 0xa04a3a, seed: 2 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
