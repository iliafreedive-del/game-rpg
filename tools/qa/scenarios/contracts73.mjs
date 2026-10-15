// сборка 73: долгие контракты чередуются — сданный уходит, на его место встаёт другой (не тот же, другого вида). Снимок доски.
import fs from 'fs';
import { browser, open, advance, shot, stopServers, loadZone, settle, closeAll } from '../lib.mjs';
const b = await browser(); const p = await open(b, { w: 900, h: 600 });
const res = await p.evaluate(async () => {
  const Q = await import('/js/game/quests.js'), G = window.__G, P = G.profile;
  P.story.flags.bossKilled = true; { const { STORY } = await import('/js/data/quests.js'); P.story.stage = STORY.findIndex(q => q.id === 'c3_depths15'); } P.depths = P.depths || {}; P.depths.best = 5; P.stats.kills = 320;
  const ids = () => Q.repList().map(r => r.id), out = { start: ids() };
  const seq = [];
  for (let k = 0; k < 12; k++) {   // сдать «убить» 12 раз подряд: каждый раз на месте — другой контракт
    const s = P.repBoard.find(x => !x.until && Q.repList().some(r => r.id === x.id)); const r = Q.repList().find(x => x.id === s.id);
    P.stats[r.stat] = (P.stats[r.stat] || 0) + r.n * 2; if (!Q.claimRep(r.id)) return { err: 'claim ' + r.id };
    const i = P.repBoard.indexOf(s); out.cool = Q.repCooling().length; const next = s.id; s.until = Date.now() - 1; Q.repList();
    seq.push(r.id + ' -> ' + next); if (next === r.id) return { err: 'same ' + r.id, seq };
  }
  out.seq = seq; out.end = ids();
  // миграция старого сохранения: r_walk1000 сдан и ждёт — вместо него встаёт другой
  delete P.repBoard; P.repeat.r_walk1000 = { accepted: true, base: 0, completions: 1, coolUntil: Date.now() + 3600e3 };
  out.mig = Q.repList().map(r => r.id); out.migCool = Q.repCooling().length; out.migNext = P.repBoard[1].id;
  return out;
});
console.log(JSON.stringify(res, null, 1));
await b.close(); stopServers();
// снимок: сохранение сборки 58 (воин 9 ур.) — проверка переноса старой доски; деревня, у доски; три контракта уже сменились, один сдан и ждёт замены
const fx = JSON.parse(fs.readFileSync(new URL('../fixtures/saves/build58_warrior.json', import.meta.url))).storage;
const b2 = await browser(); const p2 = await open(b2, { w: 900, h: 600, save: fx });
await loadZone(p2, 'town'); await settle(p2); await closeAll(p2);
console.log('migrated', await p2.evaluate(async () => { const Q = await import('/js/game/quests.js'), P = window.__G.profile; const ids = Q.repList().map(r => r.id + ' ' + Q.repState(r).cur + '/' + r.n);
  P.story.flags.bossKilled = true; P.depths = P.depths || {}; P.depths.best = Math.max(5, P.depths.best || 0);
  P.repBoard[0] = { id: 'r_floors15', until: Date.now() - 1 }; P.repBoard[2] = { id: 'r_forts5', until: Date.now() - 1 }; P.repBoard[3] = { id: 'r_merge10', until: Date.now() - 1 }; Q.repList();
  P.stats.floors = (P.stats.floors || 0) + 6; P.stats.forts = (P.stats.forts || 0) + 2; P.stats.merges = (P.stats.merges || 0) + 3;
  P.repBoard[4] = { id: 'r_hw30', until: Date.now() + 47 * 3600e3 };   // «Победить босса без смерти» сдан, ждёт замены (без окна награды)
  const G = window.__G, bd = G.zone.inter.find(i => i.id === 'board'); G.player.x = bd.x; G.player.y = bd.y + 1; return ids; }));
await advance(p2, 600);
await p2.evaluate(async () => { const { bus } = await import('/js/game/ctx.js'); bus.emit('panel', window.__G.zone.inter.find(i => i.id === 'board')); });   // у доски (сюжетное «сначала к старосте» не мешает снимку)
await new Promise(r => setTimeout(r, 1200));
await p2.addStyleTag({ content: '.npc-panel{animation:none!important;opacity:1!important}' });
console.log('dbg', await p2.evaluate(() => { const r = document.getElementById('npcPanel').getBoundingClientRect(); return [r.x, r.y, r.width, r.height, getComputedStyle(document.getElementById('npcPanel')).opacity, getComputedStyle(document.getElementById('ui')).display]; }));
await p2.evaluate(() => { const b = document.getElementById('npcPanel'); const h = [...b.querySelectorAll('.pn-sub')].find(x => /Долгие/.test(x.innerText)); if (h) b.scrollTop = h.offsetTop - 20; });
await shot(p2, '/tmp/claude-0/-home-user/9b13f171-af9e-5b86-b4fe-7b6095765a85/scratchpad/board_panel.png');
console.log('errors', p.errors, p2.errors);
await b2.close(); stopServers();
