// правки 3: стражи «Жатвы Бездны» — тот же латный скелет, но своя походка, не как у рядового скелета.
// surv_guard — «Страж жатвы»: широкий тяжёлый шаг, нога далеко выбрасывается вперёд и высоко поднимается, корпус качает.
// surv_brute — «Костолом» (шкура Стража глубин): рвётся вперёд низко пригнувшись, длинными быстрыми шагами.
import { eliteRig } from './elite_guard.js';
import { mobSkin } from './_skin.js';
const STOMP = { crouch: 0.16, lift: 0.34, stride: 0.95, cyc: 1.9, lean: 0.12, sway: 0.2, twist: 0.32, armSw: 0.28, elb: -0.8, elbSw: 0.2, bob: 0.09 };
const LUNGE = { crouch: 0.2, lift: 0.26, stride: 0.85, cyc: 1.6, lean: 0.42, sway: 0.07, twist: 0.36, armSw: 0.85, elb: -0.5, elbSw: 0.6, bob: 0.06 };
export const survGuard = { id: 'surv_guard', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, eliteRig(kit, { gait: STOMP }), 'elite_guard_m'); } };
export const survBrute = { id: 'surv_brute', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, eliteRig(kit, { gait: LUNGE }), 'elite_warlord_m'); } };
