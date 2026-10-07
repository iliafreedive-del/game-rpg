// «Дары Бездны» — run-only boons chosen during a Depths floor (1 of 3 cards). They reset when the floor ends.
export const BOONS = {
  giant:   { name: 'Сила титана', glyph: '⚔', color: '#ff9a5a', desc: '+15% ко всему урону.' },
  frenzy:  { name: 'Неистовство', glyph: '⚡', color: '#ffd24a', desc: '+12% к скорости атаки.' },
  eagle:   { name: 'Орлиный глаз', glyph: '◎', color: '#9bd06c', desc: '+5% шанс крита, +20% крит. урона.' },
  vitality:{ name: 'Кровь дракона', glyph: '♥', color: '#ff6b6b', desc: '+15% здоровья, лечение 2% за каждое убийство.' },
  haste:   { name: 'Крылья тени', glyph: '»', color: '#b9a4ff', desc: '+12% к скорости бега, уклонение перезаряжается быстрее.' },
  burn:    { name: 'Пламенная длань', glyph: '♨', color: '#ff8a3c', desc: 'Каждый удар с шансом 35% поджигает врага.' },
  frost:   { name: 'Ледяная кромка', glyph: '❄', color: '#8fdcff', desc: 'Удары замедляют и копят холод — третий заряд замораживает.' },
  storm:   { name: 'Грозовое сердце', glyph: 'ϟ', color: '#c8b4ff', desc: 'Критический удар выпускает цепную молнию на 3 врагов.' },
  boom:    { name: 'Прах к праху', glyph: '✹', color: '#ffb06a', desc: 'Убитые враги взрываются, раня соседей.' },
  nova:    { name: 'Кольцо Бездны', glyph: '◌', color: '#c07bff', desc: 'Каждые 4 с вокруг героя вспыхивает кольцо фиолетового огня.' },
  blades:  { name: 'Танцующие клинки', glyph: '✦', color: '#e8e2d4', desc: 'Два призрачных клинка вращаются вокруг героя и режут врагов.' },
  split:   { name: 'Расщепление', glyph: '⋔', color: '#6ea8ff', desc: 'Выстрелы и заряды делятся натрое; удары в ближнем бою задевают всех рядом.' },
  greed:   { name: 'Жадность дракона', glyph: '⛁', color: '#f2cf4a', desc: '+25% золота до конца этажа.' },
};
export const BOON_IDS = Object.keys(BOONS);
