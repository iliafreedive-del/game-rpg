#!/usr/bin/env bash
# Архив для Cloudflare / Яндекса (сборка 47+): копия игры во временную папку, текстуры внутри .glb — JPEG → WebP (качество 82),
# атлас props_0.png — 256 цветов, картинки и JS — tools/pack_assets.py и tools/minify_js.mjs (сборка 66); в репозитории файлы не меняются.
# Нужен gltf-transform: GT=/путь/к/gltf-transform tools/build_zip.sh  (npm i @gltf-transform/cli). Без него — архив без сжатия.
set -euo pipefail
TOOLS=$(cd "$(dirname "$0")" && pwd)
cd "${SRC:-$(dirname "$0")/..}"   # SRC=/путь/dist/en — английская копия (tools/i18n/build_en.mjs)
OUT=${OUT:-dist/umbrahold-cloudflare.zip}; STAGE=$(mktemp -d)
cp -r _headers index.html boot.js manifest.webmanifest css js assets "$STAGE"/; for d in js_*; do [ -d "$d" ] && cp -r "$d" "$STAGE"/; done
if [ -n "${GT:-}" ] && [ -x "$GT" ]; then
  find "$STAGE/assets/models" -name '*.glb' | while read -r f; do t="${f%.glb}.tmp.glb"; "$GT" webp "$f" "$t" --quality 82 >/dev/null 2>&1 && mv "$t" "$f" || rm -f "$t"; done
  # сборка 48: выход обязательно .glb — с другим расширением gltf-transform пишет .gltf + отдельные .bin и baseColor.webp (общий на все модели — в сборке 47 текстуры перепутались)
fi
python3 - "$STAGE/assets/sprites/props_0.png" <<'PY'
import sys
from PIL import Image
p = sys.argv[1]; im = Image.open(p)
if im.mode == 'RGBA': im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(p, optimize=True)
PY
# сборка 66: картинки (листы эффектов, арт GPT, текстуры шкур) пережимаются, мёртвые файлы убираются — tools/pack_assets.py
[ "${PACK:-1}" = 0 ] || python3 "$TOOLS/pack_assets.py" "$STAGE"
# сборка 66: JS без комментариев и пробелов (все языки) — нужен esbuild: ESB=/путь/node_modules/esbuild (npm i esbuild@0.25)
if [ -n "${ESB:-}" ] && [ -d "$ESB" ]; then node "$TOOLS/minify_js.mjs" "$STAGE" "$ESB"
  # сборка 75: и все модули языка — одним файлом main.js (экран «Загрузка…» ждал ~340 запросов); BUNDLE=0 — как раньше
  [ "${BUNDLE:-1}" = 0 ] || node "$TOOLS/bundle_js.mjs" "$STAGE" "$ESB"; fi
rm -f "$OUT"; (cd "$STAGE" && zip -9qr - .) > "$OUT"
echo "$STAGE"; ls -l "$OUT"
