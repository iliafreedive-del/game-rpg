import { fence } from './fence_x.js';
export default { id: 'fence_y', kind: 'prop', batch: true, outline: false, build(kit) { return fence(kit, this, true); } };
