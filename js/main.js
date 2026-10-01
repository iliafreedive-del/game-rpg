// Entry point: boot sequence, title screen, main loop.
import { G, bus } from './game/ctx.js';
import { loadGroup, getAtlas } from './core/assets.js';
import { initInput, initMouse, input } from './core/input.js';
import { initAudio, sfx, startMusic, setVolumes, setPaused } from './core/audio.js';
import { initRenderer, render, resize } from './render/renderer.js';
import { newProfile, loadLocal, migrate } from './game/save.js';
import { stats } from './game/stats.js';
import { initQuests } from './game/quests.js';
import { loadZone, update, saveNow } from './game/game.js';
import { initHUD, updateHUD } from './ui/hud.js';
import { initPanel } from './ui/panel.js';
import { initTutorial, askTutorial, intro } from './ui/tutorial.js';
import * as CS from './game/castle.js';
import { initPlatform, platform } from './platform/platform.js';
import { restorePurchases } from './platform/monetize.js';
import { dozorPending, initDozor } from './game/daily.js';
import { showDozor } from './ui/windows.js';
import { $, el, esc } from './core/util.js';
import { CLASSES } from './data/items.js';
import { iconURL } from './ui/icons.js';

const CORE = ['props', 'icons'];
// hero sheets are big (HD): load only the chosen class
export const CLASS_ATLAS = { warrior: ['hero_body', 'hero_sword', 'hero_axe', 'hero_greatsword', 'hero_shield'], archer: ['hero_archer_body', 'hero_archer_bow'], mage: ['hero_mage_body', 'hero_mage_staff'] };
const MONSTERS = ['skel_warrior', 'skel_archer', 'skel_mage', 'ghoul', 'beast', 'elite', 'boss'];

async function boot() {
  initRenderer($('game'));
  initAudio(); bus.on('sfx', sfx); bus.on('audioPause', p => setPaused(p));
  const bar = $('loadbar').firstElementChild, txt = $('loadtxt');
  const prog = (f, t) => { bar.style.width = Math.round(f * 100) + '%'; txt.textContent = t; };
  prog(0.05, 'Подключение платформы…');
  await initPlatform();
  prog(0.1, 'Загрузка героя и мира…');
  await loadGroup(CORE, f => prog(0.1 + f * 0.6, 'Загрузка героя и мира…'));
  $('titleHero').style.backgroundImage = 'url(assets/sprites/portrait.png)';
  // monsters stream in the background (needed only in the dungeon)
  const mons = loadGroup(MONSTERS).catch(e => console.warn(e));
  // save: local, or cloud if newer (Yandex)
  let prof = loadLocal();
  if (platform.name !== 'demo') { try { const c = migrate(await platform.p.cloudLoad()); if (c && (!prof || (c.saved || 0) > (prof.saved || 0))) prof = c; } catch { } }
  prog(1, 'Готово');
  platform.p.ready();
  $('loadbar').classList.add('hidden'); $('loadtxt').classList.add('hidden');
  const btns = $('titleBtns'); btns.classList.remove('hidden');
  const start = async (p) => {
    await loadGroup(CLASS_ATLAS[p.cls || 'warrior']).catch(() => { });
    G.profile = p; G.stats = stats(p); setVolumes(p.settings.sfx, p.settings.music); resize();
    btns.innerHTML = '<div class="muted">Вход в мир…</div>';
    initQuests(); initHUD(); initPanel(); CS.C(); initTutorial();
    await mons;
    const fresh = !p.tutorial.prologue && p.story.stage === 0 && !p.xp && p.level === 1;
    if (fresh) await loadZone('depths', { floor: 0 }); else await loadZone('town');
    $('title').remove(); platform.p.gameplayStart(); startMusic('town');
    bus.on('zoneEntered', z => startMusic(z));
    restorePurchases().catch(() => { });
    const dz = dozorPending(); if (dz) setTimeout(() => showDozor(dz), 900); else { initDozor(); G.dozorChecked = true; }
    if (p.simplified) { bus.emit('toast', { text: 'Снаряжение упрощено до 4 вещей', sub: `Лишние вещи (${p.simplified.n}) проданы за ${p.simplified.gold} зол.`, kind: 'good' }); delete p.simplified; }
    if (p.legacyKey) bus.emit('toast', { text: 'Сохранение из версии 1.x перенесено', sub: 'Уровень, золото и характеристики сохранены', kind: 'good' });
    requestAnimationFrame(loop);
    if (fresh && p.tutorial.on === undefined) setTimeout(async () => { if (await askTutorial()) intro(); }, 700);
  };
  if (prof) {
    const c = el('button', 'btn gold', `Продолжить (ур. ${prof.level})`); c.onclick = () => { sfx('click'); start(prof); };
    const n = el('button', 'btn', 'Новая игра'); n.onclick = () => { if (confirm('Начать новую игру? Текущий прогресс будет перезаписан.')) pickClass(btns, cls => start(newProfile(cls))); };
    btns.append(c, n);
  } else {
    const n = el('button', 'btn gold', 'Начать игру'); n.onclick = () => { sfx('click'); pickClass(btns, cls => start(newProfile(cls))); }; btns.append(n);
  }
  btns.appendChild(el('div', 'muted', '<small>Телефон: джойстик слева, атака справа · ПК: WASD + Пробел</small>'));
}

function pickClass(box, cb) {
  box.innerHTML = '<div class="goldc" style="font:600 18px Georgia">Выберите героя</div>';
  const row = el('div', 'classes');
  for (const [id, C] of Object.entries(CLASSES)) {
    const c = el('button', 'class-card', `<img class="pt" src="assets/sprites/${id === 'warrior' ? 'portrait' : 'portrait_' + id}.png" alt="" onerror="this.src='${iconURL(C.icon)}'"><b>${esc(C.name)}</b><span>${esc(C.desc)}</span>`);
    c.onclick = () => { if (box._picked) return; box._picked = true; sfx('click'); cb(id); }; row.appendChild(c);
  }
  box.appendChild(row);
}
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  try { update(dt); render(); updateHUD(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
// persist on tab hide / close (mobile browsers kill background tabs)
document.addEventListener('visibilitychange', () => { if (document.hidden && G.profile) { saveNow(); platform.p && platform.p.gameplayStop(); } else if (G.profile) platform.p && platform.p.gameplayStart(); });
addEventListener('pagehide', () => { if (G.profile) saveNow(); });
addEventListener('contextmenu', e => e.preventDefault());
// iOS Safari: block pinch/double-tap zoom and reset any zoom left over after rotation
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
const vpMeta = document.querySelector('meta[name=viewport]'); const VP = vpMeta.content;
function resetZoom() {
  vpMeta.content = VP + ', minimum-scale=1'; setTimeout(() => { vpMeta.content = VP; window.scrollTo(0, 0); }, 60);
}
addEventListener('orientationchange', () => { resetZoom(); setTimeout(resetZoom, 400); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (Math.abs(visualViewport.scale - 1) > 0.01) resetZoom(); });
initInput($('joyZone'), $('joyBase'), $('joyKnob')); initMouse($('game'));
input.anchor = () => G.player ? G.cam.toScreen(G.player.x, G.player.y) : [innerWidth / 2, innerHeight / 2];
window.__G = G;   // for automated QA
boot().catch(e => { console.error(e); $('loadtxt').textContent = 'Ошибка загрузки: ' + e.message; });
