// Слияние у кузнеца (сборка 20): 9 серых мечей + 3 синих шлема + 3 серых доспеха → «Слить всё»; карточка вещи; навыки по уровню
const G = window.__G, gm = await import('/js/game/game.js'), { bus } = await import('/js/game/ctx.js'), I = await import('/js/game/items.js'), EC = await import('/js/game/economy.js'), CH = await import('/js/game/character.js');
G.profile.tutorial.prologue = true; G.profile.level = 7; G.profile.gold = 5000; if (G.zoneId !== 'town') { await gm.loadZone('town'); await sleep(1200); }
const st = document.createElement('style'); st.textContent = '#toasts{display:none!important}'; document.head.appendChild(st);
const P = G.profile; P.bag = [];
for (let i = 0; i < 9; i++) P.bag.push(I.makeItem({ slot: 'weapon', cls: P.cls, ilvl: 5 + (i % 3), rarity: 0 }));
for (let i = 0; i < 3; i++) P.bag.push(I.makeItem({ slot: 'head', cls: P.cls, ilvl: 6, rarity: 2 }));
for (let i = 0; i < 4; i++) P.bag.push(I.makeItem({ slot: 'chest', cls: P.cls, ilvl: 6, rarity: 0 }));
print('groups', EC.mergeGroups().filter(g => g.n).map(g => `${g.slot}/${g.rarity}: ${g.n} (${g.can})`).join(' | '));
bus.emit('openNPC', 'smith'); await sleep(900); await shot('merge_tab');
const m = EC.mergeAll(); print('merged', m.length, m.map(i => `${i.name} r${i.rarity} ⚔${I.itemPower(i)}`).join(' | '), 'gold left', P.gold, 'bag', P.bag.length);
document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '✕') b.click(); }); await sleep(300);
bus.emit('openNPC', 'smith'); await sleep(900); await shot('merge_tab2');
document.querySelectorAll('.modal-bg button').forEach(b => { if (b.textContent.trim() === '✕') b.click(); }); await sleep(300);
const { openWindow } = await import('/js/ui/windows.js'); openWindow('skills'); await sleep(900); await shot('skills_locked');
print('skill costs', ['whirlwind', 'fireball', 'meteor'].map(id => id + ':' + CH.skillCost(id) + ':' + JSON.stringify(CH.canLearn(id))).join(' '));
