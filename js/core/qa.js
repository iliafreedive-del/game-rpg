// Хуки для автотестов (навык develop-web-game, tools/qa/suite.mjs). В игре ничего не меняют, пока их не вызвали.
//   window.advanceTime(ms[, {render:false}]) — остановить обычный цикл и прокрутить игру ровно на ms (шаг 1/60 с): быстро и одинаково при каждом прогоне.
//   window.qaResume()             — вернуть обычный цикл по requestAnimationFrame.
//   window.qaInput                — ввод игры (клавиши WASD, attackHeld) для бота.
//   window.render_game_to_text()  — состояние игры одной JSON-строкой: зона, герой, ближние враги, точки входа, окно, задание.
// Координаты — мировые метры зоны: x вправо, y вниз по карте (как G.player.x / G.player.y).
import { G } from '../game/ctx.js';
import { input } from './input.js';

export const qa = { hold: false };   // true — main.js не двигает мир в requestAnimationFrame, время идёт только через advanceTime

export function initQA({ update, render, updateHUD }) {
  window.advanceTime = (ms = 16, opt = {}) => {   // opt.render === false — без кадра (боту картинка не нужна, программный WebGL рисует кадр ~0,5 с)
    qa.hold = true;
    const n = Math.max(1, Math.round(ms / (1000 / 60)));
    const clk = window.__qaClock; if (clk) clk.start();   // виртуальные часы (только в автотестах, tools/qa/lib.mjs)
    for (let i = 0; i < n; i++) { if (clk) clk.add(1000 / 60); update(1 / 60); updateHUD(1 / 60); }
    if (opt.render !== false) render();
    return G.time;
  };
  window.qaResume = () => { qa.hold = false; };
  window.qaInput = input;
  window.render_game_to_text = () => JSON.stringify(snapshot());
}

const r1 = v => Math.round(v * 10) / 10;
function snapshot() {
  const p = G.player, P = G.profile;
  if (!p || !P) return { mode: document.getElementById('title') ? 'title' : 'loading' };
  const d = e => Math.hypot(e.x - p.x, e.y - p.y);
  const foes = G.enemies.filter(e => !e.dead).sort((a, b) => d(a) - d(b));
  const inter = (G.zone && G.zone.inter || []).filter(o => !o.hidden && !(o.draw && o.draw.hidden));
  const modal = document.querySelector('.modal');
  return {
    mode: G.player.dead ? 'dead' : G.modalOpen ? 'modal' : G.paused ? 'paused' : 'play',
    coords: 'world meters, x right, y down',
    zone: G.zoneId, floor: G.run && G.run.floor, time: r1(G.time), fps: G.fps,
    player: { cls: P.cls, lvl: P.level, x: r1(p.x), y: r1(p.y), hp: Math.round(p.hp), maxHP: G.stats && G.stats.maxHP, range: G.stats && r1(G.stats.range), dead: !!p.dead, state: p.state },
    gold: P.gold, xp: P.xp,
    enemies: { alive: foes.length, near: foes.slice(0, 8).map(e => ({ type: e.type, name: e.name, x: r1(e.x), y: r1(e.y), dist: r1(d(e)), hp: Math.round(e.hp), maxHP: e.maxHP, boss: !!e.D.boss, elite: !!e.D.elite, aggro: !!e.aggro })) },
    interact: inter.map(o => ({ id: o.id, type: o.type, to: o.to, x: r1(o.x), y: r1(o.y), dist: r1(d(o)) })).sort((a, b) => a.dist - b.dist).slice(0, 10),
    modal: modal ? { title: (modal.querySelector('h2,.mt') || modal).innerText.trim().slice(0, 60), buttons: [...modal.querySelectorAll('button')].map(b => b.innerText.trim().slice(0, 30)).filter(Boolean).slice(0, 8) } : null,
    quest: (document.getElementById('tracker') || {}).innerText ? document.getElementById('tracker').innerText.trim().replace(/\s+/g, ' ').slice(0, 120) : null,
    counts: { projectiles: G.projectiles.length, effects: G.effects.length, texts: G.texts.length, particles: G.particles.length, pickups: G.pickups.length, toasts: document.querySelectorAll('.toast').length },
  };
}
