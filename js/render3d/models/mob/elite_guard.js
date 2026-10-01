// Страж Медальона (элита): скелет-великан в кирасе и топхельме с рогами, двуручная секира. Крупнее героя.
import { skeleton } from './_skeleton.js';
export default { id: 'elite_guard', kind: 'mob', outline: 'mob', build(kit) { return skeleton(kit, { head: 'great', heavy: true, scale: 1.4, cloth: 0x3a1420, clothL: 0x7a2a3a, weapons: { handR: 'axe_great', handL: 'shield_bone' } }); } };
