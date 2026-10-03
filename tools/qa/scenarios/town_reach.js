const G = window.__G; const gm = await import('/js/game/game.js');
G.profile.tutorial.prologue = true; G.profile.story.flags.bossKilled = true; await gm.loadZone('town', { from: 'catacombs' }); await sleep(1500);
const m = G.zone.map, W = m.w, H = m.h, r = 0.42, step2 = 0.5, nx = W / step2, ny = H / step2;
const ok = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) ok[j * nx + i] = m.free(i * step2 + 0.25, j * step2 + 0.25, r) ? 1 : 0;
const dist = new Int32Array(nx * ny).fill(-1), q = []; const s = [Math.floor(G.player.x / step2), Math.floor(G.player.y / step2)];
print('player', G.player.x.toFixed(1), G.player.y.toFixed(1), 'free', m.free(G.player.x, G.player.y, r));
dist[s[1] * nx + s[0]] = 0; q.push(s[1] * nx + s[0]);
while (q.length) { const k = q.shift(), i = k % nx, j = (k / nx) | 0; for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]) { const I = i + a, J = j + b; if (I < 0 || J < 0 || I >= nx || J >= ny) continue; const kk = J * nx + I; if (!ok[kk] || dist[kk] >= 0) continue; dist[kk] = dist[k] + 1; q.push(kk); } }
const res = [];
for (const it of G.zone.inter) { let best = 1e9; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (dist[k] < 0) continue; const d = Math.hypot(i * step2 + 0.25 - it.x, j * step2 + 0.25 - it.y); if (d < best) best = d; } res.push(it.id + ':' + (best <= it.r ? 'ok' : 'FAR ' + best.toFixed(1) + '>' + it.r)); }
print(res.join(' | '));
print('start free', m.free(G.zone.start[0], G.zone.start[1], r));
