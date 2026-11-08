// Хозяйка Колеса Фортуна: фиолетовые одежды с золотом, чалма, вуаль (Meshy, сборка 56); без шкуры — процедурная жительница.
import { villager } from './_villager.js';
import { skinnedNpc } from './_skinned.js';
export default { id: 'npc_fortune', kind: 'npc', outline: 'mob', build: kit => skinnedNpc(kit, 'npc_fortune', () => villager(kit, { dress: { c: 0x3a2270, top: 0x7a52d0, trim: 0xf0c868 }, cloth: 0x3a2270, clothTop: 0x7a52d0, sleeve: 0x5a3aa0, cuff: 0xf0c868, necklace: true, scarf: 0x6a2a9a, scarfTop: 0xb078f0, scarfTrim: 0xf0c868, veil: 0xcfa8ff, hair: 0x1a1020, skin: 0xd8a07a, eye: 0xc8a0ff, girth: 0.95, height: 1.6, rim: 0xcfa8ff }), { rimColor: 0xe0c8ff }) };
