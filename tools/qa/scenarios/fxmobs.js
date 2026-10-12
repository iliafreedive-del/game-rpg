// П21: листы атак зверей (assets/art/fx/fx_mobs.json). TAG=realm:тип:что1+что2 (что: tele | mob_bite | mob_claw | mob_gore | mob_charge_crash)
const G = window.__G, gm = await import('/js/game/game.js'), { Enemy } = await import('/js/game/entities.js');
const [RL, TY, W0] = (window.__TAG || 'forest:w_wolf:tele+mob_bite').split(':'); const want = W0.split('+');
G.profile.level = 20;
await gm.loadZone('wild', { realm: RL, depth: 1 }); await sleep(1500);
const close = () => document.querySelectorAll('button').forEach(b => { if (/Понятно|Закрыть|Ясно/.test(b.textContent)) b.click(); });
close(); await step(10); close();
G.enemies.length = 0; const P = G.player;
const spawn = (dx, dy) => { const [x, y] = G.zone.map.nearestFree(P.x + dx, P.y + dy, 0.5); const e = new Enemy(TY, x, y, 1); e.aggro = true; e.chCd = 0; G.enemies.push(e); return e; };
let e = spawn(3.6, -1.4); await step(5);
const seen = {};
for (let i = 0; i < 1500 && want.some(w => !seen[w]); i++) {
  P.hp = G.stats.maxHP;
  if (e.dead || Math.hypot(e.x - P.x, e.y - P.y) > 9 || (i % 150 === 149 && !e.lunge && !e.atk)) { G.enemies.length = 0; e = spawn(3.6, -1.4); }
  await step(1);
  const tg = e.teleg, fx = G.effects.find(f => f.kind === 'sheet' && want.includes(f.id) && !seen[f.id]);
  let hit = null;
  if (want.includes('tele') && !seen.tele && tg && tg.sheet === 'charge' && e.anim.prog / e.atk.impact > 0.6) hit = 'tele';
  else if (fx && fx.t / fx.dur > 0.2) hit = fx.id;
  if (hit) { seen[hit] = 1; G.paused = true; await sleep(250); await shot('fxmobs_' + RL + '_' + TY + '_' + hit); G.paused = false; print('shot', hit, 'step', i); }
}
print('seen', seen, 'effects', G.effects.map(f => f.kind + ':' + (f.id || '')).join(','));
