// Хозяйка Колеса Фортуна: тёмно-фиолетовая мантия со звёздами, чалма с самоцветом, вуаль, золотые украшения; сидит у таверны и ждёт посетителей.
import { villager } from './_villager.js';
export default { id: 'npc_fortune', kind: 'npc', outline: 'mob', build: kit => villager(kit, { dress: { c: 0x3a2270, top: 0x7a52d0, trim: 0xf0c868 }, cloth: 0x3a2270, clothTop: 0x7a52d0, sleeve: 0x5a3aa0, cuff: 0xf0c868, necklace: true, scarf: 0x6a2a9a, scarfTop: 0xb078f0, scarfTrim: 0xf0c868, veil: 0xcfa8ff, hair: 0x1a1020, skin: 0xd8a07a, eye: 0xc8a0ff, girth: 0.95, height: 1.6, rim: 0xcfa8ff }) };
