// Объяснялка похода: короткие карточки ровно в тот момент, когда правило впервые важно (1–3 строки, один раз),
// постоянная строка цели и «зацепки» при возвращении в деревню. Флаги показа — profile.wild.hints.
import { G, bus } from './ctx.js';
import { REALMS, WILD_QUESTS } from '../data/wild.js';
import { nearestCache, dirWord } from './wildmem.js';
import { hunted, displayName, WEAK } from './nemesis.js';

const HINTS = {
  enter: ['Как устроен поход', ['🎯 Цель — отбить форт: убейте его командира.', '🎒 Золото падает в ноше: оно ваше, когда форт отбит или вы вышли через портал.', '☠ Командир — ваш личный враг: проиграете — он вас запомнит.']],
  carry: ['Это ваша ноша', ['Золото пока не в кошельке. Смерть его теряет.', 'Тяжёлая ноша замедляет вас и привлекает врагов. Отбейте форт или выйдите через портал — и оно ваше.']],
  nemesis: ['Это ваш немезис', ['У него 2 силы и 1 слабость: удар по слабости — +35% урона (вспыхнет «Слабость!»).', 'Погибнете или убежите — он станет сильнее и заберёт ношу. Убьёте — трофей навсегда.']],
  cache: ['Схрон ▣ — касса посреди поля', ['Золото из похода лежит в ноше 🎒: пока вы в поле, смерть его отбирает, а тяжёлая ноша замедляет и приманивает мобов.', 'Подойдите к ▣ и нажмите «Схрон»: вся ноша сразу уйдёт в кошелёк, но схрон возьмёт 15% (25%, если поле помнит вашу жадность).', 'Не нужен, если вы собираетесь добить форт — он тоже банкует ношу бесплатно.']],
  echo: ['Эхо павших', ['Прозрачные силуэты героев — следы тех, кто здесь пал (это отголоски, не живые игроки).', 'Подойдите и нажмите «Эхо»: получите немного золота и подсказку, где опасно.', 'Если пали вы сами — на этом месте останется ваше Эхо и вернёт ¼ потерянной ноши.']],
  dead: ['Что произошло', ['Ноша потеряна, её забрал немезис. Победите его — вернёте всё и получите трофей.']],
};
let card = null, queue = [], timer = 0;
const seen = () => { const P = G.profile; P.wild = P.wild || {}; return (P.wild.hints = P.wild.hints || {}); };

function render() {
  if (card || !queue.length) return;
  const [title, lines] = queue.shift();
  card = document.createElement('div');
  card.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;pointer-events:auto';
  const inner = document.createElement('div'); inner.style.cssText = 'max-width:340px;width:calc(100% - 24px);background:rgba(20,14,26,.94);border:1px solid #d6a548;border-radius:10px;padding:10px 12px;font:14px/1.35 Georgia,serif;color:#efe2c0;box-shadow:0 4px 18px #000a';
  inner.innerHTML = `<div style="font-weight:700;color:#e8c26a;margin-bottom:4px">${title}</div>${lines.map(l => `<div style="margin:3px 0">${l}</div>`).join('')}`; card.appendChild(inner);
  const b = document.createElement('button'); b.textContent = 'Понятно'; b.className = 'btn sm gold'; b.style.cssText = 'margin-top:6px;pointer-events:auto';
  const close = () => { if (!card) return; card.remove(); card = null; clearTimeout(timer); if (!G.modalOpen) G.paused = false; setTimeout(render, 300); };
  b.onclick = close; inner.appendChild(b); document.body.appendChild(card); if (!G.paused) G.paused = true;   // пока карточка на экране — игра на паузе (враги не бьют, пока вы читаете)
}
export function hint(id) {
  const S = seen(); if (S[id] || !HINTS[id]) return; S[id] = 1; queue.push(HINTS[id]); render(); bus.emit('save');
}
bus.on('zoneEntered', id => { if (card) { card.remove(); card = null; G.paused = false; } queue.length = 0; if (id === 'wild') setTimeout(() => hint('enter'), 700); if (id === 'town') setTimeout(townHooks, 1400); });
bus.on('aggro', e => { if (e.nem) setTimeout(() => hint('nemesis'), 400); });
bus.on('showDeath', () => { if (G.zoneId === 'wild') hint('dead'); });

// Строка цели (под шкалой ноши)
export function goalText() {
  const W = G.wild; if (!W) return '';
  if (W.greed >= 0.5) { const c = nearestCache(); if (c) return `🎒 Ноша тяжёлая — вынесите её в ▣ схрон (${Math.round(c.d)} м ${dirWord(c.it.x - G.player.x, c.it.y - G.player.y)}), пока не отняли`; }
  if (!W.done) { const k = G.enemies.find(e => (e.story === 'wildkeep' || e.story === 'wildboss') && !e.dead); return k ? `🎯 Отбейте форт: убейте ${k.nem ? k.nem.name : k.D.name}${k.nem ? ` · слаб к ${WEAK[k.nem.weak]}` : ''} (стрелка ведёт к нему)` : ''; }
  return '🎯 Форт отбит, золото уже ваше. Соберите сундуки и идите к порталу «В деревню» (или спуститесь глубже через окно итога)';
}

// Что делать дальше (для окна портала и приветствия в деревне)
export function nextGoal(realm) {
  const RL = REALMS[realm], hs = hunted(realm);
  if (hs.length) { const n = hs.sort((a, b) => b.rank - a.rank)[0]; return `☠ ${displayName(n)} ждёт вас в форте${n.stash ? ` и хранит ${n.stash} зол. — отомстите` : ' — отомстите'}`; }
  const ready = WILD_QUESTS[realm].find(q => { const S = G.profile.wild && G.profile.wild[realm]; if (!S) return false; const v = q.stat === 'depth' ? S.depth || 0 : (S.stat || {})[q.stat] || 0; return v >= q.n && !(S.claimed || {})[q.id]; });
  if (ready) return `🎁 Готова награда: «${ready.title}» — заберите ниже`;
  const S = G.profile.wild && G.profile.wild[realm];
  let best = null; for (const q of WILD_QUESTS[realm]) { if (S && (S.claimed || {})[q.id]) continue; const v = S ? (q.stat === 'depth' ? S.depth || 0 : (S.stat || {})[q.stat] || 0) : 0; const left = (q.n - v) / q.n; if (!best || left < best.left) best = { q, left, v }; }
  if (best) return `➡ Ближайшее: «${best.q.title}» — ${best.v}/${best.q.n}`;
  return `➡ Идите глубже: ${RL.short}, глубина ${(S && S.best || 0) + 1}`;
}
function townHooks() {
  if (G.zoneId !== 'town' || !G.profile.tutorial.prologue) return;
  for (const realm of Object.keys(REALMS)) {
    const it = G.zone.inter.find(i => i.id === 'portal_' + realm); if (!it) continue;
    const hs = hunted(realm), S = G.profile.wild && G.profile.wild[realm];
    const ready = S ? WILD_QUESTS[realm].filter(q => { const v = q.stat === 'depth' ? S.depth || 0 : (S.stat || {})[q.stat] || 0; return v >= q.n && !(S.claimed || {})[q.id]; }).length : 0;
    it.plate = REALMS[realm].name + (hs.length ? ' ☠' : '') + (ready ? ' 🎁' : '');
  }
  const realm = Object.keys(REALMS).find(r => hunted(r).length) || null;
  if (realm) bus.emit('toast', { text: nextGoal(realm), sub: `Портал: ${REALMS[realm].name}`, kind: 'quest' });
}
