// Сундук (chest_rich_open): см. _chest.js. Модель меняется на лету, когда игра открывает сундук.
import { chest } from './_chest.js';
export default { id: 'chest_rich_open', kind: 'prop', outline: false, build(kit) { return chest(kit, this, { open: true, rich: true }); } };
