// Секретная стена (тайл 'S'): чуть светлее кладки, с трещиной; исчезает, когда игра открывает тайник.
import { dwall } from './_dwall.js';
export default { id: 'wall_block', kind: 'prop', outline: false, texWorld: true, rim: 0.15, build(kit) { return dwall(kit, this, 'secret'); } };
