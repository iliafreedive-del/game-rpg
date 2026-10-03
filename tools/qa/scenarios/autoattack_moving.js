const G = window.__G; const gm = await import('/js/game/game.js');
const { Enemy } = await import('/js/game/entities.js');
for (const cls of ['melee']) {
  const pl = G.player; G.enemies.length = 0;
  // враг впереди по ходу движения (на 2,8 м правее и чуть сбоку), идём вправо мимо него
  const e = new Enemy('skel_warrior', pl.x + 3.0, pl.y + 1.2, 1); e.aggro = true; e.speed = 0; G.enemies.push(e);
  const hp0 = e.hp; let att = 0, x0 = pl.x;
  dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
  for (let i = 0; i < 70; i++) { await step(1); if (pl.state === 'attack') att++; }
  dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd' }));
  print('moving past enemy: hp', hp0, '->', e.hp.toFixed(1), 'attack frames', att, 'moved', (pl.x - x0).toFixed(1));
}
