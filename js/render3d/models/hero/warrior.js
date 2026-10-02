// Герой-воин «Рыцарь Ордена»: рогатый рыцарь 1:4 (заготовка — _hero.js; формат — docs/MODEL_SPEC.md).
import { heroModel } from './_hero.js';
export default { id: 'warrior', kind: 'hero', outline: 'hero', build(kit) { return heroModel(kit, {}); } };
