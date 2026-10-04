# Задача для новой сессии: собака из Meshy с ригом волка

> **ВЫПОЛНЕНО** (4 октября): `assets/models/dog_town.glb` в `integration/all`, артефакт https://claude.ai/artifact/JhB81LPxwkNjPUL1DLiknL. Ниже — как это делалось (пригодится для следующих зверей).

Продолжаем Dark Ascent, ветка `integration/all`. Прочитай `CLAUDE.md`, `docs/CHANGELOG.md` (сборка 31), `art_meshy/README.md`.

## Что уже есть (сборка 31, коммиты dbf6439, e681f3a, b1bcbdf)
- `tools/art/meshy.py` — картинка → Meshy Image to 3D → скачать → сжать (`glb_pack.py`) → `assets/models/<имя>.glb`;
  ключ `--rig wolf_grey` сразу переносит риг волка, `--resume <имя>` докачивает уже готовую задачу.
- `tools/art/rig_transfer.mjs` — перенос скелета, весов и анимаций волка (`assets/models/wolf_grey.glb`) на статичную модель.
  Проверен только на заменителе (волк без скелета), на настоящей собаке — ещё нет.
- `js/render3d/glbmob.js` грузит ригнутые и нериганные GLB; собаки деревни (`js/render3d/critters.js`) берут
  `dog_town.glb`, если он есть; в просмотре `lab/beasts.html` — кнопка «Собака (Meshy)».
- Картинка собаки: `art_meshy/in/dog_town.webp` — тёмно-коричневая лохматая собака, светлая грудь, кожаный ошейник,
  хвост бубликом. Это собака деревни (две собаки у кузницы и на площади).

## Задача Meshy (уже сгенерирована, платить заново не надо)
- id: `01a1059d-aeea-73a9-b4ee-5aaa36e10ef5` (записан в `tools/art/meshy_tasks.json`, имя `dog_town`), статус SUCCEEDED.
- Файлы лежат у Meshy **до 2026-10-07 06:34 UTC**. Позже — генерировать заново:
  `python3 tools/art/meshy.py art_meshy/in/dog_town.webp dog_town --rig wolf_grey`.
- Откуда: API `https://api.meshy.ai/openapi/v1/image-to-3d/<id>` → поле `model_urls.glb` → файл на `https://assets.meshy.ai/…`.
- Куда: как есть → `art_meshy/raw/dog_town.glb` (в git не идёт); сжатая и ригнутая → `assets/models/dog_town.glb` (в git).

## Шаги
1. **Проверь сеть**: `curl -sS -o /dev/null -w "%{http_code}\n" https://assets.meshy.ai/` — должен быть код ответа (не 000 и
   не «CONNECT tunnel failed 403»). Если закрыто — скажи мне сразу: в настройках окружения в Allowed domains нужен
   `assets.meshy.ai` (или `*.meshy.ai`) и галочка «default list of common package managers».
2. **Проверь, сделана ли собака**: есть ли `assets/models/dog_town.glb` в `origin/integration/all`. На момент написания — НЕТ
   (тестовые файлы-заменители я удалял, в git их не было).
3. Скачать и ригнуть: `python3 tools/art/meshy.py --resume dog_town --rig wolf_grey`.
   В выводе `rig_transfer` — «пропорции к донору (Ш×В×Д)»: у собаки ожидается короче волка.
4. **Проверь глазами** (рендер без GPU — `--use-angle=swiftshader`): собака стоит головой вперёд (иначе
   `node tools/art/rig_transfer.mjs … --flip`), лапы на земле, ходьба, «лёг» (смерть), атака — без разрывов сетки;
   текстура тёмно-коричневая, не бледная. Хвост бубликом скорее всего будет двигаться вместе со спиной — это ожидаемо,
   опиши как есть. Сравни с волком `wolf_grey` в тех же позах.
5. Проверь в деревне: обе собаки (у кузницы и на площади) — новая модель, рост ~0,95 м (`critters.js`, `height`), «села» = легла.
6. **Артефакт для теста**: опубликуй просмотр `lab/beasts.html` (как артефакт «Шерсть зверей»: страница + нужные js +
   `assets/models/dog_town.glb.json` с GLB в base64 — просмотр-артефакт не отдаёт .glb, см. `preloadMob`), открыта «Собака (Meshy)».
7. Журнал `docs/CHANGELOG.md` (сборка 31, пункт 4 → статус по факту), коммит и пуш в `integration/all`.
