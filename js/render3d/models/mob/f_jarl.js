// Ярл Хрольф Костолом: страж-ярл в короне и кирасе, меховая накидка, секира и щит; ледяная палитра. Сборка 57 — модель f_jarl_m с Диска (папка «фьорд»).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'f_jarl', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'crown', heavy: true, scale: 1.45, fur: 0xdfe8f0, furL: 0xffffff, pal: { bone: 0xb8d4e6, boneD: 0x6f8ea6, boneL: 0xeaf6ff, iron: 0x4a5f7a, ironL: 0xa8c4e0, rust: 0x3f5a7a, rustL: 0x9ac0e0, eye: 0x7aeaff }, cloth: 0x24405a, clothL: 0x6a9ac0, rimColor: 0xcfeaff, weapons: { handR: 'axe_great', handL: 'shield_bone' } }), 'f_jarl_m', { rimColor: 0xcfeaff }); } };
