// Окно «Задание выполнено» (первая награда старосты: лук/меч + умение) на экранах MacBook, ПК и телефона: ничего не наезжает, «Надеть» под вещью
import { browser, open, mod, advance, shot, OUT, stopServers } from '../lib.mjs';
// [ширина, высота, размер текста (настройка игры), телефон, плотность пикселей]: MacBook Air/Pro (Retina, масштаб браузера 90–125% = другой CSS-размер окна), ПК, iPad, телефоны в обеих ориентациях
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SIZES0 = [[1440, 900, 1, 0, 2], [1280, 800, 1, 0, 2], [1470, 956, 1, 0, 2], [1152, 720, 1, 0, 2], [1600, 1000, 1, 0, 2], [1280, 800, 1.25, 0, 2], [1440, 900, 1.5, 0, 2], [1920, 1080, 1], [2560, 1440, 1], [1366, 768, 1], [820, 1180, 1, true, 2], [1180, 820, 1, true, 2], [375, 667, 1, true, 2], [390, 844, 1, true, 3], [430, 932, 1.25, true, 3], [667, 375, 1, true, 2], [844, 390, 1, true, 3], [932, 430, 1, true, 3]];
const b = await browser(); const bad = [];
const SIZES = SIZES0.filter(([w, h]) => !ONLY || ONLY.includes(w + 'x' + h));
for (const [w, h, fs, mobile, dpr] of SIZES) {
  const p = await open(b, { w, h, cls: 1, mobile: !!mobile, dpr, seed: 7 });
  if (fs !== 1) await p.evaluate(fs => document.documentElement.style.setProperty('--fs', fs), fs);
  await p.evaluate(async () => { const Q = await import('/js/game/quests.js'); const { STORY } = await import('/js/data/quests.js'); Q.grant(STORY[0].reward, STORY[0].title, { sub: 'Задание выполнено' }); });
  for (let i = 0; i < 20 && !await p.$('.modal.reward'); i++) { await mod(p, '/ui/windows.js', 'pumpRewards'); await advance(p, 500); }   // окно ждёт конца облёта камеры / подсказок
  if (!await p.$('.modal.reward')) { console.log(w + 'x' + h, 'NO WINDOW'); bad.push(w + 'x' + h); await p.context().close(); continue; }
  await advance(p, 900); await p.waitForTimeout(900);   // CSS-появление карточек идёт по настоящим часам
  // карточки и их содержимое: ни один ребёнок не вылезает за свою карточку, карточки не наезжают друг на друга
  const r = await p.evaluate(() => { const out = []; const cards = [...document.querySelectorAll('.modal.reward .mb > *')];
    for (let i = 1; i < cards.length; i++) { const a = cards[i - 1].getBoundingClientRect(), c = cards[i].getBoundingClientRect(); if (c.top < a.bottom - 1) out.push(`overlap ${cards[i - 1].className} / ${cards[i].className}`); }
    for (const c of document.querySelectorAll('.modal.reward .rw-card')) { const R = c.getBoundingClientRect(); for (const k of c.querySelectorAll('*')) { const q = k.getBoundingClientRect(); if (q.height && (q.bottom > R.bottom + 1 || q.top < R.top - 1)) out.push(`spill ${k.className || k.tagName} in ${c.className}`); } }
    const wear = [...document.querySelectorAll('.modal.reward button')].find(x => x.innerText.trim() === 'Надеть'), card = wear && wear.closest('.rw-card');
    if (card) { const R = card.getBoundingClientRect(), q = wear.getBoundingClientRect(); if (Math.abs((q.left + q.right) / 2 - (R.left + R.right) / 2) > R.width * 0.1) out.push('wear not centered under item'); }   // строка «Надеть» во всю ширину карточки, а не в колонке иконки
    return { out: [...new Set(out)], wearIn: !!card };
  });
  const tag = `${w}x${h}${fs !== 1 ? '_fs' + fs : ''}`; console.log(tag, JSON.stringify(r)); if (r.out.length || !r.wearIn) bad.push(tag);
  await shot(p, `${OUT}/quest_reward/${tag}.png`); await p.context().close();
}
await b.close(); stopServers(); console.log(bad.length ? 'FAIL ' + bad.join(' ') : 'OK'); process.exit(bad.length ? 1 : 0);
