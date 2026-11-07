#!/bin/bash
# tools/shots.sh outdir name "query" [name "query"...]
out=$1; shift
while [ $# -gt 1 ]; do NODE_PATH=/opt/node22/lib/node_modules node "$(dirname $0)/shot.mjs" "$out/$1.png" "$2" ${W:-900} ${H:-560} 2>&1 | tail -3 & shift 2; done; wait
