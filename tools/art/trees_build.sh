#!/bin/sh
# Пак деревьев Meshy (сборка 71): лист «Low Poly Forest Trees» с Яндекс Диска → assets/models/trees/trees.glb.
# Урезка по допуску (0,12 — ближние; 0,25 — «_lo»: лес за краем карты и тень ближних, js/render3d/forestglb.js) — чтобы нагрузка не выросла.
#   sh tools/art/trees_build.sh <Meshy_AI_Low_Poly_Forest_Trees_*.glb>   (meshoptimizer — см. tools/art/tree_pack.mjs)
N=0.18; F=0.3
SEED=2000 node tools/art/tree_pack.mjs "$1" assets/models/trees/trees.glb \
  birch=0:0::$N spruce=1:0::$N pine=2:0::$N oak=3:0::$N rowan=4:0::$N birch_small=5:0::$N deadfir=6:0::$N log=7:0::$N spruce_snow=1:0:snow:$N \
  birch_lo=0:0::$F spruce_lo=1:0::$F pine_lo=2:0::$F oak_lo=3:0::$F rowan_lo=4:0::$F birch_small_lo=5:0::$F deadfir_lo=6:0::$F log_lo=7:0::$F spruce_snow_lo=1:0:snow:$F
