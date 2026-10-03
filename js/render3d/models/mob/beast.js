// Пещерный зверь: массивный горбатый хищник (заготовка — _beast.js).
import { beastModel } from './_beast.js';
export default { id: 'beast', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { anat: 'beast', id: 'beast', strip: 'short', stripMane: 'long' }); } };
