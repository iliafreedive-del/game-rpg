// Лавка питомцев Кофи (панель у повозки): телефон портрет / ландшафт, ПК. node tools/qa/kofi_pets.mjs [папка] [prefix]
import { browser, open, mod, advance, shot, sleep, stopServers, mkdir } from './lib.mjs';
const out = mkdir(process.argv[2] || '/tmp/claude-0/kofi'), pre = process.argv[3] || '';
const b = await browser();
for (const [name, w, h, mobile] of [['phone_portrait', 393, 852, true], ['phone_land', 852, 393, true], ['pc', 1366, 768, false]]) {
  const p = await open(b, { w, h, mobile });
  await p.evaluate(() => { const G = window.__G, P = G.profile; P.tutorial.prologue = true; P.level = 14; P.gold = 1025; P.shards = 30; P.pets = { own: { fennec: 1, crow: 3 }, active: 'fennec', met: true, tut: 1 }; });
  await mod(p, '/game/game.js', 'loadZone', 'town', {}); await sleep(1500); await advance(p, 300);
  await p.evaluate(async () => { (await import('/js/game/ctx.js')).bus.emit('panel', { id: 'caravan' }); });
  await advance(p, 300); await sleep(1500); await advance(p, 50);
  await shot(p, `${out}/${pre}${name}.jpg`);
  if (process.env.PREVIEW) { await p.evaluate(() => document.querySelector('.pet-pic')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(2500); await advance(p, 600); await sleep(800); await shot(p, `${out}/${pre}${name}_preview.jpg`); }
  console.log(name, p.errors.slice(0, 5).join('\n'));
  await p.context().close();
}
await b.close(); stopServers();
