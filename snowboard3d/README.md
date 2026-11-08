# Школа сноуборда 3D — новая версия

Играть: https://iliafreedive-del.github.io/game-rpg/snowboard3d/

Прежняя версия остаётся на своём месте и не меняется: https://iliafreedive-del.github.io/game-rpg/snowboard/ (папка `snowboard/`).
Уроки, трассы, демонстрации с «Дальше», разбор падений и прогресс — те же (прогресс общий: он хранится в браузере).
Новое — графика и позы.

## Что сделано в Blender

Модели собираются скриптами Blender 5.2 (без интерфейса, `pip install bpy==5.2.3`) и лежат в `models/`:

| Файл | Скрипт | Что внутри |
| --- | --- | --- |
| `rider.glb`, `rider_rig.json` | `tools/blender/build_rider.py` | Райдер одной сеткой с 19 костями: куртка в два цвета (голубой верх, тёмно-синий низ и предплечья, ровный открытый подол, молния, карманы, воротник-стойка, капюшон валиком), прямые серые штаны поверх ботинок со складками «гармошкой» над ботинком и под коленом, варежки с манжетой, ботинки с подошвой и колёсиком BOA, баф, маска с линзой, шлем. Тени в складках запечены в цвет вершин (Cycles AO). |
| `gear.glb` | `tools/blender/build_gear.py` | Доска с боковым вырезом, подъёмом носа и хвоста, топшитом, скользяком, боковиной и стальным кантом (размеры как в физике игры); крепление: диск с винтами, база, хилкап, хайбэк (наклоняется вместе с голенью), два стрепа, трещотки. |
| `scenery.glb` | `tools/blender/build_scenery.py` | Ели трёх видов и дальняя ель, камень и скала — крупные грани и снежные шапки на каждом ярусе, в духе POLYGON Snow Kit. Игра расставляет их сотнями (InstancedMesh). |

Купол шлема сделала нейросеть **Hunyuan3D-2** (Tencent, Hugging Face) по кадру из бесплатного стокового ролика Mixkit;
в Blender он обрезан, сделан симметричным и упрощён (`tools/blender/src/helmet_hunyuan.glb`).

Как кости следуют за игрой: суставы по-прежнему считает IK в `js/rider.js`; `js/art/body.js` ставит каждую кость
так, чтобы сегмент сетки лёг между нужными суставами (рамка сегмента сейчас × рамка в позе покоя⁻¹ × поворот покоя из glTF).

Пересобрать модели:

```
pip install bpy==5.2.3
python3 snowboard3d/tools/blender/build_rider.py
python3 snowboard3d/tools/blender/build_gear.py
python3 snowboard3d/tools/blender/build_scenery.py
```

Посмотреть модель отдельно: `tools/view-model.html?m=../models/rider.glb` (через любой статический сервер).

## Позы по видео

По кадрам роликов, где люди катаются (heel/toe-повороты и ровное скольжение), поза теперь зависит от канта:
на пятках райдер глубже садится «на высокий стул», таз над пятками, руки впереди коленей;
на носках колени и таз подаются к склону, передняя рука тянется к носу доски, задняя — у бедра.

## Проверки

```
node snowboard3d/tools/check-lessons.mjs
node snowboard3d/tools/check-tracks.mjs
node snowboard3d/tools/demo-pauses.mjs
PLAYWRIGHT=/путь/к/playwright node snowboard3d/tools/check-screen.mjs http://localhost:8000/snowboard3d/index.html?shots=1 desktop|phone|land
```

## Лицензии

three.js — MIT. Купол шлема — результат модели Tencent Hunyuan3D-2 (Tencent Hunyuan Community License), исходный кадр — Mixkit (бесплатная лицензия Mixkit).
Остальные модели сделаны скриптами в этой папке.
