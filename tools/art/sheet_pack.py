# Склейка фигур одного листа (общий атлас) в один пак GLB: узел = объект, основание y = 0, центр X/Z, высота 1.
#   python3 -I tools/art/sheet_pack.py <выход.glb> <текстура>[r|f|p] имя=фигура.glb[#градусы][@метки.npy:k] …
#   r — повернуть к осям по граням (изометрия листа), f — повернуть на #градусы, p — длинная ось тела → +Z (звери под beastGlb)
import sys, json, struct, numpy as np, subprocess
out, tex = sys.argv[1], sys.argv[2]
ALIGN = tex.endswith('r'); FIXED = tex.endswith('f'); PCA = tex.endswith('p'); tex = tex.rstrip('rfp')
def load(path):
    b = open(path, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+L]); B = b[28+L:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = {'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]; dt = {5126:np.float32,5123:np.uint16,5125:np.uint32}[a['componentType']]
        return np.frombuffer(B, dt, a['count']*n, bv['byteOffset']).reshape(-1, n)
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    return acc(0).copy(), acc(1).copy(), acc(2).copy(), acc(3).reshape(-1, 3).astype(np.int64), B[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
objs = []; img = None
for arg in sys.argv[3:]:
    name, src = arg.split('=', 1); lab = None; extra = 0
    if '#' in src: src, extra = src.split('#'); extra = float(extra)
    if '@' in src: src, l = src.split('@'); lf, k = l.split(':'); lab = (np.load(lf), int(k))
    P, N, UV, I, im = load(src); img = img or im
    if lab: I = I[lab[0] == lab[1]]
    vs, inv = np.unique(I.ravel(), return_inverse=True); P, N, UV = P[vs], N[vs], UV[vs]; I = inv.reshape(-1, 3)
    if ALIGN:   # Meshy sheet drawn in isometry: turn so vertical faces align with X/Z (front stays nearest to +Z)
        a, b_, c = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]; n = np.cross(b_ - a, c - a); ar = np.linalg.norm(n, axis=1) / 2; n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        vt = np.abs(n[:, 1]) < 0.4; ang = np.degrees(np.arctan2(n[vt, 2], n[vt, 0])) % 90
        h, _ = np.histogram(ang, bins=90, range=(0, 90), weights=ar[vt]); h2 = np.convolve(np.r_[h[-3:], h, h[:3]], np.ones(5) / 5, 'same')[3:-3]; th = int(np.argmax(h2)) + 0.5
        phi = np.radians((-th if th < 45 else 90 - th) + extra); cs, sn = np.cos(phi), np.sin(phi)
        P = np.stack([P[:, 0] * cs - P[:, 2] * sn, P[:, 1], P[:, 0] * sn + P[:, 2] * cs], 1); N = np.stack([N[:, 0] * cs - N[:, 2] * sn, N[:, 1], N[:, 0] * sn + N[:, 2] * cs], 1)
    if PCA:   # длинная ось тела (в плане) → +Z, затем доп. поворот extra (180 — развернуть голову)
        Q = P[:, [0, 2]] - P[:, [0, 2]].mean(0); w, v = np.linalg.eigh(Q.T @ Q); ax = v[:, -1]
        extra = extra + np.degrees(np.pi / 2 - np.arctan2(ax[1], ax[0])); FIXED = True
    if FIXED and extra:
        phi = np.radians(extra); cs, sn = np.cos(phi), np.sin(phi)
        P = np.stack([P[:, 0] * cs - P[:, 2] * sn, P[:, 1], P[:, 0] * sn + P[:, 2] * cs], 1); N = np.stack([N[:, 0] * cs - N[:, 2] * sn, N[:, 1], N[:, 0] * sn + N[:, 2] * cs], 1)
    lo, hi = P.min(0), P.max(0); s = 1 / (hi[1] - lo[1])
    P = np.stack([(P[:, 0] - (lo[0] + hi[0]) / 2) * s, (P[:, 1] - lo[1]) * s, (P[:, 2] - (lo[2] + hi[2]) / 2) * s], 1).astype(np.float32)
    objs.append((name, P, N.astype(np.float32), UV.astype(np.float32), I.astype(np.uint16)))
    print(f'{name}: {len(I)} tris, w {np.ptp(P[:,0]):.2f} d {np.ptp(P[:,2]):.2f} (h 1)')
jpg = subprocess.run(['convert', '-', '-resize', f'{tex}x{tex}>', '-quality', '82', 'jpeg:-'], input=img, capture_output=True).stdout
chunks, bvs, accs, nodes, meshes = [], [], [], [], []; off = 0
def put(a, target=None):
    global off
    by = a.tobytes(); pad = (-off) % 4
    if pad: chunks.append(b'\0' * pad); off += pad
    bvs.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(by), **({'target': target} if target else {})}); chunks.append(by); off += len(by); return len(bvs) - 1
for name, P, N, UV, I in objs:
    a0 = len(accs)
    accs += [{'bufferView': put(P, 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC3', 'min': P.min(0).tolist(), 'max': P.max(0).tolist()},
             {'bufferView': put(N, 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC3'},
             {'bufferView': put(UV, 34962), 'componentType': 5126, 'count': len(P), 'type': 'VEC2'},
             {'bufferView': put(I.ravel(), 34963), 'componentType': 5123, 'count': I.size, 'type': 'SCALAR'}]
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': a0, 'NORMAL': a0 + 1, 'TEXCOORD_0': a0 + 2}, 'indices': a0 + 3, 'material': 0}]})
    nodes.append({'name': name, 'mesh': len(meshes) - 1})
im = put(np.frombuffer(jpg, np.uint8)); pad = (-off) % 4
if pad: chunks.append(b'\0' * pad); off += pad
J = {'asset': {'version': '2.0', 'generator': 'temple pack'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': meshes,
     'accessors': accs, 'bufferViews': bvs, 'buffers': [{'byteLength': off}], 'images': [{'bufferView': im, 'mimeType': 'image/jpeg'}],
     'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'textures': [{'source': 0, 'sampler': 0}],
     'materials': [{'name': 'stone', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}]}
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4); bb = b''.join(chunks)
with open(out, 'wb') as fo:
    fo.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bb))); fo.write(struct.pack('<II', len(js), 0x4E4F534A)); fo.write(js); fo.write(struct.pack('<II', len(bb), 0x004E4942)); fo.write(bb)
print(out, (12 + 16 + len(js) + len(bb)) // 1024, 'KB')
