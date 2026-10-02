# Handoff: ветка integration/all
Объединение `content/new-location` (Походы) и `claude/loving-albattani-avnt41` (3D), далее правки по тестам.
- Поход (zone `wild`) рисуется в 3D: земля — `buildGround(scene, zone, {snow,...})` (ground.js, снег для Фьордов), стены/башни/ворота/дом/шатры форта — `models/prop/_fort.js`, слой окружения — режим `wild` в `props.js`, свет — `LIGHT.wildFjord/wildForest`.
- Форт 26×20, поле 64×64 (`world/wildgen.js`). Объекты форта: `fort_tower`, `fort_gate`, `fort_hall`, `tent` (в 2D — запасные спрайты, см. PROP в zone.js).
- Мобы походов: 14 моделей в `models/mob/` (варианты `_skeleton.js`, `_beast.js` с шерстью, `_boss.js`).
- «Жатва Бездны» (survival) остаётся в 2D. Лучник и маг — в 2D.
- Сквозная прогрессия и замки — `game/progress.js`.

## Сборка 10 (по замечаниям к сборке 9)
- Лучник: поза натяжения на IK рук (`armIK` в rig.js), лук повёрнут поперёк предплечья, тетива и стрела следуют за правой кистью (`bow_hunter.js`, `Actor.update` вызывает `weapon.update`); маска ворона, перья вместо плаща.
- Дыхание/«пружинка» стойки: `_hero.js` (breath/shift). Пятятся лицом к врагу: `a.back` в клипах `walk`, хореография «Летописи» — herospath.js.
- Деревья: дрожь листвы больше не зависит от нормали (toon.js) — грани ствола не разъезжаются. Варианты деревьев/камней: `models/prop/_variants.js`, `tree_poplar/oakwide/sapling`.
- Деревня: подписи и «!/?» над NPC рисует `drawNpcPlates` (renderer.js, 3D-оверлей); порталы разной формы (`_portals.js`), расчищенные опушки; шатёр торговки `market_tent.js`.
- Жатва Бездны теперь в 3D (рой — Actor из пула, `syncSwarm`), арена 100×100, враги появляются за краем экрана.
- Возврат из режимов — к своему порталу (`how.from`: catacombs/depths/survival/castle/wild).
- Поход: `data/wild.js` (FIELDS_PER_FORT, locationName), `wildgen.js` (варианты полей, ворота), `wild.js` (`checkGate`, `outsideLeft`), кнопка `#wildExit` в nemesis.js.
- Сюжет: `STORY` (turnIn), `Q.isReady`, миграция v5→v6 пересчитывает стадию.
- QA: `node tools/qa/run.mjs сценарий.js` — универсальный запуск внутри страницы (print/sleep/step/shot/hclick).
