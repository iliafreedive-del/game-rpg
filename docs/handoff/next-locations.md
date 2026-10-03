# Передача: работа над другими локациями (после сборки 16)

## Промт для нового диалога (скопировать целиком)

> Проект: браузерная 3D-RPG «Dark Ascent» (репозиторий iliafreedive-del/game-rpg, рабочая ветка `integration/all`, ES-модули, three.js локально, без сборщика).
> Сначала прочитай `CLAUDE.md`, `docs/handoff/next-locations.md` (этот файл), `docs/CHANGELOG.md` (журнал замечаний, последние разделы — сборки 11–16), `docs/ECONOMY.md`, `docs/handoff/village-redesign.md`, `docs/ART_BIBLE.md`, `docs/MODEL_SPEC.md`.
> Деревня уже переделана (генератор по правилам, сборки 11–15) и баланс обновлён (сборка 16). Этот диалог — про **другие локации**: катакомбы (пролог и сюжетные этажи), Глубины катакомб, походы (Фьорды Скъёльда, Старый Лес — поля и форты), Цитадель, Жатва Бездны. Задачи пришлю списком; сначала коротко предложи решение и план, согласуй со мной, потом строй. Не спрашивай по мелочам — решения принимай сам.
> Как работаем: пишу по-русски разговорно, тестирую на iPhone через Cloudflare. После каждой пачки правок: поднять `BUILD` в `js/main.js`, собрать архив (`rm -f dist/dark-ascent-cloudflare.zip && zip -qr dist/dark-ascent-cloudflare.zip _headers index.html manifest.webmanifest css js assets`), скриншоты и отчёт по-русски: что сделано, что нет, что не проверено. Коммиты и пуш — в `integration/all`. PR не создавай. Мои замечания записывай в `docs/CHANGELOG.md` по правилам из `CLAUDE.md` (сразу при получении — моими словами; в конце — статусы ✅/⚠️/❌/🔍 и комментарий; не проверял на iPhone = 🔍).

## Где что лежит (локации)
| Локация | Генерация / данные | Сборка зоны и 3D |
|---|---|---|
| Деревня | `js/world/villagegen.js` (правила, `PLAN`) | `js/world/zone.js` `buildTown`; модели `js/render3d/models/prop/*` |
| Катакомбы (пролог, сюжет) | `assets/maps/catacombs.json`, `js/world/floorgen.js` (пролог) | `zone.js` `buildDungeon`, `js/render3d/dungeon.js` (стены по тайлам) |
| Глубины | `js/world/floorgen.js` (`generateFloor`, `floorLevel`) | `buildDungeon`, биомы `LIGHT.crypt.biome` в `js/render3d/style.js` |
| Походы (поля, форты) | `js/world/wildgen.js`, `js/data/wild.js` (`REALMS`, `wildLevel`), `js/game/wild.js` (спавн, ворота, итог) | `zone.js` `buildWild`, `js/world/wildfloor.js` |
| Цитадель | `js/world/castlegen.js`, `js/game/castle.js` (факелы, осколки) | `buildDungeon` |
| Костяные пустоши (сборка 17) | `js/data/wild.js` (`REALMS.bones`, мобы `b_*`), `js/world/wildgen.js` (`bn`: скелеты великанов `GIANT_FOOT`, лагеря) | `zone.js` `buildWild`, модели `prop/_steppe.js`, `_giants.js`, `_camp.js`, `_bones.js`; земля `ground.js` `uSteppe`, свет `LIGHT.wildSteppe` |
| Жатва Бездны | `js/game/survival.js` (`generateArena`) | — |
| Летопись битв | `js/ui/herospath.js`, сцена `js/render3d/hwstage.js` | — |

Загрузка зон и порталы: `js/game/game.js` `loadZone`, `interact`. Земля/трава/вода: `js/render3d/ground.js`. Предметы окружения в 3D: `js/render3d/props.js` (instanced-батчи, `viewClear` — конусы обзора без деревьев). Туман у земли: `js/render3d/toon.js` (`HFOG_F`, сила `U.uHFog` — сейчас только в деревне). Дым: `js/render3d/atmo.js`. Живность: `js/render3d/critters.js`. Реестр моделей: `js/render3d/registry.js`; коллайдеры и свет предметов — `PROP` в `zone.js`.

## Что уже есть и можно переиспользовать
- Декор в стиле POLYGON Adventure Pack: `cart`, `cart_load`, `signpost`, `barrel_stack`, `log_stack`, `plank_pile`, `clothesline`, `pumpkins`, `tool_stand` (уже стоят в лагерях Старого Леса, `wildgen.js`). Во Фьорды декор не добавлялся.
- Здания: `church`, `tavern`, `shop`, `smithy`, `cottage_a/b/c` (`_cottage.js`), `house_0/1/2` (`_house.js`), `mill_ruin`, `bridge`, `barricade`; вывески — `_sign.js`.
- Правило зазоров (препятствия вплотную или с проходом ≥ 1,3 м) — пока только в генераторе деревни; для других локаций его можно вынести.
- Баланс сборки 16: квадратичный рост врагов после 3 ур. (`js/data/enemies.js`), Глубины круче после 8-го этажа, походы — после первого форта; энергия Летописи и факелы Глубин тратятся только за повторы и поражения; 7 сетов (`js/data/sets.js`); Глава II «Тени за порогом» (`js/data/quests.js`, цели `wild`/`depths`/`hw`).

## Проверка (инструменты)
- Сервер: `python3 -m http.server 8123` в корне репозитория.
- Сценарий в игре: `node tools/qa/run.mjs <сценарий.js> <ширина> <высота>` → снимки `shot('имя')` в `/tmp/claude-0/shots/`. Внутри сценария: `window.__G`, `step(n)` (кадры по 1/30 с), `sleep`, `print`. Зона: `const gm = await import('/js/game/game.js'); await gm.loadZone('wild', { realm: 'forest', depth: 1 })`. Обзор сверху: `G.zoomMul = 0.34` и отодвинуть туман `window.__R3.scene.fog`.
- Готовые сценарии: `tools/qa/scenarios/town_reach.js` (достижимость всех NPC/порталов с реальными коллайдерами), `depths_balance.js` (автобой на этаже; `localStorage` LVL/FLOOR), `autoattack_moving.js` (удары на ходу; `CLS=1|2` — лучник/маг). Раскладка деревни ASCII: `node tools/qa/village_ascii.mjs`.
- Модели: `node tools/check_models.mjs [id…]`.
- Подсказки в походах (окна «Понятно») закрывать кликом по кнопке, иначе они перекрывают кадр; меню Глубин при входе — тоже окно (`.modal-bg`).

## Костяные пустоши — что осталось (сборка 18)
- Модели: клыкастый дикарь (`_brute.js`: рубака, метатель, шаман, вождь), скорпион с клешнями и жалом, босс — Костяной исполин. Сейчас `b_raider/b_thrower/b_shaman/b_chief` — перекрашенные скелеты, `b_scorpid` — зверь, `b_boss` — заготовка босса.
- Руины на 6-й глубине: песчаные колонны, арки, плиты; сейчас стены — частокол форта Леса (`props.js` `MODEL`, стена `tusk_fence` уже есть).
- Вход со 2 уровня и `baseLevel: 3` — временно; место в цепочке (`progress.js gate`) не задано.
- Сценарии проверки: `tools/qa/scenarios/bones_field.js` (поле глубины `BD`), `bones_flow.js` (портал → бой), `bones_perf.js` (нагрузка), `bones_portal.js`.

## Простор и возрождение (сборка 18)
- `js/world/widen.js` — растяжение подземелий (×1,5, `ROOMY` в `game.js`): катакомбы, Глубины, Цитадель; только в 3D. Двери/печати ('D', 'G') — одна клетка.
- Походы: плотность — `wildgen.js` (`nBlobs` ×0,55, `nFlora` ×0,5, шаг 3,5 м, `CAMP_CLEAR` 5 м, `json.wild.camps`), опушки — `zone.js buildWild`, край и фон — `props.js`.
- Растворение перед врагами — `toon.js` (`U.uFoc`, 3 ближайших), заполняет `renderer3d.js`.
- Возрождение — `js/game/respawn.js` (120 с, не ближе 10 м к герою; `e.respawned`). Тест: `tools/qa/scenarios/respawn.js`; подземелья — `roomy_dungeons.js`.

## Известные хвосты
- Ничего из сборок 11–16 не проверено на iPhone, кроме того, что прислал пользователь (по его скриншотам всё работает).
- В лесу деревья местами закрывают декор лагерей.
- Ручная игра на новом балансе не замерялась (только автобой).
