// door: см. _door.js. Поворот задаёт слой окружения по флагу игры flip (коридор вдоль X → дверь поперёк).
import { door } from './_door.js';
export default { id: 'door', kind: 'prop', outline: false, texWorld: true, build(kit) { return door(kit, this, { open: false, gate: false }); } };
