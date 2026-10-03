#!/usr/bin/env python3
"""Сжатие ригнутой GLB из Meshy для игры: python3 tools/art/glb_pack.py <in.glb> <assets/models/имя.glb> [размер=1024]
Текстуры → JPEG <размер> px (PNG 2048 весит 5 МБ), убираются расширения материалов (specular/ior) и эмиссия (игра красит своим
тон-шейдером), скелет, веса и анимации остаются как есть. Буфер собирается заново без выброшенных картинок."""
import sys, struct, json, io
from PIL import Image

def main(src, dst, size=1024):
    d = open(src, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); b0 = 20 + L
    BL = struct.unpack('<I', d[b0:b0 + 4])[0]; B = d[b0 + 8:b0 + 8 + BL]
    img_views = {}
    for im in j.get('images', []):
        bv = j['bufferViews'][im['bufferView']]; raw = B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        pic = Image.open(io.BytesIO(raw)).convert('RGB'); pic = pic.resize((size, size), Image.LANCZOS) if max(pic.size) > size else pic
        out = io.BytesIO(); pic.save(out, 'JPEG', quality=88); img_views[im['bufferView']] = out.getvalue(); im['mimeType'] = 'image/jpeg'
    for m in j.get('materials', []):
        m.pop('extensions', None); m.pop('emissiveTexture', None); m.pop('emissiveFactor', None)
    j.pop('extensionsUsed', None); j.pop('extensionsRequired', None)
    # заново сложить буфер: каждый bufferView подряд, с выравниванием 4
    nb = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        chunk = img_views.get(i, B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])
        while len(nb) % 4: nb += b'\0'
        bv['byteOffset'] = len(nb); bv['byteLength'] = len(chunk); nb += chunk
    while len(nb) % 4: nb += b'\0'
    j['buffers'] = [{'byteLength': len(nb)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(nb)) + b'BIN\0' + bytes(nb)
    open(dst, 'wb').write(out)
    print(f'{src} → {dst}: {len(d) // 1024} КБ → {len(out) // 1024} КБ, анимации: {[a.get("name") for a in j.get("animations", [])]}')

if __name__ == '__main__': main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1024)
