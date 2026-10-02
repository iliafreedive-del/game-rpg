// gate_sealed: см. _door.js. Поворот задаёт слой окружения по флагу игры flip (коридор вдоль X → дверь поперёк).
import { door } from './_door.js';
export default { id: 'gate_sealed', kind: 'prop', outline: false, texWorld: true, build(kit) { return door(kit, this, { open: false, gate: true }); } };
