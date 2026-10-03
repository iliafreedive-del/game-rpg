#!/usr/bin/env python3
"""Импорт статичной GLB-модели (Meshy, TRELLIS, Hunyuan3D…) под процедурный риг героя.
python3 tools/art/glb_rig.py <файл.glb> <имя> — пишет assets/models/<имя>.bin, <имя>.json, <имя>.webp.
Что делает: масштабирует модель (рост RIG['height'], стопы на y=0, лицом +Z), привязывает вершины к костям рига (_hero.js) по
расстоянию до «отрезков костей» с плавным переходом на суставах; отдельные куски меша (лук, плащ, сапоги) можно целиком отдать
одной кости. Текстура цвета — 1024 px webp (карты нормалей/шероховатости тон-шейдингу не нужны).
Формат .bin: pos f32×3 | nrm i8×3(+pad) | uv u16×2 | skinIndex u8×4 | skinWeight u8×4 | index u16; смещения — в .json.
"""
import sys, json, struct, io, collections
import numpy as np
from PIL import Image

# локти — выше края перчатки (у этой модели короткое плечо): иначе рука «ломается» на перчатке
# кости — порядок важен (индексы в skinIndex); parent — по иерархии _hero.js; at — сустав в метрах (координаты модели после масштаба)
PURPLE = lambda c: c[2] > 0.22 and c[2] > c[1] * 1.45 and c[0] > c[1] * 1.05   # фиолетовая ткань (плащ, табард)
RIGS = {
  'archer_raven': {
    'height': 2.3,
    'bones': [
      ('spin', None, [0, 0.8, 0]), ('body', 'spin', [0, 0, 0]), ('hips', 'body', [0, 0.874, 0]), ('torso', 'hips', [0, 0.874, 0]),
      ('head', 'torso', [0, 1.63, 0]),
      ('armL', 'torso', [0.46, 1.495, 0]), ('elL', 'armL', [0.64, 1.27, 0.05]), ('handL', 'elL', [0.69, 1.035, 0.46]),
      ('armR', 'torso', [-0.46, 1.495, 0]), ('elR', 'armR', [-0.64, 1.27, 0.0]), ('handR', 'elR', [-0.713, 0.897, 0.115]),
      ('legL', 'body', [0.207, 0.759, 0]), ('kneeL', 'legL', [0.253, 0.391, 0.0]), ('footL', 'kneeL', [0.276, 0.115, 0.046]),
      ('nock', 'handL', [0.55, 1.12, 0.40]),   # середина тетивы: при натяжении идёт за правой кистью (glbskin.js)
      ('legR', 'body', [-0.207, 0.759, 0]), ('kneeR', 'legR', [-0.253, 0.391, 0.0]), ('footR', 'kneeR', [-0.276, 0.115, 0.046]),
    ],
    # отрезки для привязки: кость → (начало, конец, «толщина»)
    'segs': {
      'hips': ([0, 0.72, 0], [0, 0.95, 0], 0.27), 'torso': ([0, 0.95, 0], [0, 1.62, 0], 0.3), 'head': ([0, 1.66, 0.05], [0, 2.15, 0.05], 0.3),
      'armL': ([0.46, 1.495, 0], [0.64, 1.27, 0.05], 0.13), 'elL': ([0.64, 1.27, 0.05], [0.69, 1.035, 0.46], 0.12), 'handL': ([0.69, 1.035, 0.46], [0.72, 0.98, 0.6], 0.1),
      'armR': ([-0.46, 1.495, 0], [-0.64, 1.27, 0], 0.13), 'elR': ([-0.64, 1.27, 0], [-0.713, 0.897, 0.115], 0.12), 'handR': ([-0.713, 0.897, 0.115], [-0.72, 0.69, 0.1], 0.12),
      'legL': ([0.207, 0.759, 0], [0.253, 0.391, 0], 0.14), 'kneeL': ([0.253, 0.391, 0], [0.276, 0.115, 0.046], 0.13), 'footL': ([0.276, 0.1, 0.0], [0.276, 0.05, 0.3], 0.12),
      'legR': ([-0.207, 0.759, 0], [-0.253, 0.391, 0], 0.14), 'kneeR': ([-0.253, 0.391, 0], [-0.276, 0.115, 0.046], 0.13), 'footR': ([-0.276, 0.1, 0.0], [-0.276, 0.05, 0.3], 0.12),
    },
    # правила для отдельных кусков меша (по рамке куска в метрах): первое подходящее
    'parts': [
      ('тетива', lambda lo, hi: lo[0] > 0.4 and lo[2] > 0.3 and hi[0] - lo[0] < 0.2 and hi[1] - lo[1] > 1.2, 'STRING'),
      ('лук', lambda lo, hi: lo[0] > 0.4 and lo[2] > 0.3, ['handL']),   # плечи, рукоять, тетива и обмотки — всё спереди слева от тела
      ('плащ и колчан', lambda lo, hi: hi[2] < -0.05 and hi[1] > 1.4, ['torso']),
      ('штаны', lambda lo, hi: hi[1] < 1.15 and lo[1] > 0.35 and lo[0] < -0.3 and hi[0] > 0.3, ['hips', 'legL', 'legR', 'kneeL', 'kneeR']),
      ('сапог Л', lambda lo, hi: hi[1] < 0.55 and lo[0] > -0.05, ['kneeL', 'footL']),
      ('сапог П', lambda lo, hi: hi[1] < 0.55 and hi[0] < 0.05, ['kneeR', 'footR']),
    ],
    'blend': 0.05,
  },
  # воин «Violet Vanguard» (Meshy): рост с рогами 2.4 м, пропорции обычные; меч, щит и плащ — одним куском с телом
  'warrior_vanguard': {
    'height': 2.4,
    'bones': [
      ('spin', None, [0, 0.9, 0]), ('body', 'spin', [0, 0, 0]), ('hips', 'body', [0, 1.2, 0]), ('torso', 'hips', [0, 1.2, 0]),
      ('head', 'torso', [0, 1.9, 0]),
      ('armL', 'torso', [0.38, 1.7, 0]), ('elL', 'armL', [0.455, 1.39, 0]), ('handL', 'elL', [0.53, 1.14, 0.06]),
      ('armR', 'torso', [-0.38, 1.7, 0]), ('elR', 'armR', [-0.455, 1.39, 0]), ('handR', 'elR', [-0.505, 1.05, 0.04]),
      ('legL', 'body', [0.152, 1.1, 0]), ('kneeL', 'legL', [0.164, 0.57, 0.02]), ('footL', 'kneeL', [0.177, 0.165, 0.0]),
      ('legR', 'body', [-0.152, 1.1, 0]), ('kneeR', 'legR', [-0.164, 0.57, 0.02]), ('footR', 'kneeR', [-0.177, 0.165, 0.0]),
    ],
    'segs': {
      'hips': ([0, 1.02, 0], [0, 1.3, 0], 0.27), 'torso': ([0, 1.3, 0], [0, 1.88, 0], 0.32), 'head': ([0, 1.92, 0.02], [0, 2.3, 0.02], 0.25),
      'armL': ([0.38, 1.7, 0], [0.455, 1.39, 0], 0.14), 'elL': ([0.455, 1.39, 0], [0.53, 1.14, 0.06], 0.12), 'handL': ([0.53, 1.14, 0.06], [0.55, 1.0, 0.08], 0.09),
      'armR': ([-0.38, 1.7, 0], [-0.455, 1.39, 0], 0.14), 'elR': ([-0.455, 1.39, 0], [-0.505, 1.05, 0.04], 0.12), 'handR': ([-0.505, 1.05, 0.04], [-0.53, 0.92, 0.06], 0.09),
      'legL': ([0.152, 1.1, 0], [0.164, 0.57, 0.02], 0.15), 'kneeL': ([0.164, 0.57, 0.02], [0.177, 0.165, 0], 0.13), 'footL': ([0.177, 0.15, 0], [0.177, 0.05, 0.22], 0.12),
      'legR': ([-0.152, 1.1, 0], [-0.164, 0.57, 0.02], 0.15), 'kneeR': ([-0.164, 0.57, 0.02], [-0.177, 0.165, 0], 0.13), 'footR': ([-0.177, 0.15, 0], [-0.177, 0.05, 0.22], 0.12),
    },
    'parts': [],
    'regions': [
      ('меч', lambda p, c: p[0] < -0.53 and p[1] < 1.0, ['handR']),
      ('край плаща у рук', lambda p, c: PURPLE(c) and c[2] > 0.42 and p[2] < 0.05 and p[1] >= 1.15, ['torso']),   # плащ не тянется за поднятой рукой
      ('щит', lambda p, c: p[0] > 0.56 and 0.6 < p[1] < 1.65 and not (PURPLE(c) and c[2] > 0.42 and p[2] < 0.05), ['elL']),   # светло-фиолетовый сзади — край плаща, не щит
      ('плащ и табард ниже пояса', lambda p, c: PURPLE(c) and p[1] < 1.15, ['hips']),
      ('плащ на спине', lambda p, c: PURPLE(c) and p[2] < -0.12, ['torso']),
    ],
    'blend': 0.05,
  },
}

def load_glb(path):
    d = open(path, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); b0 = 20 + L; BL = struct.unpack('<I', d[b0:b0 + 4])[0]; B = d[b0 + 8:b0 + 8 + BL]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        x = np.frombuffer(B, dt, a['count'] * n, off); return (x.reshape(a['count'], n) if n > 1 else x).copy()
    p = j['meshes'][0]['primitives'][0]
    P, N, UV = acc(p['attributes']['POSITION']), acc(p['attributes']['NORMAL']), acc(p['attributes']['TEXCOORD_0'])
    I = acc(p['indices']) if 'indices' in p else np.arange(len(P))
    tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']; im = j['images'][j['textures'][tex]['source']]; bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    return P.astype(np.float32), N.astype(np.float32), UV.astype(np.float32), I.astype(np.int64).reshape(-1, 3), img

def components(P, T):
    key = np.round(P * 1e4).astype(np.int64); _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    par = np.arange(inv.max() + 1)
    def f(x):
        r = x
        while par[r] != r: r = par[r]
        while par[x] != r: par[x], x = r, par[x]
        return r
    for a, b, c in inv[T]:
        for u, v in ((a, b), (b, c)):
            ru, rv = f(u), f(v)
            if ru != rv: par[ru] = rv
    return np.array([f(i) for i in inv])

def seg_dist(X, a, b):
    a, b = np.array(a, float), np.array(b, float); ab = b - a; t = np.clip(((X - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(X - (a + t[:, None] * ab), axis=1)

def main(src, name):
    R = RIGS[name]; P, N, UV, T, img = load_glb(src)
    lo, hi = P.min(0), P.max(0); s = R['height'] / (hi[1] - lo[1])
    P = (P - [ (lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2 ]) * s
    bones = [b[0] for b in R['bones']]; BI = {b: i for i, b in enumerate(bones)}
    comp = components(P, T)
    # тетива в модели — длинная трёхгранная палочка без вершин в середине: заменяем её на такую же из 8 звеньев,
    # чтобы середина могла оттягиваться к правой кисти
    for r in np.unique(comp):
        m = comp == r; clo, chi = P[m].min(0), P[m].max(0)
        if not (clo[0] > 0.4 and clo[2] > 0.3 and chi[0] - clo[0] < 0.2 and chi[1] - clo[1] > 1.2): continue
        idx = np.where(m)[0]; q = P[idx]; top, bot = q[q[:, 1] > q[:, 1].mean()], q[q[:, 1] <= q[:, 1].mean()]
        a, b = bot.mean(0), top.mean(0); uva, uvb = UV[idx][q[:, 1] <= q[:, 1].mean()].mean(0), UV[idx][q[:, 1] > q[:, 1].mean()].mean(0)
        rad = max(0.006, np.linalg.norm(top - b, axis=1).mean()); ax = (b - a) / np.linalg.norm(b - a)
        e1 = np.cross(ax, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(ax, e1)
        T = T[~np.isin(T, idx).any(1)]
        n0 = len(P); NP, NN, NU, NT = [], [], [], []
        for k in range(9):
            t = k / 8
            for j in range(3):
                g = j / 3 * 2 * np.pi; d = e1 * np.cos(g) + e2 * np.sin(g)
                NP.append(a + (b - a) * t + d * rad); NN.append(d); NU.append(uva + (uvb - uva) * t)
        for k in range(8):
            for j in range(3):
                i0, i1, i2, i3 = n0 + k * 3 + j, n0 + k * 3 + (j + 1) % 3, n0 + (k + 1) * 3 + j, n0 + (k + 1) * 3 + (j + 1) % 3
                NT += [[i0, i1, i2], [i1, i3, i2]]
        P = np.vstack([P, NP]).astype(np.float32); N = np.vstack([N, NN]).astype(np.float32); UV = np.vstack([UV, NU]).astype(np.float32); T = np.vstack([T, NT])
        print('тетива: 8 звеньев вместо одного'); break
    comp = components(P, T); allowed = [None] * len(P); log = collections.Counter()
    for r in np.unique(comp):
        m = comp == r; clo, chi = P[m].min(0), P[m].max(0)
        for nm, test, bl in R['parts']:
            if test(clo, chi):
                for i in np.where(m)[0]: allowed[i] = bl
                log[nm] += int(m.sum()); break
    print('куски:', dict(log))
    # области (для моделей одним куском): правило по точке (метры) и цвету текстуры под вершиной
    if R.get('regions'):
        W, H = img.size; px = np.asarray(img).astype(np.float32) / 255
        col = px[np.clip((UV[:, 1] * H).astype(int), 0, H - 1), np.clip((UV[:, 0] * W).astype(int), 0, W - 1)]
        rlog = collections.Counter()
        for i in range(len(P)):
            if allowed[i] is not None: continue
            for nm, test, bl in R['regions']:
                if test(P[i], col[i]): allowed[i] = bl; rlog[nm] += 1; break
        print('области:', dict(rlog))
    segs = R['segs']; names = list(segs.keys())
    D = np.stack([seg_dist(P, *segs[n][:2]) - segs[n][2] for n in names], 1)   # «насколько глубоко внутри» кости
    SI = np.zeros((len(P), 4), np.uint8); SW = np.zeros((len(P), 4), np.float32)
    for i in range(len(P)):
        if allowed[i] == 'STRING':   # тетива: середина — на кости nock (треугольником), концы — на кисти с луком
            continue
        cand = names if allowed[i] is None else allowed[i]
        d = np.array([D[i, names.index(n)] for n in cand]); o = np.argsort(d)
        if len(o) == 1: SI[i, 0] = BI[cand[o[0]]]; SW[i, 0] = 1; continue
        d1, d2 = d[o[0]], d[o[1]]; w2 = 0.5 * np.exp(-(d2 - d1) / R['blend'])   # равные — 50/50, дальше — быстро к 0
        SI[i, 0], SI[i, 1] = BI[cand[o[0]]], BI[cand[o[1]]]; SW[i, 0], SW[i, 1] = 1 - w2, w2
    st = np.array([a == 'STRING' for a in allowed])
    if st.any():
        y = P[st, 1]; mid, half = (y.min() + y.max()) / 2, (y.max() - y.min()) / 2
        wn = np.clip(1 - np.abs(y - mid) / half, 0, 1) ** 0.8
        SI[st, 0], SI[st, 1] = BI['nock'], BI['handL']; SW[st, 0], SW[st, 1] = wn, 1 - wn
    cnt = collections.Counter(bones[k] for k in SI[:, 0]); print('вершин по костям:', dict(cnt))
    Nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    out = {'pos': P.astype('<f4').tobytes(), 'nrm': np.concatenate([np.round(Nn * 127).astype(np.int8), np.zeros((len(P), 1), np.int8)], 1).tobytes(),
           'uv': np.round(np.clip(UV, 0, 1) * 65535).astype('<u2').tobytes(), 'si': SI.tobytes(), 'sw': np.round(SW * 255).astype(np.uint8).tobytes(),
           'idx': T.astype('<u2').ravel().tobytes()}
    meta = {'vertices': len(P), 'triangles': len(T), 'bones': [[b, p, at] for b, p, at in R['bones']], 'height': R['height'], 'layout': {}}
    buf = b''
    for k in ['pos', 'nrm', 'uv', 'si', 'sw', 'idx']:
        while len(buf) % 4: buf += b'\0'
        meta['layout'][k] = [len(buf), len(out[k])]; buf += out[k]
    open(f'assets/models/{name}.bin', 'wb').write(buf); json.dump(meta, open(f'assets/models/{name}.json', 'w'), ensure_ascii=False)
    img.resize((1024, 1024), Image.LANCZOS).save(f'assets/models/{name}.webp', quality=88, method=6)
    print('готово:', len(P), 'вершин', len(T), 'треугольников', len(buf) // 1024, 'КБ')

if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
