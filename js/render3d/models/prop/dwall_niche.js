// Стена подземелья (niche) — см. _dwall.js. Ставится слоем окружения по тайлам карты (dungeon.js wallPieces).
import { dwall } from './_dwall.js';
export default { id: 'dwall_niche', kind: 'prop', batch: true, outline: false, texWorld: true, rim: 0.15, ao: 0.55, aoH: 1.2, shadowProxy(kit) { return kit.part(new kit.THREE.BoxGeometry(1, 3.0, 1), 0, [0, 3.0 / 2, 0]); }, build(kit) { return dwall(kit, this, 'niche'); } };
