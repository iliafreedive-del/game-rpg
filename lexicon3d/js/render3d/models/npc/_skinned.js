// Житель деревни из Meshy (сборка 56): модель на скелете героя (tools/art/npc_meshy.py → assets/models/<SKIN>.*), стоит как
// нарисована, при разговоре жестикулирует. Пока шкура не загрузилась или «Новые модели» выключены — прежний процедурный житель.
import { heroModel } from '../hero/_hero.js';
export function skinnedNpc(kit, SKIN, fallback, o = {}) {
  if (!(kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(SKIN))) return fallback();
  const m = heroModel(kit, { noCape: true }), B = m.bones, idle = m.anims.idle;
  // разговор: левая рука поднимается в жесте, голова кивает — поверх позы покоя
  m.anims.talk = a => {
    idle(a); const g = Math.sin(a.t * 3.1) * 0.5 + 0.5;
    B.armL.rotation.x -= 0.35 + g * 0.25; B.elL.rotation.x -= 0.4 + g * 0.3; B.head.rotation.x += Math.sin(a.t * 4.2) * 0.05; B.torso.rotation.y += Math.sin(a.t * 1.3) * 0.08;
  };
  m.clips.talk = { loop: true };
  if (o.anims) Object.assign(m.anims, o.anims(m)), Object.assign(m.clips, o.clips || {});
  return kit.skin.attachSkin(kit, m, SKIN, { noEquip: ['handR', 'handL'], legK: 0.92, rim: 0.5, rimColor: o.rimColor ?? 0xffd8b0 });
}
