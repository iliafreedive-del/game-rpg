// 15 октября: на кнопках навыков, зелий и свитка — только нарисованные иконки (без прежних процедурных значков и контуров).
// node tools/qa/run.mjs tools/qa/scenarios/icons73.mjs 844 390
const G = window.__G, P = G.profile, { bus } = await import('/js/game/ctx.js'), A = await import('/js/ui/art.js'), S = await import('/js/data/skills.js');
await sleep(2500); document.querySelectorAll('.modal-bg').forEach(m => m.remove()); G.modalOpen = false; G.paused = false;
const ids = S.classSkillOrder(P.cls);
print('иконки класса загружены заранее:', ids.filter(id => A.artImg(A.ART.skill(id)).ok).length, 'из', ids.length);
P.skills = { whirlwind: 1, cleave: 1 }; P.slots = ['whirlwind', 'cleave', null, null]; bus.emit('skillsChanged');
document.getElementById('btnScroll').classList.remove('hidden'); document.getElementById('ui').classList.remove('lk-scroll', 'lk-sk');
print('свиток:', document.querySelector('#btnScroll img') ? 'картинка' : 'контур', '| контуров svg на кнопке свитка:', document.querySelectorAll('#btnScroll svg').length);
await sleep(500); await shot('icons73_hud');
return 'ok';
