import { tower } from './_fort.js';
export default { id: 'watchtower', kind: 'prop', outline: false, build(kit) { return tower(kit, this, 'wood'); } };
