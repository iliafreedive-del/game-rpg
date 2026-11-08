// Староста Эдрик: седая борода, красная мантия с капюшоном (Meshy, сборка 56); без шкуры — процедурный житель.
import { villager } from './_villager.js';
import { skinnedNpc } from './_skinned.js';
export default { id: 'npc_elder', kind: 'npc', outline: 'mob', build: kit => skinnedNpc(kit, 'npc_elder', () => villager(kit, { cloth: 0x4a3a6a, clothTop: 0x7a62a8, sleeve: 0x4a3a6a, hair: 0xcfcfd4, beard: 0xe6e6ea, hat: 'cap', hatColor: 0x2c2450, height: 1.62 })) };
