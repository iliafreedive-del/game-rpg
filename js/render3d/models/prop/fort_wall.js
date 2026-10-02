import { wallSeg } from './_fort.js';
export default { id: 'fort_wall', kind: 'prop', batch: true, outline: false, build(kit) { return wallSeg(kit, this, 'ice'); } };
