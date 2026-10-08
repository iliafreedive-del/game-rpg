// Страж глубин (босс этажа Глубин, тип elite_guard с e.model): костяной полководец с секирой — тот же риг, что у Стража Медальона (сборка 57).
import { eliteRig } from './elite_guard.js';
import { mobSkin } from './_skin.js';
export default { id: 'elite_warlord', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, eliteRig(kit), 'elite_warlord_m'); } };
