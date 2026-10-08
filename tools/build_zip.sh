#!/usr/bin/env bash
# Архив для Cloudflare (сборка 47+): копия игры во временную папку, текстуры внутри .glb — JPEG → WebP (качество 82),
# атлас props_0.png — 256 цветов; в репозитории файлы не меняются. Итог — dist/dark-ascent-cloudflare.zip (~15 МБ вместо 18).
# Нужен gltf-transform: GT=/путь/к/gltf-transform tools/build_zip.sh  (npm i @gltf-transform/cli). Без него — архив без сжатия.
set -euo pipefail
cd "${SRC:-$(dirname "$0")/..}"   # SRC=/путь/dist/en — английская копия (tools/i18n/build_en.mjs)
OUT=${OUT:-dist/dark-ascent-cloudflare.zip}; STAGE=$(mktemp -d)
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
rm -f "$OUT"; (cd "$STAGE" && zip -qr - .) > "$OUT"
echo "$STAGE"; ls -l "$OUT"
