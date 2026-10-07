// door_arch_open: см. _door_arch.js — створки распахиваются
import { doorArch } from './_door_arch.js';
export default { id: 'door_arch_open', kind: 'prop', outline: false, texWorld: true, build(kit) { return doorArch(kit, this, { open: true }); } };
