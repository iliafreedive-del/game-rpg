// «Походы»: открытые локации-поля с порталов деревни — Фьорды Скъёльда, Старый Лес и Костяные пустоши.
// Здесь только данные: мобы, миры, настроение по глубине, задания. Логика — world/wildgen.js, game/wildai.js, game/wild.js.
//
// Поля мобов: from/filter/size — временная графика (перекраска существующих спрайтов), tele — телеграф атаки
// {shape: cone|circle|line, at: self|target, r, arc, w, rift(фиолетовый), elem, slow, mult}.

const T = (shape, o) => ({ shape, ...o });

export const WILD_MOBS = {
  // ------------------------------------------------------------- Фьорды
  f_draugr: { realm: 'fjord', name: 'Драугр-щитоносец', from: 'skel_warrior', filter: 'hue-rotate(170deg) saturate(.8) brightness(1.1)', size: 1.1, ai: 'melee', hp: 40, dmg: [4, 7], speed: 2.2, range: 1.2, cd: 2.0, impact: 0.55, xp: 16, gold: [3, 8], armor: 14, radius: 0.36, fps: { walk: 10, attack: 10 } },
  f_wolf: { realm: 'fjord', name: 'Ледяной волк', from: 'beast', filter: 'saturate(.12) brightness(1.5)', size: 0.96, ai: 'pack', hp: 20, dmg: [3, 5], speed: 4.3, range: 1.1, cd: 2.2, impact: 0.5, xp: 12, gold: [1, 4], armor: 3, radius: 0.34, onHit: 'slow', fps: { walk: 16, attack: 12 }, tele: { lunge: T('line', { r: 3.4, w: 0.6 }) } },
  f_berserk: { realm: 'fjord', name: 'Берсерк', from: 'skel_warrior', filter: 'sepia(1) saturate(3.5) hue-rotate(-35deg) brightness(1.05)', size: 1.12, ai: 'charge', hp: 36, dmg: [5, 9], speed: 3.1, range: 1.2, cd: 1.5, impact: 0.5, xp: 20, gold: [3, 9], armor: 5, radius: 0.36, charge: { r: 4.2, w: 0.8, cd: 5.5, speed: 8.5, mult: 1.3 }, fury: 0.5, fps: { walk: 13, attack: 12 }, tele: { lunge: T('line', { r: 4.2, w: 0.8 }) } },
  f_hag: { realm: 'fjord', name: 'Снежная ведьма', from: 'skel_mage', filter: 'hue-rotate(150deg) brightness(1.3) saturate(.9)', size: 1.0, ai: 'caster', hp: 26, dmg: [5, 8], elem: 'cold', onHit: 'slow', speed: 2.1, range: 8, keep: 6, cd: 2.8, impact: 0.55, xp: 24, gold: [5, 12], armor: 2, radius: 0.32, proj: 'shard', fps: { attack: 8 } },
  f_jotun: { realm: 'fjord', name: 'Ётун-великан', from: 'beast', filter: 'hue-rotate(160deg) saturate(.6) brightness(1.55)', size: 1.75, ai: 'giant', hp: 150, dmg: [10, 15], speed: 1.8, range: 2.0, cd: 2.4, impact: 0.6, xp: 70, gold: [15, 35], armor: 14, radius: 0.62, onHit: 'slow', fps: { walk: 8, attack: 7 }, tele: { attack: T('cone', { r: 2.8, arc: 100, mult: 1.0 }), attack2: T('circle', { at: 'target', r: 2.1, mult: 1.2, rift: true, elem: 'cold', slow: 2 }) } },
  f_jarl: { realm: 'fjord', name: 'Ярл Хрольф Костолом', from: 'elite', filter: 'hue-rotate(160deg) brightness(1.2) saturate(.9)', size: 1.18, elite: true, ai: 'jarl', hp: 300, dmg: [10, 15], speed: 2.6, range: 1.8, cd: 1.8, impact: 0.6, xp: 220, gold: [90, 140], armor: 22, radius: 0.52, minion: ['f_draugr', 'f_berserk'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.7, arc: 80 }), attack2: T('circle', { at: 'self', r: 2.6, mult: 0.9 }) } },
  f_boss: { realm: 'fjord', name: 'Ётун Скъёльд', from: 'boss', filter: 'hue-rotate(165deg) brightness(1.25) saturate(.8)', size: 1.2, boss: true, ai: 'wildboss', hp: 800, dmg: [12, 18], speed: 2.4, range: 2.5, cd: 1.7, impact: 0.6, xp: 700, gold: [260, 340], armor: 28, radius: 0.8, onHit: 'slow', minion: ['f_wolf', 'f_wolf', 'f_draugr'], novaElem: 'cold', fps: { walk: 9, attack: 10, attack2: 10, slam: 11, roar: 9 }, tele: { attack: T('cone', { r: 3.4, arc: 75 }), attack2: T('circle', { at: 'self', r: 3.2, mult: 0.9 }), slam: T('circle', { at: 'target', r: 2.2, mult: 1.3, rift: true, elem: 'cold', slow: 2.5 }) } },

  // ------------------------------------------------------------- Старый Лес
  w_boar: { realm: 'forest', name: 'Секач', from: 'beast', filter: 'sepia(1) saturate(1.6) brightness(.8)', size: 0.88, ai: 'charge', hp: 38, dmg: [6, 10], speed: 2.9, range: 1.2, cd: 1.8, impact: 0.5, xp: 17, gold: [2, 7], armor: 7, radius: 0.4, charge: { r: 5.5, w: 0.9, cd: 4.5, speed: 9.5, mult: 1.5, crashStun: 1.4 }, fps: { walk: 12, attack: 12 }, tele: { lunge: T('line', { r: 5.5, w: 0.9 }) } },
  w_wolf: { realm: 'forest', name: 'Серый волк', from: 'beast', filter: 'saturate(.1) brightness(.85)', size: 0.96, ai: 'pack', hp: 18, dmg: [3, 5], speed: 4.3, range: 1.1, cd: 2.2, impact: 0.5, xp: 11, gold: [1, 4], armor: 2, radius: 0.34, fps: { walk: 16, attack: 12 }, tele: { lunge: T('line', { r: 3.4, w: 0.6 }) } },
  w_poacher: { realm: 'forest', name: 'Браконьер', from: 'skel_archer', filter: 'sepia(1) saturate(1.8) brightness(.85)', size: 1.05, ai: 'archer', hp: 22, dmg: [4, 7], speed: 2.4, range: 8.5, keep: 5.5, cd: 2.0, impact: 0.66, xp: 16, gold: [4, 10], armor: 3, radius: 0.32, proj: 'arrow', fps: { attack: 9 } },
  w_leshy: { realm: 'forest', name: 'Леший', from: 'skel_mage', filter: 'hue-rotate(75deg) saturate(1.7) brightness(.9)', size: 1.22, ai: 'root', hp: 46, dmg: [6, 10], speed: 2.0, range: 8, keep: 6, cd: 3.3, impact: 0.6, xp: 30, gold: [6, 14], armor: 6, radius: 0.36, fps: { attack: 8 }, tele: { attack: T('circle', { at: 'target', r: 1.8, mult: 1.0, rift: true, slow: 2.2 }) } },
  w_bear: { realm: 'forest', name: 'Медведь-шатун', from: 'beast', filter: 'sepia(.8) brightness(.55) saturate(1.2)', size: 1.4, ai: 'giant', hp: 120, dmg: [9, 14], speed: 2.3, range: 1.9, cd: 2.2, impact: 0.55, xp: 60, gold: [10, 26], armor: 12, radius: 0.6, enrage: 0.5, fps: { walk: 9, attack: 9 }, tele: { attack: T('cone', { r: 2.4, arc: 95, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.2, mult: 1.1 }) } },
  w_ataman: { realm: 'forest', name: 'Атаман Рваное Ухо', from: 'elite', filter: 'sepia(1) saturate(2.2) hue-rotate(-20deg) brightness(.95)', size: 1.12, elite: true, ai: 'jarl', hp: 280, dmg: [9, 14], speed: 2.7, range: 1.8, cd: 1.7, impact: 0.6, xp: 200, gold: [80, 130], armor: 18, radius: 0.5, minion: ['w_poacher', 'w_wolf', 'w_wolf'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.6, arc: 80 }), attack2: T('circle', { at: 'self', r: 2.4, mult: 0.9 }) } },
  w_boss: { realm: 'forest', name: 'Хозяин Чащи', from: 'boss', filter: 'hue-rotate(90deg) saturate(1.5) brightness(.9)', size: 1.25, boss: true, ai: 'wildboss', hp: 720, dmg: [12, 17], speed: 2.5, range: 2.5, cd: 1.7, impact: 0.6, xp: 650, gold: [240, 320], armor: 24, radius: 0.8, minion: ['w_wolf', 'w_wolf', 'w_boar'], novaElem: 'phys', fps: { walk: 9, attack: 10, attack2: 10, slam: 11, roar: 9 }, tele: { attack: T('cone', { r: 3.4, arc: 75 }), attack2: T('circle', { at: 'self', r: 3.2, mult: 0.9 }), slam: T('circle', { at: 'target', r: 2.2, mult: 1.3, rift: true, slow: 2.5 }) } },
  // ------------------------------------------------------------- Костяные пустоши (сборка 17: дикари и скорпион пока на временных моделях — заменятся в сборке 18)
  b_raider: { realm: 'bones', name: 'Клыкач-рубака', from: 'skel_warrior', filter: 'sepia(1) saturate(2.4) hue-rotate(-25deg) brightness(.95)', size: 1.12, ai: 'melee', hp: 34, dmg: [4, 7], speed: 2.5, range: 1.2, cd: 1.8, impact: 0.55, xp: 15, gold: [3, 8], armor: 8, radius: 0.38, fps: { walk: 11, attack: 11 } },
  b_thrower: { realm: 'bones', name: 'Клыкач-метатель', from: 'skel_archer', filter: 'sepia(1) saturate(2) hue-rotate(-20deg) brightness(.95)', size: 1.05, ai: 'archer', hp: 22, dmg: [4, 7], speed: 2.4, range: 8, keep: 5.5, cd: 2.1, impact: 0.66, xp: 15, gold: [4, 10], armor: 3, radius: 0.34, proj: 'bone', fps: { attack: 9 } },
  b_hyena: { realm: 'bones', name: 'Пятнистая гиена', from: 'beast', filter: 'sepia(1) saturate(1.3) brightness(1.05)', size: 0.78, ai: 'pack', hp: 17, dmg: [3, 5], speed: 4.4, range: 1.1, cd: 2.1, impact: 0.5, xp: 11, gold: [1, 4], armor: 2, radius: 0.33, fps: { walk: 16, attack: 12 }, tele: { lunge: T('line', { r: 3.4, w: 0.6 }) } },
  b_boar: { realm: 'bones', name: 'Пустынный кабан', from: 'beast', filter: 'sepia(1) saturate(2) hue-rotate(-15deg) brightness(.9)', size: 0.9, ai: 'charge', hp: 36, dmg: [6, 9], speed: 2.9, range: 1.2, cd: 1.8, impact: 0.5, xp: 16, gold: [2, 7], armor: 7, radius: 0.4, charge: { r: 5.5, w: 0.9, cd: 4.5, speed: 9.5, mult: 1.5, crashStun: 1.4 }, fps: { walk: 12, attack: 12 }, tele: { lunge: T('line', { r: 5.5, w: 0.9, mult: 1.5 }) } },
  b_shaman: { realm: 'bones', name: 'Шаман-костогрыз', from: 'skel_mage', filter: 'sepia(1) saturate(2.6) hue-rotate(-30deg) brightness(1)', size: 1.08, ai: 'root', hp: 40, dmg: [6, 9], speed: 2.0, range: 8, keep: 6, cd: 3.2, impact: 0.6, xp: 28, gold: [6, 14], armor: 5, radius: 0.34, fps: { attack: 8 }, tele: { attack: T('circle', { at: 'target', r: 1.8, mult: 1.0, rift: true, slow: 2.0 }) } },
  b_scorpid: { realm: 'bones', name: 'Скорпион-панцирник', from: 'beast', filter: 'sepia(1) saturate(1.5) hue-rotate(-30deg) brightness(.7)', size: 1.45, ai: 'giant', hp: 125, dmg: [9, 14], speed: 2.2, range: 1.9, cd: 2.2, impact: 0.55, xp: 62, gold: [10, 26], armor: 18, radius: 0.62, onHit: 'slow', fps: { walk: 10, attack: 9 }, tele: { attack: T('cone', { r: 2.4, arc: 90, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.6, mult: 1.3 }) } },
  b_chief: { realm: 'bones', name: 'Вождь Кровавый Клык', from: 'elite', filter: 'sepia(1) saturate(2.6) hue-rotate(-25deg) brightness(.95)', size: 1.15, elite: true, ai: 'jarl', hp: 290, dmg: [9, 14], speed: 2.6, range: 1.8, cd: 1.7, impact: 0.6, xp: 210, gold: [85, 135], armor: 20, radius: 0.52, minion: ['b_raider', 'b_hyena', 'b_hyena'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.2, arc: 110, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.8, mult: 1.4 }) } },
  b_boss: { realm: 'bones', name: 'Пробуждённый Костяной исполин', from: 'boss', filter: 'sepia(1) saturate(1.2) brightness(1.1)', size: 1.3, boss: true, ai: 'wildboss', hp: 760, dmg: [12, 18], speed: 2.4, range: 2.5, cd: 1.7, impact: 0.6, xp: 680, gold: [250, 330], armor: 26, radius: 0.85, minion: ['b_hyena', 'b_hyena', 'b_raider'], novaElem: 'phys', fps: { walk: 9, attack: 10, attack2: 10, slam: 11, roar: 9 }, tele: { attack: T('cone', { r: 3.4, arc: 75 }), attack2: T('circle', { at: 'self', r: 3.2, mult: 0.9 }), slam: T('circle', { at: 'target', r: 2.2, mult: 1.3, rift: true, slow: 2.5 }) } },
  // ------------------------------------------------------------- Разрушенный храм (портал с руками, со 2 уровня). model3d — чья 3D-модель
  // показывается, пока нет своих моделей из пака храма (мелкие мобы, 5 мини-боссов, большие боссы — заменятся по паку)
  t_warden: { realm: 'temple', name: 'Страж руин', from: 'skel_warrior', model3d: 'skel_warrior', filter: 'saturate(.3) brightness(1.15)', size: 1.05, ai: 'melee', hp: 26, dmg: [3, 5], speed: 2.4, range: 1.2, cd: 1.9, impact: 0.55, xp: 11, gold: [2, 6], armor: 6, radius: 0.36, fps: { walk: 11, attack: 11 } },
  t_archer: { realm: 'temple', name: 'Валунник', from: 'skel_archer', model3d: 'skel_archer', filter: 'saturate(.3) brightness(1.15)', size: 1.0, ai: 'archer', hp: 19, dmg: [3, 5], speed: 2.2, range: 8, keep: 5.5, cd: 2.2, impact: 0.66, xp: 11, gold: [3, 7], armor: 4, radius: 0.36, proj: 'rock', fps: { attack: 9 } },   // правки 2 (П18): Валунник бросает камни, не синюю ледышку
  t_hound: { realm: 'temple', name: 'Каменный волк', from: 'beast', model3d: 'bone_wolf', filter: 'saturate(.1) brightness(1.3)', size: 0.94, ai: 'pack', hp: 14, dmg: [2, 4], speed: 4.2, range: 1.1, cd: 2.2, impact: 0.5, xp: 9, gold: [1, 3], armor: 2, radius: 0.33, fps: { walk: 16, attack: 12 }, tele: { lunge: T('line', { r: 3.4, w: 0.6 }) } },
  t_ghoul: { realm: 'temple', name: 'Каменный латник', from: 'ghoul', model3d: 'ghoul', filter: 'hue-rotate(40deg) saturate(.6)', size: 1.0, ai: 'charge', hp: 24, dmg: [4, 6], speed: 2.8, range: 1.2, cd: 1.8, impact: 0.5, xp: 12, gold: [2, 6], armor: 3, radius: 0.36, charge: { r: 4.0, w: 0.8, cd: 5.5, speed: 8, mult: 1.25 }, fps: { walk: 12, attack: 12 }, tele: { lunge: T('line', { r: 4.0, w: 0.8 }) } },
  t_priest: { realm: 'temple', name: 'Дух ветра', from: 'skel_mage', model3d: 'skel_mage', filter: 'sepia(.6) saturate(1.4) brightness(1.1)', size: 1.0, ai: 'root', hp: 30, dmg: [4, 7], speed: 2.0, range: 8, keep: 6, cd: 3.3, impact: 0.6, xp: 18, gold: [4, 10], armor: 3, radius: 0.34, fps: { attack: 8 }, tele: { attack: T('circle', { at: 'target', r: 1.8, mult: 1.0, rift: true, slow: 2.0 }) } },
  t_golem: { realm: 'temple', name: 'Каменный голем', from: 'beast', model3d: 'f_jotun', filter: 'saturate(0) brightness(1.2)', size: 1.55, ai: 'giant', hp: 95, dmg: [7, 11], speed: 1.9, range: 1.9, cd: 2.3, impact: 0.6, xp: 45, gold: [8, 20], armor: 14, radius: 0.58, fps: { walk: 8, attack: 8 }, tele: { attack: T('cone', { r: 2.4, arc: 95, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.6, mult: 1.2 }) } },
  // сборка 59: каменные звери пака «каменная»
  t_boar: { realm: 'temple', name: 'Каменный вепрь', from: 'beast', model3d: 'w_boar', filter: 'saturate(0) brightness(1.3)', size: 0.9, ai: 'charge', hp: 34, dmg: [5, 8], speed: 2.8, range: 1.2, cd: 1.9, impact: 0.5, xp: 15, gold: [2, 7], armor: 9, radius: 0.42, charge: { r: 5.0, w: 0.9, cd: 5, speed: 9, mult: 1.4, crashStun: 1.2 }, fps: { walk: 12, attack: 12 }, tele: { lunge: T('line', { r: 5.0, w: 0.9 }) } },
  t_lion: { realm: 'temple', name: 'Каменный лев', from: 'beast', model3d: 'w_wolf', filter: 'saturate(0) brightness(1.3)', size: 1.05, ai: 'melee', hp: 44, dmg: [6, 9], speed: 3.4, range: 1.4, cd: 1.9, impact: 0.55, xp: 20, gold: [3, 8], armor: 8, radius: 0.46, fps: { walk: 14, attack: 12 } },
  t_stag: { realm: 'temple', name: 'Каменный олень', from: 'beast', model3d: 'w_wolf', filter: 'saturate(0) brightness(1.3)', size: 1.4, ai: 'charge', hp: 30, dmg: [4, 7], speed: 3.6, range: 1.3, cd: 2.0, impact: 0.5, xp: 15, gold: [2, 6], armor: 5, radius: 0.4, charge: { r: 6.0, w: 0.8, cd: 5.5, speed: 10, mult: 1.3 }, fps: { walk: 14, attack: 12 }, tele: { lunge: T('line', { r: 6.0, w: 0.8 }) } },
  // пять мини-боссов храма: по одному в святилище каждого из пяти лабиринтов
  t_mb_gate: { realm: 'temple', name: 'Привратник храма', from: 'elite', model3d: 'elite_guard', filter: 'saturate(.3) brightness(1.15)', size: 1.12, elite: true, mini: true, ai: 'jarl', hp: 170, dmg: [6, 10], speed: 2.5, range: 1.8, cd: 1.8, impact: 0.6, xp: 90, gold: [35, 60], armor: 14, radius: 0.5, minion: ['t_warden', 't_hound'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.1, arc: 90, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.4, mult: 1.3 }) } },
  t_mb_relic: { realm: 'temple', name: 'Лев-хранитель', from: 'elite', model3d: 'elite_warlord', filter: 'sepia(.5) brightness(1.1)', size: 1.14, elite: true, mini: true, ai: 'jarl', hp: 180, dmg: [6, 10], speed: 2.4, range: 1.9, cd: 1.8, impact: 0.6, xp: 95, gold: [35, 60], armor: 16, radius: 0.52, minion: ['t_warden', 't_archer'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.2, arc: 95, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.5, mult: 1.3 }) } },
  t_mb_paladin: { realm: 'temple', name: 'Каменный бык', from: 'elite', model3d: 'f_jarl', filter: 'saturate(.4) brightness(1.1)', size: 1.14, elite: true, mini: true, ai: 'jarl', hp: 190, dmg: [7, 11], speed: 2.6, range: 1.8, cd: 1.7, impact: 0.6, xp: 100, gold: [40, 65], armor: 18, radius: 0.52, minion: ['t_warden', 't_ghoul'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.1, arc: 90, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.4, mult: 1.3 }) } },
  t_mb_hierophant: { realm: 'temple', name: 'Каменный король', from: 'elite', model3d: 'w_ataman', filter: 'sepia(.6) saturate(1.3)', size: 1.12, elite: true, mini: true, ai: 'jarl', hp: 175, dmg: [7, 11], speed: 2.5, range: 1.8, cd: 1.8, impact: 0.6, xp: 100, gold: [40, 65], armor: 14, radius: 0.5, minion: ['t_priest', 't_hound', 't_hound'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.1, arc: 90, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.4, mult: 1.3 }) } },
  t_mb_sentinel: { realm: 'temple', name: 'Каменный часовой', from: 'elite', model3d: 'b_chief', filter: 'saturate(0) brightness(1.2)', size: 1.16, elite: true, mini: true, ai: 'jarl', hp: 210, dmg: [7, 12], speed: 2.3, range: 1.9, cd: 1.9, impact: 0.6, xp: 110, gold: [45, 70], armor: 20, radius: 0.54, minion: ['t_warden', 't_archer', 't_hound'], fps: { walk: 10, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.2, arc: 95, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.5, mult: 1.3 }) } },
  // большие боссы храма: Осквернитель — в святилище шестого уровня, Падший бог — на двенадцатом
  t_lord: { realm: 'temple', name: 'Владыка святилища', from: 'elite', model3d: 'w_boss', filter: 'saturate(.3) brightness(1.05)', size: 1.2, elite: true, ai: 'jarl', hp: 300, dmg: [9, 14], speed: 2.5, range: 2.2, cd: 1.8, impact: 0.6, xp: 220, gold: [90, 140], armor: 20, radius: 0.7, minion: ['t_warden', 't_priest', 't_hound'], fps: { walk: 9, attack: 10, attack2: 10 }, tele: { attack: T('cone', { r: 2.6, arc: 100, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 2.8, mult: 1.3 }) } },
  t_boss: { realm: 'temple', name: 'Падший бог храма', from: 'boss', model3d: 'b_boss', filter: 'saturate(.2) brightness(1.2)', size: 1.3, boss: true, ai: 'wildboss', hp: 760, dmg: [12, 18], speed: 2.4, range: 2.5, cd: 1.7, impact: 0.6, xp: 680, gold: [250, 330], armor: 26, radius: 0.85, minion: ['t_warden', 't_hound', 't_golem'], novaElem: 'phys', fps: { walk: 9, attack: 10, attack2: 10, slam: 11, roar: 8 }, tele: { attack: T('cone', { r: 2.8, arc: 110, mult: 1.0 }), attack2: T('circle', { at: 'self', r: 3.2, mult: 1.2 }), slam: T('circle', { at: 'target', r: 2.4, mult: 1.5 }) } },
};

export const REALMS = {
  fjord: {
    id: 'fjord', name: 'Фьорды Скъёльда', short: 'Фьорды', portalColor: [150, 210, 255], portal: 'portal_spire', reqLevel: 5, baseLevel: 5,
    blurb: 'Снежные берега, замёрзшие заливы и крепости ётунов. Драугры, ледяные волки и снежные ведьмы держат захваченные форты.',
    pool: [['f_draugr', 1], ['f_wolf', 1], ['f_berserk', 1], ['f_hag', 2], ['f_jotun', 3]],   // [тип, с какой глубины]
    commander: 'f_jarl', boss: 'f_boss', fortName: 'Захваченный форт',
    // настроение по глубине (меняется каждые 2 уровня): пол, свет, туман, частицы
    moods: [
      { name: 'Берег', ground: [226, 234, 242], alt: [214, 226, 238], water: [58, 98, 140], tint: null, dark: false, fog: [10, 14, 24], particles: { c: [245, 250, 255], rate: 18, vz: -1.2, g: 0.2, size: 2.5, life: 2.4 }, lake: 0.10 },
      { name: 'Ледник', ground: [200, 218, 235], alt: [190, 210, 230], water: [40, 78, 125], tint: 'rgba(90,140,200,0.16)', dark: false, fog: [8, 14, 30], particles: { c: [225, 240, 255], rate: 34, vz: -2.0, g: 0.3, size: 2.5, life: 1.8 }, lake: 0.18 },
      { name: 'Чертоги ётунов', ground: [150, 176, 214], alt: [140, 166, 206], water: [22, 44, 90], tint: 'rgba(40,80,170,0.30)', dark: true, fog: [4, 8, 24], particles: { c: [150, 230, 255], rate: 22, vz: 0.5, g: -0.1, size: 3, life: 2.2 }, lake: 0.22 },
    ],
  },
  forest: {
    id: 'forest', name: 'Старый Лес', short: 'Лес', portalColor: [120, 230, 120], portal: 'portal_gate', reqLevel: 3, baseLevel: 3,
    blurb: 'Дремучий лес за околицей. Кабаны, волки и медведи; по тропам хозяйничают браконьеры, а в чаще бродит леший.',
    pool: [['w_boar', 1], ['w_wolf', 1], ['w_poacher', 1], ['w_leshy', 2], ['w_bear', 3]],
    commander: 'w_ataman', boss: 'w_boss', fortName: 'Разбойничий острог',
    moods: [
      { name: 'Опушка', ground: [70, 104, 48], alt: [58, 90, 40], water: [48, 84, 96], tint: null, dark: false, fog: [4, 10, 4], particles: { c: [255, 240, 170], rate: 8, vz: 0.4, g: -0.1, size: 2.5, life: 2.2 }, lake: 0.05 },
      { name: 'Чаща', ground: [52, 82, 40], alt: [42, 70, 34], water: [34, 64, 74], tint: 'rgba(10,40,20,0.25)', dark: false, fog: [2, 8, 4], particles: { c: [190, 255, 160], rate: 14, vz: 0.5, g: -0.1, size: 2.5, life: 2.4 }, lake: 0.08 },
      { name: 'Болотная глушь', ground: [40, 62, 40], alt: [32, 52, 36], water: [26, 52, 56], tint: 'rgba(10,30,30,0.32)', dark: true, fog: [2, 7, 8], particles: { c: [200, 255, 120], rate: 16, vz: 0.3, g: -0.1, size: 3, life: 2.8 }, lake: 0.16 },
    ],
  },
  bones: {
    id: 'bones', name: 'Костяные пустоши', short: 'Пустоши', portalColor: [255, 150, 70], portal: 'portal_bone', reqLevel: 12, baseLevel: 12,   // сборка 45: пустоши — Глава III, после форта Фьордов (уровни подняты с временных 2/3)
    blurb: 'Красная полупустыня среди костей древних великанов. Клыкастые дикари живут в хижинах из шкур и рёбер, в балках — гиены, кабаны и скорпионы. За полями — руины древних.',
    pool: [['b_raider', 1], ['b_hyena', 1], ['b_boar', 1], ['b_thrower', 1], ['b_shaman', 2], ['b_scorpid', 3]],
    commander: 'b_chief', boss: 'b_boss', fortName: 'Древние руины',
    moods: [
      { name: 'Красная степь', ground: [176, 102, 58], alt: [160, 92, 52], water: [48, 98, 104], tint: null, dark: false, fog: [24, 12, 6], particles: { c: [255, 220, 170], rate: 10, vz: 0.2, g: 0.05, size: 2.5, life: 2.6 }, lake: 0.02 },
      { name: 'Пыльные балки', ground: [168, 96, 56], alt: [150, 86, 50], water: [44, 90, 98], tint: 'rgba(160,80,30,0.12)', dark: false, fog: [26, 12, 6], particles: { c: [240, 200, 150], rate: 22, vz: 0.1, g: 0.02, size: 2.5, life: 2.4 }, lake: 0.02 },
      { name: 'Кладбище великанов', ground: [140, 80, 54], alt: [124, 70, 48], water: [34, 70, 80], tint: 'rgba(120,40,40,0.22)', dark: true, fog: [20, 8, 8], particles: { c: [255, 170, 110], rate: 14, vz: 0.4, g: -0.05, size: 3, life: 2.6 }, lake: 0.0 },
    ],
  },
  temple: {
    id: 'temple', name: 'Разрушенный храм', short: 'Храм', portalColor: [255, 214, 150], portal: 'portal_hands', reqLevel: 2, baseLevel: 2,
    blurb: 'Каменный храм древних, расколотый и заросший кустами. Его коридоры каждый раз ложатся по-новому. В святилище каждого лабиринта ждёт свой страж.',
    pool: [['t_warden', 1], ['t_hound', 1], ['t_archer', 1], ['t_stag', 1], ['t_boar', 2], ['t_ghoul', 2], ['t_priest', 2], ['t_lion', 3], ['t_golem', 3]],
    minis: ['t_mb_gate', 't_mb_relic', 't_mb_paladin', 't_mb_hierophant', 't_mb_sentinel'],   // мини-босс святилища по номеру лабиринта (1–5)
    commander: 't_lord', boss: 't_boss', fortName: 'Святилище храма',
    moods: [
      { name: 'Внешний двор', ground: [150, 142, 120], alt: [138, 130, 110], water: [48, 84, 96], tint: null, dark: false, fog: [10, 10, 8], particles: { c: [255, 240, 200], rate: 8, vz: 0.3, g: -0.05, size: 2.5, life: 2.4 }, lake: 0 },
      { name: 'Заросшие галереи', ground: [128, 132, 104], alt: [116, 120, 96], water: [40, 74, 84], tint: 'rgba(30,50,20,0.14)', dark: false, fog: [6, 10, 6], particles: { c: [210, 255, 170], rate: 12, vz: 0.4, g: -0.1, size: 2.5, life: 2.4 }, lake: 0 },
      { name: 'Внутреннее святилище', ground: [112, 104, 96], alt: [100, 94, 88], water: [30, 54, 70], tint: 'rgba(60,40,90,0.22)', dark: true, fog: [8, 6, 14], particles: { c: [255, 210, 140], rate: 14, vz: 0.5, g: -0.1, size: 3, life: 2.6 }, lake: 0 },
    ],
  },
};
// Цикл похода: пять разных открытых полей подряд, в конце каждого — портал «Вглубь» (следующее поле требует уровня);
// шестая локация — захваченный форт (сцена с отбиванием форта). Каждый второй форт — босс.
export const FIELDS_PER_FORT = 5;
export const FORT_EVERY = FIELDS_PER_FORT + 1, BOSS_EVERY = FORT_EVERY * 2;
export const isWildFort = d => d % FORT_EVERY === 0;
export const isWildBoss = d => d % BOSS_EVERY === 0;
export const FIELD_NAMES = {
  forest: ['Опушка', 'Берёзовая роща', 'Каменистые ручьи', 'Дремучий бор', 'Бурелом'],
  bones: ['Красная степь', 'Долина черепов', 'Колючие балки', 'Хребет великана', 'Пыльные курганы'],
  temple: ['Внешний двор', 'Галерея колонн', 'Заросший клуатр', 'Зал обетов', 'Расколотый неф'],
  fjord: ['Береговая полоса', 'Ледяное поле', 'Ущелье ветров', 'Замёрзший залив', 'Курганы ётунов'],
};
export const fieldVariant = d => isWildFort(d) ? FIELDS_PER_FORT : (d - 1) % FORT_EVERY;
export const locationName = (realm, d) => isWildFort(d) ? REALMS[realm].fortName : FIELD_NAMES[realm][fieldVariant(d)];
export const wildReqLevel = (realm, d) => Math.max(1, wildLevel(realm, d) - 2);
export const moodOf = (realm, depth) => REALMS[realm].moods[Math.min(2, Math.floor((depth - 1) / 2))];
export const wildLevel = (realm, depth) => REALMS[realm].baseLevel + Math.floor((depth - 1) * 0.9 + Math.max(0, depth - 6) * 0.4);   // за первым фортом — круче

// Задания походов. Прогресс — счётчики P.wild.stat[realm] (реальные события). Награда забирается в окне портала.
const R = (slot, tier, rarity, names) => ({ slot, tier, rarity, names });
export const WILD_QUESTS = {
  temple: [
    { id: 'tm_kill', title: 'Очистить руины', text: 'Убейте 15 тварей Разрушенного храма.', stat: 'kills', n: 15, reward: { xp: 90, gold: 60, potions: 2 } },
    { id: 'tm_chest', title: 'Дары древних', text: 'Откройте 5 сундуков в храме.', stat: 'chests', n: 5, reward: { xp: 90, gold: 80, items: [R('head', 1, 1, { warrior: 'Шлем храмовника', archer: 'Капюшон паломника', mage: 'Венец жреца' })] } },
    { id: 'tm_mini', title: 'Стражи святилищ', text: 'Победите 3 мини-боссов в святилищах лабиринтов.', stat: 'minis', n: 3, reward: { xp: 200, gold: 120, skillPts: 1 } },
    { id: 'tm_deep', title: 'К внутреннему святилищу', text: 'Дойдите до глубины 3.', stat: 'depth', n: 3, reward: { xp: 180, gold: 100, potions: 3 } },
    { id: 'tm_fort', title: 'Осквернитель', text: 'Пройдите пять лабиринтов и победите Осквернителя храма.', stat: 'forts', n: 1, reward: { xp: 220, gold: 120, items: [R('weapon', 1, 2, { warrior: 'Меч храмовника', archer: 'Лук паломника', mage: 'Посох жреца' })] } },
    { id: 'tm_boss', title: 'Падший бог', text: 'Победите Падшего бога храма (глубина 12).', stat: 'bosses', n: 1, reward: { xp: 520, gold: 350, items: [{ slot: 'weapon', epic: true }] } },
  ],
  bones: [
    { id: 'bn_kill', title: 'Кровь на песке', text: 'Убейте 15 тварей Костяных пустошей.', stat: 'kills', n: 15, reward: { xp: 140, gold: 80, potions: 2 } },
    { id: 'bn_chest', title: 'Добыча клыкачей', text: 'Откройте 5 сундуков в Костяных пустошах.', stat: 'chests', n: 5, reward: { xp: 130, gold: 110, items: [R('head', 1, 1, { warrior: 'Шлем с бивнями', archer: 'Повязка следопыта', mage: 'Венец из позвонков' })] } },
    { id: 'bn_fort', title: 'Древние руины', text: 'Пройдите пять полей и победите вождя в руинах.', stat: 'forts', n: 1, reward: { xp: 240, gold: 130, items: [R('weapon', 1, 2, { warrior: 'Тесак Кровавого Клыка', archer: 'Лук из ребра', mage: 'Посох шамана' })] } },
    { id: 'bn_scorpid', title: 'Панцирь и жало', text: 'Убейте 3 скорпионов-панцирников.', stat: 'k_b_scorpid', n: 3, reward: { xp: 280, gold: 160, skillPts: 1 } },
    { id: 'bn_deep', title: 'К кладбищу великанов', text: 'Дойдите до глубины 3.', stat: 'depth', n: 3, reward: { xp: 260, gold: 140, potions: 3 } },
    { id: 'bn_boss', title: 'Сон исполина', text: 'Победите Пробуждённого Костяного исполина (руины-босс, глубина 12).', stat: 'bosses', n: 1, reward: { xp: 560, gold: 370, items: [{ slot: 'weapon', epic: true }] } },
  ],
  fjord: [
    { id: 'fj_kill', title: 'Первая кровь на берегу', text: 'Убейте 15 тварей Фьордов.', stat: 'kills', n: 15, reward: { xp: 180, gold: 90, potions: 2 } },
    { id: 'fj_chest', title: 'Добыча ярлов', text: 'Откройте 5 сундуков во Фьордах.', stat: 'chests', n: 5, reward: { xp: 150, gold: 120, items: [R('head', 2, 1, { warrior: 'Шлем-горностай', archer: 'Капюшон лыжника', mage: 'Венец метели' })] } },
    { id: 'fj_fort', title: 'Сорвать флаг с форта', text: 'Отбейте захваченный форт: убейте его командира.', stat: 'forts', n: 1, reward: { xp: 260, gold: 140, items: [R('weapon', 2, 2, { warrior: 'Секира берега', archer: 'Лук фьорда', mage: 'Посох инея' })] } },
    { id: 'fj_jotun', title: 'Гроза великанов', text: 'Убейте 3 ётунов-великанов.', stat: 'k_f_jotun', n: 3, reward: { xp: 320, gold: 180, skillPts: 1 } },
    { id: 'fj_deep', title: 'Вглубь, к ледникам', text: 'Дойдите до глубины 3.', stat: 'depth', n: 3, reward: { xp: 300, gold: 150, potions: 3 } },
    { id: 'fj_boss', title: 'Король фьордов', text: 'Победите Ётуна Скъёльда (форт-босс, глубина 12).', stat: 'bosses', n: 1, reward: { xp: 600, gold: 400, items: [{ slot: 'weapon', epic: true }] } },
  ],
  forest: [
    { id: 'fr_kill', title: 'Охота на опушке', text: 'Убейте 15 лесных тварей.', stat: 'kills', n: 15, reward: { xp: 120, gold: 70, potions: 2 } },
    { id: 'fr_chest', title: 'Тайники браконьеров', text: 'Откройте 5 сундуков в Старом Лесу.', stat: 'chests', n: 5, reward: { xp: 110, gold: 100, items: [R('head', 1, 1, { warrior: 'Кожаный шлем егеря', archer: 'Шапка охотника', mage: 'Венок травницы' })] } },
    { id: 'fr_fort', title: 'Разорить острог', text: 'Отбейте разбойничий острог: убейте атамана.', stat: 'forts', n: 1, reward: { xp: 220, gold: 120, items: [R('weapon', 1, 2, { warrior: 'Тесак атамана', archer: 'Лук Рваного Уха', mage: 'Посох лесника' })] } },
    { id: 'fr_leshy', title: 'Не к ночи помянут', text: 'Убейте 4 леших.', stat: 'k_w_leshy', n: 4, reward: { xp: 260, gold: 150, skillPts: 1 } },
    { id: 'fr_deep', title: 'В самую глушь', text: 'Дойдите до глубины 3.', stat: 'depth', n: 3, reward: { xp: 250, gold: 130, potions: 3 } },
    { id: 'fr_boss', title: 'Хозяин Чащи', text: 'Победите Хозяина Чащи (форт-босс, глубина 12).', stat: 'bosses', n: 1, reward: { xp: 520, gold: 350, items: [{ slot: 'weapon', epic: true }] } },
  ],
};
