#!/usr/bin/env python3
"""Сжатие ригнутой GLB из Meshy для игры: python3 tools/art/glb_pack.py <in.glb> <assets/models/имя.glb> [размер=1024]
Текстуры → JPEG <размер> px (PNG 2048 весит 5 МБ; уже JPEG не больше размера — не пережимается), убираются расширения материалов
(specular/ior) и эмиссия (игра красит своим тон-шейдером), скелет, веса и анимации остаются как есть. Буфер собирается заново.
Компактные числа (KHR_mesh_quantization, GLTFLoader его понимает): нормали — байты, UV — 16 бит, веса костей — байты;
вершина 52 → 28 байт. Позиции остаются float: у ригнутой сетки масштаб узла не действует, сжимать их некуда."""
import sys, struct, json, io, subprocess
try: from PIL import Image
except ImportError: Image = None   # нет Pillow — сжимаем ImageMagick (convert)

def to_jpeg(raw, size):
    if Image:
        pic = Image.open(io.BytesIO(raw)).convert('RGB'); pic = pic.resize((size, size), Image.LANCZOS) if max(pic.size) > size else pic
        out = io.BytesIO(); pic.save(out, 'JPEG', quality=88); return out.getvalue()
    return subprocess.run(['convert', '-', '-resize', f'{size}x{size}>', '-quality', '88', 'jpeg:-'], input=raw, capture_output=True, check=True).stdout

def jpeg_size(raw):
    i = 2
    while i < len(raw) - 9:
        if raw[i] != 0xFF: return None
        m, n = raw[i + 1], struct.unpack('>H', raw[i + 2:i + 4])[0]
        if m in (0xC0, 0xC1, 0xC2): return struct.unpack('>HH', raw[i + 5:i + 9])
        i += 2 + n
    return None

def quantize(j, views):
    """атрибуты float → нормализованные целые; views — список байтов по bufferView (меняется на месте)"""
    def read(ai):
        a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]
        if a['componentType'] != 5126 or bv.get('byteStride') or a.get('sparse'): return None
        n = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]; raw = views[a['bufferView']]
        off = a.get('byteOffset', 0); return list(struct.unpack_from(f'<{a["count"] * n}f', raw, off)), n
    def put(ai, data, ctype, stride=None):
        a = j['accessors'][ai]; j['bufferViews'].append({'buffer': 0, 'byteLength': len(data), **({'byteStride': stride} if stride else {})})
        views.append(bytes(data)); a['bufferView'] = len(j['bufferViews']) - 1; a['byteOffset'] = 0; a['componentType'] = ctype; a['normalized'] = True
        a.pop('min', None); a.pop('max', None)
    used = False
    for m in j.get('meshes', []):
        for pr in m['primitives']:
            at = pr['attributes']
            if 'NORMAL' in at and (r := read(at['NORMAL'])):
                v, _ = r; out = bytearray()
                for k in range(0, len(v), 3): out += struct.pack('<bbbx', *[max(-127, min(127, round(c * 127))) for c in v[k:k + 3]])
                put(at['NORMAL'], out, 5120, 4); used = True
            if 'TEXCOORD_0' in at and (r := read(at['TEXCOORD_0'])) and min(r[0]) >= 0 and max(r[0]) <= 1:
                put(at['TEXCOORD_0'], struct.pack(f'<{len(r[0])}H', *[round(c * 65535) for c in r[0]]), 5123)
            if 'WEIGHTS_0' in at and (r := read(at['WEIGHTS_0'])):
                v, _ = r; out = bytearray()
                for k in range(0, len(v), 4):
                    w = [round(c * 255) for c in v[k:k + 4]]; w[w.index(max(w))] += 255 - sum(w); out += bytes(w)   # сумма ровно 255
                put(at['WEIGHTS_0'], out, 5121)
    if used:
        for key in ('extensionsUsed', 'extensionsRequired'): j[key] = sorted(set(j.get(key, [])) | {'KHR_mesh_quantization'})

def main(src, dst, size=1024):
    d = open(src, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); b0 = 20 + L
    BL = struct.unpack('<I', d[b0:b0 + 4])[0]; B = d[b0 + 8:b0 + 8 + BL]
    img_views = {}
    for im in j.get('images', []):
        bv = j['bufferViews'][im['bufferView']]; raw = B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        js = jpeg_size(raw) if raw[:2] == b'\xff\xd8' else None
        if not (js and max(js) <= size): img_views[im['bufferView']] = to_jpeg(raw, size)
        im['mimeType'] = 'image/jpeg'
    for m in j.get('materials', []):
        m.pop('extensions', None); m.pop('emissiveTexture', None); m.pop('emissiveFactor', None)
    j.pop('extensionsUsed', None); j.pop('extensionsRequired', None)
    views = [img_views.get(i, B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]) for i, bv in enumerate(j['bufferViews'])]
    quantize(j, views)
    # заново сложить буфер: только используемые bufferView, подряд, с выравниванием 4
    keep = sorted({a['bufferView'] for a in j.get('accessors', []) if 'bufferView' in a} | {im['bufferView'] for im in j.get('images', []) if 'bufferView' in im})
    remap = {o: n for n, o in enumerate(keep)}
    for a in j.get('accessors', []):
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
    for im in j.get('images', []):
        if 'bufferView' in im: im['bufferView'] = remap[im['bufferView']]
    j['bufferViews'] = [j['bufferViews'][o] for o in keep]; views = [views[o] for o in keep]
    nb = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        chunk = views[i]
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
