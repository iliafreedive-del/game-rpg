// Гружёная телега (_cart.js): ящики, мешок, тыква, сыр, фонарь — у лавки и в лагерях.
import { cart } from './_cart.js';
export default { id: 'cart_load', kind: 'prop', batch: true, outline: false, build(kit) { return cart(kit, this, true); } };
