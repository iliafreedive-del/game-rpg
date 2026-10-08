// Питомцы каравана (сборка 58): продаёт Караванщик Кофи за осколки Бездны ◆. С героем ходит один питомец.
// Бьют слабо (k — доля среднего удара героя), зато у каждого свой эффект (fx, см. js/game/pets.js).
// tier: 0 обычный / 1 редкий / 2 эпический — цена, уровень героя и цена улучшения. Уровень питомца 1..PET_MAX: +15% силы за уровень.
export const PET_MAX = 5;
export const TIERS = [
  { name: 'Обычный', price: 6, lvl: 1, up: 3, color: '#cfd6dc' },
  { name: 'Редкий', price: 12, lvl: 5, up: 5, color: '#6ab4ff' },
  { name: 'Эпический', price: 20, lvl: 9, up: 8, color: '#f0b030' },
];
export const PETS = {
  scarab:   { name: 'Песчаный скарабей', icon: '🪲', tier: 0, k: 0.14, cd: 1.3, reach: 0.9, fx: 'slow', desc: 'Кусает и замедляет врага.' },
  fennec:   { name: 'Огненный фенек', icon: '🦊', tier: 0, k: 0.12, cd: 1.2, reach: 0.9, fx: 'burn', desc: 'Поджигает врага: урон идёт ещё 3 секунды.' },
  crow:     { name: 'Ворон-ищейка', icon: '🐦', tier: 0, k: 0.10, cd: 1.4, reach: 1.0, fx: 'loot', desc: 'Находит у павших спрятанное золото, иногда приносит осколок Бездны.' },
  scorpid:  { name: 'Детёныш скорпида', icon: '🦂', tier: 1, k: 0.10, cd: 1.2, reach: 0.9, fx: 'poison', desc: 'Отравляет: яд копится до 5 раз.' },
  wisp:     { name: 'Блуждающий огонёк', icon: '✨', tier: 1, k: 0.08, cd: 1.5, reach: 5, ranged: true, fx: 'heal', desc: 'Раз в 5 секунд лечит героя, стреляет искрами.' },
  cobra:    { name: 'Пустынная кобра', icon: '🐍', tier: 1, k: 0.11, cd: 1.3, reach: 1.0, fx: 'expose', desc: 'Укус ослабляет врага: он получает больше урона.' },
  skull:    { name: 'Костяной череп', icon: '💀', tier: 2, k: 0.15, cd: 1.4, reach: 7, ranged: true, fx: 'needle', desc: 'Летает рядом и стреляет иглами по дальним целям.' },
  basilisk: { name: 'Василиск', icon: '🦎', tier: 2, k: 0.12, cd: 1.3, reach: 1.0, fx: 'stun', desc: 'Взгляд оглушает врага на полсекунды.' },
  bat:      { name: 'Летучая мышь Бездны', icon: '🦇', tier: 2, k: 0.12, cd: 1.1, reach: 1.0, fx: 'leech', desc: 'Кусает, и часть урона лечит героя.' },
  golem:    { name: 'Голем из песчаника', icon: '🗿', tier: 2, k: 0.07, cd: 1.8, reach: 1.1, fx: 'shield', speed: 0.85, desc: 'Бьёт слабо, зато раз в 8 секунд закрывает героя каменным щитом.' },
};
export const petPrice = id => TIERS[PETS[id].tier].price;
export const petUpCost = (id, lvl) => TIERS[PETS[id].tier].up * lvl;
export const petReqLevel = id => TIERS[PETS[id].tier].lvl;
export const GIFT_PET = 'scarab';   // первого зверька Кофи дарит
