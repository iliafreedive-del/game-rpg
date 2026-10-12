// Ладдер (12 октября): «Доска славы» в деревне и отправка рекордов в таблицы Яндекс Игр.
// Таблицы создаёт владелец в консоли Яндекс Игр (раздел «Лидерборды»), технические имена — латиницей, ровно такие:
//   depthsBest   — лучший этаж Глубин,          числовая, больше — лучше
//   harvestBest  — лучший забег Жатвы, секунды, числовая, больше — лучше
//   abyssCircle  — самый высокий пройденный Круг Бездны, числовая, больше — лучше
//   heroLevel    — уровень героя,               числовая, больше — лучше
//   weeklyDepths — испытание недели, мс,        время, меньше — лучше (сборка 21, уже было)
// Отправляем только новый рекорд, очередью не чаще раза в 1,2 с (у Яндекса лимит ~1 запрос в секунду).
// Читаем только при открытии окна, кэш на минуту.
import { G, bus } from './ctx.js';
import { platform } from '../platform/platform.js';

export const BOARDS = [
  { id: 'depthsBest', mine: P => (P.depths && P.depths.best) || 0 },
  { id: 'harvestBest', mine: P => Math.floor((P.surv && P.surv.best) || 0), time: 1 },
  { id: 'abyssCircle', mine: P => P.circleBest || 0 },
  { id: 'heroLevel', mine: P => P.level || 1 },
];

// уже отправленное — общее для всех героев на устройстве: таблица одна на игрока, худший рекорд другого класса не шлём
const SENT_KEY = 'da_ladder_sent';
let sent = null;
const sentMap = () => { if (!sent) { try { sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') || {}; } catch { sent = {}; } } return sent; };
const queue = new Map(); let timer = null;
function pump() {
  timer = null; const [name, [score, key] = []] = queue.entries().next().value || []; if (!name) return; queue.delete(name);
  platform.p.setLeaderboardScore(name, score).then(ok => { if (ok) { sentMap()[key] = score; try { localStorage.setItem(SENT_KEY, JSON.stringify(sent)); } catch { } } });
  if (queue.size) timer = setTimeout(pump, 1200);
}
// key — под каким именем помнить отправленное (у испытания недели — своё на каждую неделю); low — «меньше — лучше»
export function submitScore(name, score, low, key = name) {
  if (!platform.p || platform.p.name !== 'yandex' || !(score > 0)) return;
  const was = sentMap()[key]; if (was && (low ? score >= was : score <= was)) return;
  queue.set(name, [score, key]); if (!timer) timer = setTimeout(pump, 1200);
}
const push = id => { const B = BOARDS.find(b => b.id === id); if (G.profile) submitScore(id, B.mine(G.profile)); };

// чтение: кэш 60 с на таблицу
const cache = {};
export async function getBoard(name) {
  const c = cache[name]; if (c && Date.now() - c.t < 60000) return c.L;
  if (!platform.p || !platform.p.getLeaderboard) return null;
  const L = await platform.p.getLeaderboard(name); if (L) cache[name] = { t: Date.now(), L }; return L;
}

bus.on('levelUp', () => push('heroLevel'));
bus.on('survEnd', r => { if (r && r.record) push('harvestBest'); });
bus.on('floorResult', r => {
  const run = G.run, P = G.profile; if (!r || !P || r.weekly || !(r.floor > 0)) return;
  if (run && run.circle > (P.circleBest || 0)) { P.circleBest = run.circle; push('abyssCircle'); }   // Круг засчитан, когда этаж на нём пройден
  if (r.first) push('depthsBest');
});
// первый вход на Яндексе со старым прогрессом: дослать то, чего таблица ещё не видела (очередь не шлёт меньше отправленного)
let synced = false;
bus.on('zoneEntered', id => { if (id === 'town' && !synced) { synced = true; for (const B of BOARDS) push(B.id); } });
