// Ётун-великан. Правки 3: вместо старого процедурного скелета-исполина — новая модель великана из папки «фьорд» (Frosthorn Warden,
// f_boss_m — та же, что у Ётуна Скъёльда), светлее и в инее, без короны; пока модель не загрузилась — прежний скелет-исполин.
import { skeleton } from './_skeleton.js';
import { bossModel } from './_boss.js';
import { mobSkin } from './_skin.js';
const OLD = kit => skeleton(kit, { head: 'viking', heavy: true, scale: 2.3, fur: 0xdfe8f0, furL: 0xffffff, spikes: 0x8ad8ff, pal: { bone: 0xb8d4e6, boneD: 0x6f8ea6, boneL: 0xeaf6ff, iron: 0x4a5f7a, ironL: 0xa8c4e0, rust: 0x3f5a7a, rustL: 0x9ac0e0, eye: 0x7aeaff }, cloth: 0x3a5a7a, clothL: 0x8ab4d8, rimColor: 0xcfeaff, weapons: { handR: 'club_giant' } });
export default { id: 'f_jotun', kind: 'mob', outline: 'mob', build(kit) {
  if (!(kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded('f_boss_m'))) return OLD(kit);
  return mobSkin(kit, bossModel(kit, { SK: 0x8ab0c8, SKL: 0xd8eef8, HOOD: 0x34485e, HOODL: 0x7aa4c4, IR: 0x4a6078, IRL: 0xb0cce4, LE: 0x46566a, LEL: 0x8aa4bc, rim: 0xe0f4ff, core: 0x9ae0ff, scale: 1.05 }), 'f_boss_m', { rimColor: 0xe0f4ff, tint: 0xdcecff });
} };
