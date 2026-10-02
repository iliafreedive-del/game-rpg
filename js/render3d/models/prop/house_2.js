// Дом у пруда: два этажа, мансардные окна, наружная лестница на второй этаж, плющ. Генератор — _house.js.
import { house, houseProxy } from './_house.js';
export default { id: 'house_2', kind: 'prop', outline: false, opts: { w: 4.6, d: 4.0, floors: 2, gf: 2.6, dormers: 2, stairs: true, ivy: true, wall: 0x84704c, wallTop: 0xe0c48a, roof: 0x6a3a1c, roofTop: 0xc07a3a, roofTex: 'thatch', shutter: 0x3a5a2a, shutterL: 0x6a9a4a, seed: 3 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
