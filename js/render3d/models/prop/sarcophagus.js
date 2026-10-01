// Саркофаг (sarcophagus): см. _sarc.js. Длинной стороной вдоль Z (как коллайдер игры).
import { sarcophagus } from './_sarc.js';
export default { id: 'sarcophagus', kind: 'prop', outline: false, build(kit) { return sarcophagus(kit, this, false); } };
