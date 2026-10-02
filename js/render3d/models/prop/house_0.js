// Дом ремесленника: два этажа, поперечный фронтон над фасадом, мансардное окно, плющ. Генератор — _house.js.
import { house, houseProxy } from './_house.js';
export default { id: 'house_0', kind: 'prop', outline: false, opts: { w: 5.4, d: 4.0, floors: 2, cross: true, dormers: 1, ivy: true, wall: 0x7a6a50, wallTop: 0xd8c098, roof: 0x6a2a1e, roofTop: 0xc8603e, seed: 1 }, shadowProxy(kit) { return houseProxy(kit, this.opts); }, build(kit) { return house(kit, this.opts); } };
