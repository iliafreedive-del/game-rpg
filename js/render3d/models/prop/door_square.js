// door_square: см. _door_arch.js — двустворчатая дверь Цитадели с прямым верхом (закрыта)
import { doorArch } from './_door_arch.js';
export default { id: 'door_square', kind: 'prop', outline: false, texWorld: true, build(kit, o = {}) { return doorArch(kit, this, { open: false, span: o.span, square: true }); } };
