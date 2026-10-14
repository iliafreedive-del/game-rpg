#!/bin/sh
# Пак деревьев Meshy → assets/models/trees/trees.glb (js/render3d/forestglb.js). Сборка 72: только ель и ель в снегу (лист «Low Poly
# Forest Trees» с Яндекс Диска): «_mid» (0,08) — на карте,
# «_lo» (0,18) — за краем карты, у края деревни и тень. Грани плоские делает forestglb.js.
#   sh tools/art/trees_build.sh <Meshy_AI_Low_Poly_Forest_Trees_*.glb>   (meshoptimizer — см. tools/art/tree_pack.mjs)
D=0.08; F=0.18
SEED=2000 node tools/art/tree_pack.mjs "$1" assets/models/trees/trees.glb \
  spruce_mid=1:0::$D spruce_snow_mid=1:0:snow:$D spruce_lo=1:0::$F spruce_snow_lo=1:0:snow:$F
