// Сеты (сборка 16): три части — шлем, доспех, амулет (без требований, любой класс). Бонус за 2 и за 3 надетые части.
// Сеты навыков дают +ранги ветви (как свойство «+к навыкам»), остальные — обычные свойства (goldFind, hp, armorPct, dmgPct…).
// Части точатся у кузнеца как обычные вещи. Выпадают вместо части редких вещей и из сундуков Ордена (js/game/loot.js).
export const SET_SLOTS = ['head', 'chest', 'amulet'];
export const SET_BASE = { head: 'cap', chest: 'jerkin', amulet: 'amulet' };
export const SETS = {
  sword: { name: 'Клятва клинка', branch: 'sword', cls: ['warrior'], parts: { head: 'Шлем клятвы', chest: 'Бригантина клятвы', amulet: 'Знак клятвы' }, b2: { skills: 1 }, b3: { skills: 1, dmgPct: 15 } },
  fire: { name: 'Пепел Ордена', branch: 'fire', cls: ['warrior', 'mage'], parts: { head: 'Капюшон пепла', chest: 'Мантия пепла', amulet: 'Уголь пепла' }, b2: { skills: 1 }, b3: { skills: 1, dmgPct: 15 } },
  bow: { name: 'Вороново перо', branch: 'bow', cls: ['archer'], parts: { head: 'Маска пера', chest: 'Плащ пера', amulet: 'Коготь ворона' }, b2: { skills: 1 }, b3: { skills: 1, dmgPct: 15 } },
  ice: { name: 'Зимний предел', branch: 'ice', cls: ['archer', 'mage'], parts: { head: 'Венец предела', chest: 'Шуба предела', amulet: 'Льдинка предела' }, b2: { skills: 1 }, b3: { skills: 1, dmgPct: 15 } },
  light: { name: 'Глаз грозы', branch: 'light', cls: ['mage'], parts: { head: 'Обруч грозы', chest: 'Риза грозы', amulet: 'Глаз грозы' }, b2: { skills: 1 }, b3: { skills: 1, dmgPct: 15 } },
  gold: { name: 'Удачливый искатель', cls: ['warrior', 'archer', 'mage'], parts: { head: 'Шляпа искателя', chest: 'Куртка искателя', amulet: 'Монета искателя' }, b2: { goldFind: 30 }, b3: { goldFind: 40, crit: 4 } },
  guard: { name: 'Оплот Тихого Брода', cls: ['warrior', 'archer', 'mage'], parts: { head: 'Шлем оплота', chest: 'Доспех оплота', amulet: 'Печать оплота' }, b2: { hp: 90 }, b3: { armorPct: 30, hp: 60 } },
};
// текст бонуса для карточки
const NAMES = { goldFind: v => `+${v}% золота`, hp: v => `+${v} здоровья`, armorPct: v => `+${v}% защиты`, dmgPct: v => `+${v}% урона`, crit: v => `+${v}% шанса крита` };
export function bonusText(set, b) { const S = SETS[set]; return Object.entries(b).map(([k, v]) => k === 'skills' ? `+${v} ко всем навыкам ветви` : NAMES[k] ? NAMES[k](v) : `${k} +${v}`).join(', '); }
