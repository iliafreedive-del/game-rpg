# Handoff: ветка integration/all
Объединение `content/new-location` (Походы) и `claude/loving-albattani-avnt41` (3D), далее правки по тестам.
- Поход (zone `wild`) рисуется в 3D: земля — `buildGround(scene, zone, {snow,...})` (ground.js, снег для Фьордов), стены/башни/ворота/дом/шатры форта — `models/prop/_fort.js`, слой окружения — режим `wild` в `props.js`, свет — `LIGHT.wildFjord/wildForest`.
- Форт 26×20, поле 64×64 (`world/wildgen.js`). Объекты форта: `fort_tower`, `fort_gate`, `fort_hall`, `tent` (в 2D — запасные спрайты, см. PROP в zone.js).
- Мобы походов: 14 моделей в `models/mob/` (варианты `_skeleton.js`, `_beast.js` с шерстью, `_boss.js`).
- «Жатва Бездны» (survival) остаётся в 2D. Лучник и маг — в 2D.
- Сквозная прогрессия и замки — `game/progress.js`.
