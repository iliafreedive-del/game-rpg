// Сундук (chest): см. _chest.js. Модель меняется на лету, когда игра открывает сундук.
import { chest } from './_chest.js';
export default { id: 'chest', kind: 'prop', outline: false, build(kit) { return chest(kit, this, { open: false, rich: false }); } };
