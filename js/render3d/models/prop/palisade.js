import { wallSeg } from './_fort.js';
export default { id: 'palisade', kind: 'prop', batch: true, outline: false, build(kit) { return wallSeg(kit, this, 'wood'); } };
