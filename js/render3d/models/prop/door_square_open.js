// door_square_open: см. _door_arch.js — створки двери Цитадели распахиваются
import { doorArch } from './_door_arch.js';
export default { id: 'door_square_open', kind: 'prop', outline: false, texWorld: true, build(kit, o = {}) { return doorArch(kit, this, { open: true, span: o.span, square: true }); } };
