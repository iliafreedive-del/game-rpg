const G = window.__G; const gm = await import('/js/game/game.js'); const { stats } = await import('/js/game/stats.js'); const IT = await import('/js/game/items.js'); const { GROWTH } = await import('/js/data/items.js');
const P = G.profile, L = +(localStorage.getItem("LVL") || 12), F = +(localStorage.getItem("FLOOR") || 11);
P.level = L; for (const k in GROWTH[P.cls]) P.attrs[k] += GROWTH[P.cls][k] * (L - 1);
P.upg = P.upg || {}; Object.assign(P.upg, { dmg: 18, hp: 18, crit: 8, aps: 8 });
const w = IT.makeItem({ slot: 'weapon', ilvl: L, rarity: 2, cls: P.cls }); delete w.req; w.upg = 4; P.gear.weapon = w;
for (const sl of ['head', 'chest', 'amulet']) { const it = IT.makeItem({ slot: sl, ilvl: L, rarity: 2, cls: P.cls }); delete it.req; P.gear[sl] = it; }
P.skills = P.skills || {}; G.stats = stats(P); print('hero', P.cls, 'L', L, 'dps', G.stats.dps, 'hp', G.stats.maxHP);
P.depths = { best: F - 1, stars: {} };
await gm.loadZone("depths", { floor: F }); await sleep(1500); print("modal", G.modalOpen, G.paused, document.querySelector(".modal-bg") && document.querySelector(".modal-bg").innerText.slice(0, 120)); document.querySelectorAll(".modal-bg button").forEach((b, i) => { if (i === 0) b.click(); }); await sleep(300); print("modal2", G.modalOpen, G.paused); G.auto = true;
const total = G.enemies.length, hp0 = G.enemies.map(e => e.maxHP); print('floor', F, 'enemies', total, 'lvl', G.enemies[0].lvl, 'hp', Math.min(...hp0), '-', Math.max(...hp0));
let t = 0; for (; t < 150; t += 1) { await step(30); if (t % 15 === 0) { const C = await import("/js/game/combat.js"); const n = C.nearestEnemy(G.player.x, G.player.y, 99); print(t, G.player.state, n && Math.hypot(n.x - G.player.x, n.y - G.player.y).toFixed(1), n && Math.round(n.hp), G.player.x.toFixed(1), G.player.y.toFixed(1)); } if (G.player.dead || G.enemies.every(e => e.dead)) break; }
print('time', t, 's  dead', G.player.dead, 'killed', G.enemies.filter(e => e.dead).length + '/' + total, 'hp', Math.round(G.player.hp));
