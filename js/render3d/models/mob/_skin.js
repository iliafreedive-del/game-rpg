// сборка 57: «шкура» нежити подземелий из модели художника (tools/art/glb_mob.py → assets/models/<имя>.bin/.json/.webp).
// Оружие — отдельный предмет внутри модели, приклеен к кисти (кость handR/handL), поэтому процедурное оружие не надевается.
export const mobSkin = (kit, m, name, o = {}) => kit.skin && kit.skin.SKINS.on && kit.skin.skinLoaded(name)
  ? kit.skin.attachSkin(kit, m, name, { noEquip: ['handR', 'handL'], rim: 0.6, rimColor: kit.MOB.rimColor.skel, ...o }) : m;
