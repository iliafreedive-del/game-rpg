// Снимки окна «Герой» с нарисованной экипировкой: все виды вещей × все редкости в сумке, на телефоне и ПК.
// node tools/qa/gear_icons.mjs [папка]  → <папка>/gear_<устройство>.jpg
import { browser, open, mod, advance, shot, stopServers, OUT } from './lib.mjs';
import path from 'path';
const dir = process.argv[2] || path.join(OUT, 'gear');
const DEV = [['phone', 393, 852, true], ['phone_land', 852, 393, true], ['pc', 1280, 720, false]];
const b = await browser();
for (const [name, w, h, mobile] of DEV) {
  const p = await open(b, { w, h, mobile, cls: 0 });
  await p.evaluate(async () => {
    const G = window.__G, P = G.profile, IT = await import('/js/game/items.js');
    P.level = 60; P.tutorial.prologue = true;
    const mk = (base, rarity) => { const it = IT.makeItem({ base, rarity, ilvl: 40, noClamp: true }); it.rarity = rarity; delete it.req; return it; };
    P.gear.weapon = mk('knight_sword', 3); P.gear.head = mk('helm', 2); P.gear.chest = mk('plate', 4); P.gear.amulet = mk('amulet', 1);
    P.bag = [];
    for (const base of ['short_sword', 'claymore', 'hand_axe', 'short_bow', 'oak_staff', 'cap', 'helm', 'jerkin', 'plate', 'amulet']) for (let r = 0; r < 5; r++) P.bag.push(mk(base, r));
  });
  await mod(p, '/ui/windows.js', 'openWindow', 'inventory');
  await advance(p, 800); await p.waitForTimeout(2500); await advance(p, 800);   // картинки вещей грузятся лениво
  await shot(p, path.join(dir, `gear_${name}.jpg`));
  if (p.errors.length) console.log(name, p.errors.slice(0, 3));
  await p.context().close();
}
await b.close(); stopServers();
