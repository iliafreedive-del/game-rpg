// Наставник Элвин: поджарый, красный плащ, короткие волосы.
// Новая модель — Элвин из Meshy (tools/art/pose_npc.py → glb_rig.py → assets/models/npc_trainer.*) на скелете героя: в покое
// стоит с мечом в правом кулаке, удар — анимация героя, за клинком тянется след. Пока не загрузился или «Новые модели»
// выключены — прежний процедурный житель.
import { villager } from './_villager.js';
import { heroModel } from '../hero/_hero.js';
const SKIN = 'npc_trainer';
// хват и острие меча (метры модели, из pose_npc.py × 1.84/2.0): след идёт по клинку от гарды до острия
const GRIP = [-0.363, 0.917, 0.364], TIP = [-0.175, 1.964, 0.855];
export default { id: 'npc_trainer', kind: 'npc', outline: 'mob', build(kit) {
  if (kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(SKIN)) {
    const m = heroModel(kit, { noCape: true });
    const base = GRIP.map((g, i) => g + (TIP[i] - g) * 0.22);   // от гарды, а не от кулака
    return kit.skin.attachSkin(kit, m, SKIN, { noEquip: ['handR', 'handL'], legK: 0.92, rim: 0.55, rimColor: 0xffd8b0, trail: { bone: 'handR', from: base, to: TIP, color: 0xe8eeff } });
  }
  return villager(kit, { cloth: 0x8a2f34, clothTop: 0xc4545a, sleeve: 0x5a5a68, sash: 0xd6a548, hair: 0x3a2a1a, rim: 0xffd8b0, height: 1.84 });
} };
