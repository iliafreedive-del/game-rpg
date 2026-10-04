# Картинки → 3D через Meshy API

Только **Image to 3D** (форма + текстура). Риг и анимации — вручную (Meshy «Применить риг» / Blender), потом
`python3 tools/art/glb_pack.py <ригнутая.glb> assets/models/<имя>.glb` — игра сама возьмёт скелет и ходьбу.

1. Картинку положить в `art_meshy/in/<имя>.webp|png|jpg` (правила картинки — `docs/art_brief_meshy/`).
2. `python3 tools/art/meshy.py art_meshy/in/<имя>.webp <имя>` (нужен `MESHY_API_KEY`; ≈ 1–3 мин).
   Ключи: `--polycount 12000` (по умолчанию), `--pose t-pose` для двуногих, `--prompt "…"` — подсказка для текстуры.
3. Результат: `art_meshy/raw/<имя>.glb` — как отдал Meshy (в git не идёт), `assets/models/<имя>.glb` — сжатая для игры.
   id задачи — в `tools/art/meshy_tasks.json`; оборвалось ожидание/скачивание — `python3 tools/art/meshy.py --resume <имя>`.
4. В игре: `kit.mob.preloadMob('<имя>')` + `kit.mob.buildMob(kit, '<имя>', { height })` (`js/render3d/glbmob.js`).
   Без скелета модель показывается жёсткой (покачивание корпуса); после рига — та же строка, анимации из файла.

| Имя | Картинка | Где в игре |
|---|---|---|
| `dog_town` | `in/dog_town.webp` — тёмно-коричневая лохматая собака с ошейником | Собаки деревни (`critters.js`), просмотр `lab/beasts.html` → «Собака (Meshy)» |

Скачивание файлов идёт с `assets.meshy.ai` — этот адрес должен быть разрешён в сетевых настройках окружения
(сам API — `api.meshy.ai`).
