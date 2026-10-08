// Сборка 50: «Летопись битв» на телефоне — бойцы крупные, надписи не налезают. Запуск: node tools/qa/run.mjs tools/qa/scenarios/hwfight50.js 430 932
const G = window.__G; const P = G.profile; P.level = 12; P.tutorial.prologue = true; P.skills.whirl = 1; P.hw = { top: 3, stars: {}, en: { n: 20, at: Date.now() } };
const HP = await import('/js/ui/herospath.js'); HP.openHeroPath(); await sleep(500);
print((document.querySelector('.hw-root')||{}).innerText?.slice(0,300)); const g = document.querySelector('.hw-go') || document.querySelector('.hw-stage.cur'); g.click(); await sleep(300);
print(document.querySelector('.hw-root').innerText.slice(0,200)); [...document.querySelectorAll('.hw-root button')].find(b => /В бой/.test(b.textContent)).click(); await sleep(2500);
await shot('hw50_' + innerWidth + 'x' + innerHeight);
print('ok');
