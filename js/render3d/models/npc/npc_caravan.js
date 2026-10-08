// Караванщик Кофи (сборка 58): торговец зверьками из Пустошей — тёмная кожа, чёрная борода, синий тюрбан с бирюзой,
// песочный халат с бирюзовым кушаком. Процедурный житель (_villager.js), модели Meshy пока нет.
import { villager } from './_villager.js';
export default { id: 'npc_caravan', kind: 'npc', outline: 'mob', build: kit => villager(kit, {
  skin: 0x4a2c1c, skinTop: 0x7a4c32, blush: 0x5a3020, eye: 0x2a1a10, hair: 0x14100c, beard: 0x14100c, beardTop: 0x3a2a20,
  cloth: 0xc89a50, clothTop: 0xf0d8a0, sleeve: 0xb08040, cuff: 0x2a9a9a, collar: 0xd6a548, sash: 0x2a9a9a, necklace: true,
  pants: 0x5a3a24, turban: 0x24347a, turbanTop: 0x5a7ad0, gem: 0x40e0d0, girth: 1.1, height: 1.82, rim: 0xffd8a0,
}) };
