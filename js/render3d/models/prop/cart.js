// Пустая ручная телега (_cart.js): у ворот полей, брошенная за рекой.
import { cart } from './_cart.js';
export default { id: 'cart', kind: 'prop', batch: true, outline: false, build(kit) { return cart(kit, this, false); } };
