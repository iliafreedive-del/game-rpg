// Entry point: boot sequence, title screen, main loop.
import { G, bus } from './game/ctx.js';
import { loadGroup, getAtlas } from './core/assets.js';
import { initInput, initMouse, input, releaseInput } from './core/input.js';
import { initCamZoom } from './core/camzoom.js';
import { initAudio, sfx, startMusic, setVolumes, setPaused, deviceVolumes } from './core/audio.js';
import { initRenderer, render, resize, startPreload } from './render/index.js';
import { newProfile, loadSlots, mergeCloud } from './game/save.js';
import { stats } from './game/stats.js';
import { initQuests } from './game/quests.js';
import { initHunts } from './game/hunts.js';
import { loadZone, update, saveNow } from './game/game.js';
import { initHUD, updateHUD } from './ui/hud.js';
import { initPanel } from './ui/panel.js';
import { initTutorial, intro, unlockAll } from './ui/tutorial.js';
import { cinema, introShots, portalShots } from './ui/cinema.js';
import * as CS from './game/castle.js';
import { initPlatform, platform, gameplay } from './platform/platform.js';
import { restorePurchases } from './platform/monetize.js';
import { initAnalytics, wireAnalytics, track } from './platform/analytics.js';
import { dozorPending, initDozor } from './game/daily.js';
import { showDozor } from './ui/windows.js';
import { $, el, esc } from './core/util.js';
import { CLASSES } from './data/items.js';
import { iconURL } from './ui/icons.js';
import { initFullscreen } from './ui/fullscreen.js';

export const BUILD = '2026-10-09 · сборка 59';   // видно на титульном экране и в настройках: так проверяют, что загрузилась свежая версия
const CORE = ['props', 'icons'];
// hero sheets are big (HD): load only the chosen class
export const CLASS_ATLAS = { warrior: ['hero_body', 'hero_sword', 'hero_axe', 'hero_greatsword', 'hero_shield'], archer: ['hero_archer_body', 'hero_archer_bow'], mage: ['hero_mage_body', 'hero_mage_staff'] };
const MONSTERS = ['skel_warrior', 'skel_archer', 'skel_mage', 'ghoul', 'beast', 'elite', 'boss'];

async function boot() {
  initFullscreen();
  await initRenderer($('game'));
  initAudio(); bus.on('sfx', sfx); bus.on('audioPause', p => setPaused(p, 'ad'));   // реклама; своя причина тишины у платформы и скрытой вкладки (audio.js)
  const bar = $('loadbar').firstElementChild, txt = $('loadtxt');
  const prog = (f, t) => { bar.style.width = Math.round(f * 100) + '%'; txt.textContent = t; };
  prog(0.05, 'Подключение платформы…');
  await initPlatform();
  prog(0.1, 'Загрузка героя и мира…');
  await loadGroup(CORE, f => prog(0.1 + f * 0.6, 'Загрузка героя и мира…'));
  $('titleHero').style.backgroundImage = 'url(assets/sprites/portrait.png)';
  // save: local, or cloud if newer (Yandex)
  // сборка 44: три сохранения — по одному на класс; облако (Яндекс) — если там новее
  let saves = loadSlots();
  if (platform.name !== 'demo') { try { const c = await platform.p.cloudLoad(); if (!(c && c.error)) { saves = mergeCloud(saves, c); platform.cloudOK = true; } } catch { } }   // облако не ответило — писать в него нельзя, пока не прочитаем (game.js, cloudRetry)
  prog(1, 'Готово');
  platform.p.ready();
  initAnalytics();
  // сборка 51: монстры, модели героев и зверей качаются после Game Ready, пока игрок на титульном экране
  const mons = loadGroup(MONSTERS).catch(e => console.warn(e));
  startPreload(saves.last);
  $('loadbar').classList.add('hidden'); $('loadtxt').classList.add('hidden');
  const btns = $('titleBtns'); btns.classList.remove('hidden'); $('title').classList.add('ready');   // сборка 58: фон загрузки (лестница) → титульный (Тихий Брод)
  const start = async (p) => {
    await loadGroup(CLASS_ATLAS[p.cls || 'warrior']).catch(() => { });
    const dv = deviceVolumes(); if (dv) { p.settings.sfx = dv.sfx; p.settings.music = dv.music; }   // громкость — настройка устройства (одна для всех героев)
    G.profile = p; G.stats = stats(p); wireAnalytics(); setVolumes(p.settings.sfx, p.settings.music); resize();
    btns.innerHTML = '<div class="muted">Вход в мир…</div>';
    initQuests(); initHunts(); initHUD(); initPanel(); CS.C(); initTutorial();
    await mons;
    const fresh = !p.tutorial.prologue && p.story.stage === 0 && !p.xp && p.level === 1;
    track(fresh ? 'start_new' : 'start_continue', { cls: p.cls });
    if (!fresh && !p.tutorial.un) unlockAll();   // старые сохранения (до обучения кнопками): все кнопки боя открыты. Сборка 59: раньше — при любой перезагрузке, и посреди обучения разом появлялись все кнопки
    const crypt = !fresh && !p.tutorial.prologue;   // сборка 59: перезагрузка посреди пролога — снова в склеп, а не в деревню без пролога
    await loadZone(crypt ? 'depths' : 'town', crypt ? { floor: 0 } : undefined);
    $('title').remove(); startMusic('town');
    bus.on('zoneEntered', z => startMusic(z));
    restorePurchases().catch(() => { });
    const dz = dozorPending(); if (dz) setTimeout(() => showDozor(dz), 900); else { initDozor(); G.dozorChecked = true; }
    if (p.simplified && p.simplified.upg) { bus.emit('toast', { text: 'Улучшения упрощены', sub: `Лишние усиления вернули ${p.simplified.gold} зол.`, kind: 'good' }); delete p.simplified; }
    if (p.simplified) { bus.emit('toast', { text: 'Снаряжение упрощено до 4 вещей', sub: `Лишние вещи (${p.simplified.n}) проданы за ${p.simplified.gold} зол.`, kind: 'good' }); delete p.simplified; }
    if (p.fromBak) bus.emit('toast', { text: 'Сохранение не прочиталось', sub: 'Загружена предыдущая копия', kind: 'warn' });
    if (p.pendingCarry > 0) { const n = p.pendingCarry; p.gold += n; p.stats.gold += n; p.pendingCarry = 0; bus.emit('toast', { text: `Ноша из похода сохранена: +${n} зол.`, sub: 'Игра закрылась посреди похода', kind: 'good' }); }
    if (p.legacyKey) { bus.emit('toast', { text: 'Сохранение из версии 1.x перенесено', sub: 'Уровень, золото и характеристики сохранены', kind: 'good' }); delete p.legacyKey; }
    requestAnimationFrame(loop);
    // новая игра: сначала облёт деревни («вау» и загадка), потом склеп пробуждения
    if (fresh) {
      if (p.tutorial.on === undefined) p.tutorial.on = true;   // сборка 49: без вопроса «Показать подсказки?» — сразу в игру; выключить можно в «Справке»
      await cinema(introShots());
      await loadZone('depths', { floor: 0 });
      intro();
    }
  };
  const S = saves.slots, cname = c => CLASSES[c] ? CLASSES[c].name : c;
  // новая игра: класс, у которого уже есть сохранение, — только после «Перезаписать?»
  const newGame = () => { sfx('click'); pickClass(btns, cls => start(newProfile(cls)), S, cls => confirm(`Перезаписать сохранение героя «${cname(cls)}» (ур. ${S[cls].level})? Его прогресс пропадёт, остальные герои останутся.`)); };
  if (saves.last) {
    const lp = S[saves.last];
    const c = el('button', 'btn gold', `Продолжить: ${esc(cname(saves.last))}, ур. ${lp.level}`); c.onclick = () => { sfx('click'); start(lp); };
    btns.append(c);
    for (const cls of Object.keys(S)) if (cls !== saves.last) { const o = el('button', 'btn', `${esc(cname(cls))}, ур. ${S[cls].level}`); o.onclick = () => { sfx('click'); start(S[cls]); }; btns.append(o); }
    const n = el('button', 'btn', 'Новая игра'); n.onclick = newGame; btns.append(n);
  } else {
    const n = el('button', 'btn gold', 'Начать игру'); n.onclick = newGame; btns.append(n);
  }
  btns.appendChild(el('div', 'muted', `<small>Версия: ${BUILD}</small>`));
  btns.appendChild(el('div', 'muted', '<small>Телефон: джойстик слева, атака справа · ПК: WASD + Пробел</small>'));
}

function pickClass(box, cb, saved = {}, askOverwrite = () => true) {
  box.innerHTML = '<div class="goldc" style="font:600 18px Georgia">Выберите героя</div>';
  const row = el('div', 'classes');
  for (const [id, C] of Object.entries(CLASSES)) {
    const has = saved[id];
    const c = el('button', 'class-card', `<picture><source media="(min-width:900px) and (min-height:600px)" srcset="assets/art/gpt/heroes/${id}.png"><img class="pt" src="assets/sprites/${id === 'warrior' ? 'portrait' : 'portrait_' + id}.png" alt="" onerror="this.src='${iconURL(C.icon)}'"></picture><b>${esc(C.name)}</b><span>${esc(C.desc)}</span>${has ? `<em class="cc-save">есть сохранение · ур. ${has.level}</em>` : ''}`);
    c.onclick = () => { if (box._picked) return; if (has && !askOverwrite(id)) return; box._picked = true; sfx('click'); cb(id); }; row.appendChild(c);
  }
  box.appendChild(row);
}
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  try { if (!document.hidden && !G.awayPause) update(dt); render(); updateHUD(dt); } catch (e) { console.error(e); }
  gameplay(!G.paused && !G.awayPause && !document.hidden && !(G.player && G.player.dead));   // меню, окна, пауза, смерть — для Яндекса игра стоит
  requestAnimationFrame(loop);
}
// persist on tab hide / close (mobile browsers kill background tabs)
// пауза и тишина при сворачивании вкладки / событиях платформы (требование модерации Яндекс Игр)
// Правки 2 (П12): свернули браузер или ушли на другую вкладку — везде (деревня, катакомбы, Глубины, Жатва, Летопись) игра стоит,
// а по возвращении ждёт «Продолжить», чтобы мобы не били, пока игрок снова берёт телефон в руки
const away = new Set();   // 'hidden' — вкладка скрыта, 'platform' — пауза от Яндекса/VK
let pauseOv = null;
function showPauseOv() {
  if (pauseOv || !G.profile) return;
  pauseOv = el('div', 'pause-ov', '<div class="pause-box"><div class="goldc pause-t">Пауза</div></div>');
  const go = el('button', 'btn gold', 'Продолжить'); go.onclick = () => { pauseOv.remove(); pauseOv = null; if (away.size) return; G.awayPause = false; if (G.hidePaused) G.paused = false; G.hidePaused = false; bus.emit('sfx', 'click'); };
  pauseOv.firstChild.appendChild(go); document.body.appendChild(pauseOv);
}
const setAway = (why, on) => {
  if (!G.profile) return;
  const was = away.size > 0; if (on) away.add(why); else away.delete(why); if (why === 'platform') setPaused(on, 'platform');   // скрытую вкладку глушит сам audio.js
  if (on && !was) { if (!G.awayPause) { G.hidePaused = !G.paused; if (G.hidePaused) G.paused = true; } G.awayPause = true; releaseInput(); saveNow(true); gameplay(false); }
  else if (!on && was && !away.size) showPauseOv();   // GameplayAPI.start — из цикла (loop), когда игрок нажмёт «Продолжить»
};
document.addEventListener('visibilitychange', () => setAway('hidden', document.hidden));
bus.on('platformPause', on => setAway('platform', on));
addEventListener('pagehide', () => { releaseInput(); if (G.profile) saveNow(true); });
addEventListener('contextmenu', e => e.preventDefault());
// iOS Safari: block pinch/double-tap zoom and reset any zoom left over after rotation
// двойной тап / щипок на телефоне не должен приближать страницу (экран «уезжал», вернуть масштаб было нельзя)
let lastTap = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTap < 350 && e.target && e.target.closest && e.target.closest('#game,#game3d,#joyZone')) e.preventDefault(); lastTap = n; }, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
const vpMeta = document.querySelector('meta[name=viewport]'); const VP = vpMeta.content;
function resetZoom() {
  vpMeta.content = VP + ', minimum-scale=1'; setTimeout(() => { vpMeta.content = VP; window.scrollTo(0, 0); }, 60);
}
addEventListener('orientationchange', () => { resetZoom(); setTimeout(resetZoom, 400); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (Math.abs(visualViewport.scale - 1) > 0.01) resetZoom(); });
initInput($('joyZone'), $('joyBase'), $('joyKnob')); initMouse($('game')); initCamZoom($('game'));
input.anchor = () => G.player ? G.cam.toScreen(G.player.x, G.player.y) : [innerWidth / 2, innerHeight / 2];
window.__G = G;   // for automated QA
window.__BUILD = BUILD;
boot().catch(e => { console.error(e); $('loadtxt').textContent = 'Ошибка загрузки: ' + e.message; });
