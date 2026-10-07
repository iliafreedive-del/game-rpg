// door_arch: см. _door_arch.js — двустворчатая дверь к Хранителю амулета (закрыта)
import { doorArch } from './_door_arch.js';
export default { id: 'door_arch', kind: 'prop', outline: false, texWorld: true, build(kit, o = {}) { return doorArch(kit, this, { open: false, span: o.span }); } };
