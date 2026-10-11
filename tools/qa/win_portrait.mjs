// Окна в портрете телефона (393 px ширины, как iPhone 15): снимок каждого окна целиком — видно, где текст зажат, а рядом пусто.
// node tools/qa/win_portrait.mjs [папка] [окна через запятую]
import { browser, open, mod, advance, shot, sleep, stopServers, mkdir } from './lib.mjs';
const out = mkdir(process.argv[2] || '/tmp/claude-0/win_portrait');
const list = (process.argv[3] || 'shrine,skills,inventory,character,journal,season,codex,npc_merchant,npc_caravan,npc_trainer,npc_smith,npc_elder,board,depths,wild,settings,help,menu,map').split(',');
const W = +(process.env.W || 393), H = +(process.env.H || 852);
const b = await browser();
const p = await open(b, { w: W, h: H, mobile: true });
await p.evaluate(async () => { const G = window.__G; G.profile.tutorial.prologue = true; G.profile.level = 8; G.profile.gold = 5000; G.profile.shards = 20; });
await mod(p, '/game/game.js', 'loadZone', 'town', {}); await sleep(1500); await advance(p, 300);
for (const w of list) {
  await p.evaluate(() => { window.__G.cinema = null; });
  await mod(p, '/ui/windows.js', 'closeModal', true); await advance(p, 400);
  await mod(p, '/ui/windows.js', 'openWindow', w).catch(e => console.log(w, 'ERR', e.message.slice(0, 120)));
  await advance(p, 200); await sleep(700);
  await shot(p, `${out}/${w}.jpg`);
  // всё окно целиком: снимаем каждый прокручиваемый участок
  const n = await p.evaluate(() => { const sc = [...document.querySelectorAll('.modal *')].find(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 4); if (!sc) return 0; window.__sc = sc; return Math.ceil(sc.scrollHeight / sc.clientHeight); });
  for (let i = 1; i < Math.min(n, 6); i++) { await p.evaluate(i => { window.__sc.scrollTop = i * (window.__sc.clientHeight - 40); }, i); await advance(p, 50); await shot(p, `${out}/${w}_${i}.jpg`); }
}
console.log(p.errors.slice(0, 5).join('\n'));
await b.close(); stopServers();
