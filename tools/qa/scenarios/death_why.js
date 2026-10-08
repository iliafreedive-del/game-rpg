const G = window.__G; const gm = await import('/js/game/game.js'); const C = await import('/js/game/combat.js');
G.profile.depths = { best: 2, stars: {} }; await gm.loadZone('depths', { floor: 3 }); await sleep(1200); document.querySelectorAll('.modal-bg button').forEach((b, i) => { if (i === 0) b.click(); }); await sleep(300);
const e = G.enemies.find(x => !x.dead); G.player.inv = 0; G.player.hp = 3; e.dmgMul = 50; C.enemyHitsPlayer(e, 1, 'phys'); for (let i = 0; i < 120; i++) { await step(1); await sleep(20); }
print(G.player.dead, document.getElementById('death').innerText.replace(/\n+/g, ' | ')); await shot('death_why');
