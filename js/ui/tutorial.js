// Interactive tutorial: pauses the game, dims the screen and spotlights the control being explained.
// Intro on the first launch + one-time contextual tips (portal, elder, trainer, skills, hero...).
import { G, bus } from '../game/ctx.js';
import { $, el, esc } from '../core/util.js';

const touch = () => matchMedia('(pointer:coarse)').matches;
let busy = false, queue = [];
const T = () => { const P = G.profile; P.tutorial = P.tutorial || {}; P.tutorial.tips = P.tutorial.tips || {}; return P.tutorial; };

// rect: DOMRect-like {left, top, width, height}
function show(rect, text, { button = 'Понятно', pad = 8, round = true } = {}) {
  return new Promise(res => {
    busy = true; const wasPaused = G.paused; G.paused = true;
    const ov = el('div', 'tut'); const hole = el('div', 'tut-hole' + (round ? ' round' : ''));
    const r = rect || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const tip = el('div', 'tut-tip', `<div class="tut-txt">${text}</div>`);
    const b = el('button', 'btn gold', button); tip.appendChild(b);
    const skip = el('button', 'tut-skip', 'Пропустить обучение'); tip.appendChild(skip);
    ov.append(hole, tip); document.body.appendChild(ov);
    // place the bubble on the side with more room
    const cy = r.top + r.height / 2, below = cy < innerHeight * 0.55;
    tip.style.top = below ? Math.min(innerHeight - 170, r.top + r.height + pad + 18) + 'px' : '';
    tip.style.bottom = below ? '' : Math.min(innerHeight - 170, innerHeight - r.top + pad + 18) + 'px';
    tip.style.left = Math.max(10, Math.min(innerWidth - Math.min(360, innerWidth - 20) - 10, r.left + r.width / 2 - 170)) + 'px';
    const arrow = el('div', 'tut-arrow ' + (below ? 'up' : 'down')); arrow.style.left = (r.left + r.width / 2 - 14) + 'px';
    arrow.style.top = below ? (r.top + r.height + pad) + 'px' : (r.top - pad - 30) + 'px'; ov.appendChild(arrow);
    const done = () => { ov.remove(); busy = false; G.paused = wasPaused && G.modalOpen; bus.emit('sfx', 'click'); res(); };
    b.onclick = done;
    skip.onclick = () => { T().off = true; queue = []; done(); };
  });
}
const rectOf = id => { const e = typeof id === 'string' ? $(id) : id; if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
const worldRect = (x, y, w = 70, h = 110) => { const [sx, sy] = G.cam.toScreen(x, y); return { left: sx - w / 2, top: sy - h, width: w, height: h + 10 }; };

async function run(steps) { for (const s of steps) { if (T().off) return; const r = typeof s[0] === 'function' ? s[0]() : rectOf(s[0]); if (s[0] && !r) continue; await show(r, s[1], s[2] || {}); } }

export async function intro() {
  const t = T(); if (t.introDone) return; t.introDone = true; bus.emit('save');
  await run([
    [() => { const z = $('joyZone').getBoundingClientRect(); return { left: z.left + 20, top: z.top + z.height * 0.35, width: Math.min(260, z.width - 40), height: z.height * 0.55 }; },
      touch() ? '<b>Движение.</b> Коснитесь левой половины экрана и ведите палец — герой побежит туда.' : '<b>Движение.</b> Клавиши <b>WASD</b> или зажмите <b>правую кнопку мыши</b> — герой побежит к курсору.', { round: false }],
    ['btnAtk', touch() ? '<b>Атака.</b> Держите эту кнопку — герой сам подойдёт к ближайшему врагу и ударит.' : '<b>Атака.</b> <b>Левая кнопка мыши</b> — удар или выстрел туда, куда указывает курсор. Пробел — по ближайшему врагу.'],
    ['btnDodge', '<b>Рывок.</b> Уклоняйтесь от сильных ударов: во время рывка враги не попадают.'],
    ['potHP', '<b>Зелья.</b> Красное — лечит здоровье. Над ним синее — восстанавливает ману для умений.'],
    ['sk1', '<b>Умения.</b> Здесь появятся ваши приёмы. Их изучают у <b>наставника Элвина</b> в деревне.'],
    ['btnAuto', '<b>АВТО.</b> Нажмите — и герой будет сражаться сам: бить, применять умения и пить зелья.'],
    ['tracker', '<b>Задание.</b> Здесь написано, что делать дальше. <b>Золотые стрелки</b> на земле ведут к цели.', { round: false }],
  ]);
}
function tip(id, fn) { const t = T(); if (t.off || !t.on || t.tips[id] || busy || G.modalOpen) return false; const r = fn(); if (!r) return false; t.tips[id] = 1; bus.emit('save'); queue.push(r); return true; }

export function initTutorial() {
  bus.on('tutorialRestart', () => { const t = T(); t.on = true; t.off = false; t.introDone = false; t.tips = {}; intro(); });
  setInterval(async () => {
    if (!G.profile || !G.zoneReady || busy) return;
    const t = T(); if (!t.on || t.off) return;
    const P = G.profile, pl = G.player;
    // 1) interact button first time
    if (!$('btnAct').classList.contains('hidden')) tip('act', () => [rectOf('btnAct'), G.focus && G.focus.type === 'portal' ? '<b>Портал.</b> Нажмите эту кнопку, чтобы войти. Порталы ведут в катакомбы, Глубины и обратно в деревню.' : '<b>Действие.</b> Рядом что-то интересное — нажмите, чтобы <b>поговорить, войти или открыть</b>.']);
    // 2) village: go to the elder
    if (G.zoneId === 'town' && P.story.stage === 0) { const e = G.zone.inter.find(i => i.id === 'elder'); if (e) tip('elder', () => [worldRect(e.x, e.y), '<b>Староста Эдрик</b> ждёт вас. Подойдите к нему — он даст первое задание. Следуйте за золотыми стрелками.']); }
    // 3) learn the first skill at the trainer
    if (G.zoneId === 'town' && P.skillPts > 0 && !Object.values(P.skills || {}).some(Boolean) && P.story.stage >= 1) { const tr = G.zone.inter.find(i => i.id === 'trainer'); if (tr) tip('trainer', () => [worldRect(tr.x, tr.y), '<b>Наставник Элвин.</b> У вас есть очко навыка! Подойдите к наставнику и изучите первое <b>активное умение</b> — без него драться тяжело.']); }
    // 4) hero / gear button after first reward
    if (P.story.stage >= 1) tip('hero', () => [rectOf('btnHero'), '<b>Герой.</b> Здесь ваше снаряжение. Нажмите на вещь — увидите, что она даёт и что с ней сделать.']);
    if (queue.length) { const [r, txt] = queue.shift(); if (r) await show(r, txt); }
  }, 600);
  // inside windows: trainer panel / skills list
  bus.on('panel', it => { if (!it || it.id !== 'trainer') return; setTimeout(() => { const P = G.profile; if (P.skillPts > 0) { const t = T(); if (t.on && !t.off && !t.tips.tbtn) { const r = rectOf('tBtnSkills'); if (r) { t.tips.tbtn = 1; show(r, 'Нажмите <b>«Навыки»</b> — там изучаются умения. Очки навыков дают за каждый новый уровень.'); } } } }, 400); });
  bus.on('skillsOpened', () => setTimeout(() => { const t = T(); if (!t.on || t.off || t.tips.learn) return; const b = document.querySelector('.tal-learn.ok'); if (!b) return; t.tips.learn = 1; show(b.getBoundingClientRect(), 'Нажмите <b>«Изучить»</b>. Умения с пометкой <b>«активный»</b> сами встают в кнопку справа внизу.'); }, 350));
}
// first launch: ask whether to show the tutorial
export function askTutorial() {
  return new Promise(res => {
    const ov = el('div', 'tut'); const box = el('div', 'tut-ask', `<div class="rw-t">Добро пожаловать в DARK ASCENT!</div><p>Показать короткое обучение? Мы подсветим кнопки и объясним, куда идти.</p>`);
    const yes = el('button', 'btn gold', 'Да, покажи'); const no = el('button', 'btn', 'Я опытный игрок');
    const row = el('div', 'row'); row.style.justifyContent = 'center'; row.append(yes, no); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
    G.paused = true;
    yes.onclick = () => { ov.remove(); T().on = true; G.paused = false; res(true); };
    no.onclick = () => { ov.remove(); T().on = false; G.paused = false; res(false); };
  });
}
