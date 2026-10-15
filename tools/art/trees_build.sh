#!/bin/sh
# Пак деревьев Meshy → assets/models/trees/trees.glb (js/render3d/forestglb.js): ель и ель в снегу (лист «Low Poly Forest Trees»
# с Яндекс Диска, дерево №1 листа). Сборка 73: цвет по граням с атласа в полном размере (FACE=1) — без «мыла»; «_mid» 1500 тр. —
# на карте и для картинок края деревни, «_lo» 400 тр. — за краем карты и тень.
#   sh tools/art/trees_build.sh <Meshy_AI_Low_Poly_Forest_Trees_*.glb>   (meshoptimizer — см. tools/art/tree_pack.mjs)
FACE=1 SEED=2000 node tools/art/tree_pack.mjs "$1" assets/models/trees/trees.glb \
  spruce_mid=1:1500 spruce_snow_mid=1:1500:snow spruce_lo=1:400 spruce_snow_lo=1:400:snow
