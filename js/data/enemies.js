import { WILD_MOBS } from './wild.js';
// Enemy archetypes. Behaviour is selected by `ai`; numbers scale with monster level.
export const ENEMIES = {
  skel_warrior: { name: 'Скелет-воин', atlas: 'skel_warrior', skeleton: true, ai: 'melee', hp: 22, dmg: [3, 5], speed: 2.5, range: 1.15, cd: 1.7, impact: 0.55, xp: 12, gold: [2, 6], armor: 6, radius: 0.34, fps: { walk: 11, attack: 11 } },
  skel_archer: { name: 'Скелет-лучник', atlas: 'skel_archer', skeleton: true, ai: 'archer', hp: 18, dmg: [2, 5], speed: 2.3, range: 8, keep: 5, cd: 2.1, impact: 0.66, xp: 14, gold: [2, 6], armor: 3, radius: 0.32, proj: 'arrow', fps: { attack: 9 } },
  skel_mage: { name: 'Костяной колдун', atlas: 'skel_mage', skeleton: true, ai: 'caster', hp: 22, dmg: [5, 8], elem: 'light', speed: 2.0, range: 7, keep: 5.5, cd: 2.6, impact: 0.55, xp: 18, gold: [4, 9], armor: 2, radius: 0.32, proj: 'darkbolt', fps: { attack: 8 } },
  ghoul: { name: 'Упырь', atlas: 'ghoul', ai: 'fast', hp: 16, dmg: [3, 5], speed: 4.1, range: 1.0, cd: 0.85, impact: 0.5, xp: 11, gold: [1, 4], armor: 2, radius: 0.3, fps: { walk: 16, attack: 14 } },
  beast: { name: 'Пещерный зверь', atlas: 'beast', ai: 'beast', hp: 45, dmg: [7, 11], speed: 2.8, range: 1.3, cd: 3.2, impact: 0.5, xp: 22, gold: [3, 8], armor: 8, radius: 0.45, fps: { walk: 12, attack: 12 } },
  elite_guard: { name: 'Хранитель амулета', atlas: 'elite', elite: true, skeleton: true, ai: 'elite', hp: 280, dmg: [8, 13], speed: 2.5, range: 1.7, cd: 1.9, impact: 0.6, xp: 160, gold: [60, 90], armor: 20, radius: 0.5, fps: { walk: 10, attack: 10, attack2: 10 } },
  boss: { name: 'Палач Бездны', atlas: 'boss', boss: true, ai: 'boss', hp: 800, dmg: [11, 16], speed: 2.5, range: 2.3, cd: 1.7, impact: 0.6, xp: 700, gold: [200, 260], armor: 16, radius: 0.75, fps: { walk: 9, attack: 10, attack2: 10, slam: 11, roar: 9 } },
};
for (const [k, m] of Object.entries(WILD_MOBS)) ENEMIES[k] = { ...m, atlas: 'w_' + k };   // походы: графика выводится из базовых спрайтов (world/wildfloor.js)
// Room -> base monster level (Chapter I progression: 1 → 6)
export const ROOM_LEVEL = { entry: 1, ossuary: 2, gallery: 3, cave: 3, cross: 4, altar: 4, secret: 5, guard: 5, arena: 6 };
// рост силы врагов (сборка 16): до 3 уровня как раньше, дальше — быстрее (квадратичная добавка), чтобы прокачанный герой
// не выкашивал толпы одним ударом: ур. 6 — HP ×2,9 (было ×2,5); ур. 12 — HP ×7,5 (было ×4,3), урон ×4,5 (было ×3,2); ур. 20 — HP ×19
export const scaleHP = l => 1 + 0.3 * (l - 1) + 0.04 * Math.max(0, l - 3) ** 2;
export const scaleDmg = l => 1 + 0.2 * (l - 1) + 0.017 * Math.max(0, l - 3) ** 2;
export const scaleXP = l => 1 + 0.25 * (l - 1);
