# Лист объектов Meshy (одна сетка, много фигур) → отдельные GLB по фигурам (пак «каменная», Разрушенный храм).
#   python3 -I tools/art/sheet_split.py <лист.glb> xy|xz [зазор] [папка префикс [текстура]]  — xy: фигуры стоят рядами (враги), xz: предметы лежат на «полу» листа
import sys, json, struct, numpy as np
src, plane = sys.argv[1], sys.argv[2]; margin = float(sys.argv[3]) if len(sys.argv) > 3 else 0.01
b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+L]); bin_ = b[28+L:]
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = {'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
    dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin_, dt, a['count']*n, off).reshape(-1, n) if n > 1 else np.frombuffer(bin_, dt, a['count'], off)
pr = j['meshes'][0]['primitives'][0]; P = acc(pr['attributes']['POSITION']); UV = acc(pr['attributes']['TEXCOORD_0']); I = acc(pr['indices']).reshape(-1, 3)
nv = len(P); par = np.arange(nv)
def f(x):
    r = x
    while par[r] != r: r = par[r]
    while par[x] != r: par[x], x = r, par[x]
    return r
def un(a, b_):
    a, b_ = f(a), f(b_)
    if a != b_: par[a] = b_
q = {}
for v in range(nv):
    k = tuple(np.round(P[v], 5))
    if k in q: un(v, q[k])
    else: q[k] = v
for t in I: un(t[0], t[1]); un(t[0], t[2])
roots = np.array([f(v) for v in range(nv)])
comps = {}
for ti, t in enumerate(I): comps.setdefault(roots[t[0]], []).append(ti)
ax = (0, 1) if plane == 'xy' else (0, 2)
boxes = []
for r, tris in comps.items():
    vs = np.unique(I[tris].ravel()); p = P[vs]
    boxes.append([p[:, ax].min(0), p[:, ax].max(0), tris])
# cluster overlapping boxes
changed = True
while changed:
    changed = False
    for i in range(len(boxes)):
        for k in range(i+1, len(boxes)):
            a, c = boxes[i], boxes[k]
            if np.all(a[0] - margin <= c[1]) and np.all(c[0] - margin <= a[1]):
                boxes[i] = [np.minimum(a[0], c[0]), np.maximum(a[1], c[1]), a[2] + c[2]]; del boxes[k]; changed = True; break
        if changed: break
out = []
for bx in boxes:
    tris = bx[2]; vs = np.unique(I[tris].ravel()); uv = UV[vs]
    out.append({'lo': bx[0].round(3).tolist(), 'hi': bx[1].round(3).tolist(), 'tris': len(tris), 'uvlo': uv.min(0).round(2).tolist(), 'uvhi': uv.max(0).round(2).tolist()})
out.sort(key=lambda o: (-round(o['hi'][1], 1), o['lo'][0]))
for i, o in enumerate(out): print(i, o)
# export: each cluster -> outdir/<prefix><i>.glb (Meshy-like: one mesh, POSITION/NORMAL/TEXCOORD_0, baseColor JPEG atlas)
if len(sys.argv) > 4:
    import os, subprocess
    outdir, prefix, tex = sys.argv[4], sys.argv[5], sys.argv[6] if len(sys.argv) > 6 else '2048'
    os.makedirs(outdir, exist_ok=True)
    N = acc(pr['attributes']['NORMAL'])
    mat = j['materials'][pr.get('material', 0)]; ti = mat['pbrMetallicRoughness']['baseColorTexture']['index']
    bvi = j['bufferViews'][j['images'][j['textures'][ti]['source']]['bufferView']]
    img = bin_[bvi.get('byteOffset', 0): bvi.get('byteOffset', 0) + bvi['byteLength']]
    jpg = subprocess.run(['convert', '-', '-resize', f'{tex}x{tex}>', '-quality', '88', 'jpeg:-'], input=img, capture_output=True).stdout
    boxes.sort(key=lambda o: (-round(float(o[1][1]), 1), float(o[0][0])))
    for k, bx in enumerate([x for x in boxes if len(x[2]) > 20]):
        tris = np.array(bx[2]); vs, inv = np.unique(I[tris].ravel(), return_inverse=True)
        p = P[vs].astype(np.float32).copy(); p[:, 0] -= (p[:, 0].min() + p[:, 0].max()) / 2; p[:, 2] -= (p[:, 2].min() + p[:, 2].max()) / 2; p[:, 1] -= p[:, 1].min()
        n = N[vs].astype(np.float32); uv = UV[vs].astype(np.float32); idx = inv.astype(np.uint16 if len(vs) < 65536 else np.uint32)
        chunks = []; bvs = []; off = 0
        def put(a, target=None):
            global off
            by = a.tobytes(); pad = (-off) % 4
            if pad: chunks.append(b'\0' * pad); off += pad
            bvs.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(by), **({'target': target} if target else {})}); chunks.append(by); off += len(by); return len(bvs) - 1
        accs = [{'bufferView': put(p, 34962), 'componentType': 5126, 'count': len(p), 'type': 'VEC3', 'min': p.min(0).tolist(), 'max': p.max(0).tolist()},
                {'bufferView': put(n, 34962), 'componentType': 5126, 'count': len(p), 'type': 'VEC3'},
                {'bufferView': put(uv, 34962), 'componentType': 5126, 'count': len(p), 'type': 'VEC2'},
                {'bufferView': put(idx, 34963), 'componentType': 5123 if idx.dtype == np.uint16 else 5125, 'count': len(idx), 'type': 'SCALAR'}]
        im = put(np.frombuffer(jpg, np.uint8)); pad = (-off) % 4
        if pad: chunks.append(b'\0' * pad); off += pad
        name = f'{prefix}{k}'
        J = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': name, 'mesh': 0}],
             'meshes': [{'name': name, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
             'accessors': accs, 'bufferViews': bvs, 'buffers': [{'byteLength': off}], 'images': [{'bufferView': im, 'mimeType': 'image/jpeg'}],
             'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'textures': [{'source': 0, 'sampler': 0}],
             'materials': [{'name': 'm', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}]}
        js = json.dumps(J).encode(); js += b' ' * ((-len(js)) % 4); bb = b''.join(chunks)
        with open(f'{outdir}/{name}.glb', 'wb') as fo:
            fo.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bb))); fo.write(struct.pack('<II', len(js), 0x4E4F534A)); fo.write(js); fo.write(struct.pack('<II', len(bb), 0x004E4942)); fo.write(bb)
        print('wrote', name, len(tris), (p.max(0)).round(3).tolist())
