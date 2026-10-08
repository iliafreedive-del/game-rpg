#!/usr/bin/env python3
"""Статичная модель моба из Meshy (Т-поза, оружие лежит рядом отдельными кусками) → шкура поверх процедурного рига моба (glbskin.js).
python3 tools/art/glb_mob.py <файл.glb> <имя> [--debug out.json] — пишет assets/models/<имя>.bin, <имя>.json, <имя>.webp.

Что делает:
1. Делит сетку на связные куски: тело — самый большой кусок и всё, что с ним по ширине перекрывается; оружие — куски справа от тела
   (Meshy кладёт его рядом с моделью). Куски оружия группируются в предметы по ширине (меч и щит — два предмета).
2. Находит суставы в Т-позе по силуэту спереди (плечи, локти, кисти, таз, колени, стопы, шея), веса вершин — по расстоянию до
   «отрезков костей» с плавным переходом (как glb_rig.py), левые кости не берут правую сторону и наоборот.
3. Опускает руки из Т-позы в позу покоя процедурного моба (направления плеча и предплечья — из его idle, CFG[..]['arms'])
   линейным скинингом — так в игре в покое шкура стоит как процедурная модель, а движения копируются один в один.
4. Оружие — отдельный жёсткий предмет без искажений: весь кусок на кость кисти с весом 1, хват — в кулаке шкуры, а поворот —
   как у процедурного оружия в сокете кисти в той же позе покоя (CFG[..]['sockets'], ось клинка/древка — +Y сокета).
   Поэтому в ударах и кастах оружие ведёт себя так же, как прежнее процедурное (хват в начале координат, клинок вдоль +Y).
Формат .bin — как у glb_rig.py: pos f32×3 | nrm i8×3(+pad) | uv u16×2 | skinIndex u8×4 | skinWeight u8×4 | index u16.
"""
import sys, json, struct, io, collections
import numpy as np
from PIL import Image, ImageDraw

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

# Повороты сокетов кистей процедурной модели в покое (idle, t=0) в пространстве корня: столбцы X, Y, Z
# (node: построить модель, anims.idle, matrixWorld сокета — см. журнал сборки 57). Направления плеча и предплечья — оттуда же.
SKEL_SOCK = {'handR': [[0.98, -0.19, 0.04], [0.14, 0.81, 0.57], [-0.14, -0.55, 0.82]],
             'handL': [[0.88, 0.41, 0.24], [-0.12, 0.69, -0.72], [-0.46, 0.6, 0.65]]}
SKEL_ARMS = {'L': ([0.068, -0.327, 0.066], [0.127, -0.121, 0.281]), 'R': ([-0.068, -0.327, 0.066], [-0.063, -0.265, 0.267])}
BOSS_SOCK = {'handR': [[0.97, -0.25, 0.03], [0.19, 0.82, 0.54], [-0.16, -0.52, 0.84]],
             'handL': [[0.97, 0.25, -0.02], [-0.2, 0.75, -0.63], [-0.14, 0.61, 0.78]]}
BOSS_ARMS = {'L': ([0.129, -0.503, 0.04], [0.111, -0.405, 0.403]), 'R': ([-0.129, -0.5, 0.065], [-0.12, -0.424, 0.38])}
GHOUL_ARMS = {'L': ([0.099, -0.48, -0.097], [0.087, -0.469, 0.149]), 'R': ([-0.099, -0.48, -0.097], [-0.087, -0.469, 0.149])}

# rig: какие кости у процедурной модели; h — рост тела без оружия (в единицах модели до root.scale); lift — подъём стоп (парит);
# spin — высота оси кувырка; items — предметы слева направо: (кость, вид, сокет)
CFG = {
  'skel_warrior_m': {'rig': 'skel', 'h': 1.95, 'spin': 0.5, 'items': [('handR', 'sword'), ('handL', 'shield')]},
  'skel_archer_m': {'rig': 'skel', 'h': 1.95, 'spin': 0.5, 'items': [('handL', 'bow')]},
  'skel_mage_m': {'rig': 'skel', 'h': 2.0, 'lift': 0.28, 'spin': 0.78, 'items': [('handR', 'staff')]},
  'elite_guard_m': {'rig': 'skel', 'h': 2.0, 'spin': 0.5, 'items': [('handR', 'sword')]},
  'elite_warlord_m': {'rig': 'skel', 'h': 2.0, 'spin': 0.5, 'items': [('handR', 'axe')]},
  'ghoul_m': {'rig': 'ghoul', 'h': 1.7, 'spin': 0.5, 'items': []},
  'boss_m': {'rig': 'boss', 'h': 2.3, 'spin': 0.9, 'items': [('handR', 'axe')], 'turn': True, 'aim': [0, -0.12, 1]},   # turn — предмет повёрнут на 180° вокруг древка (просьба пользователя, сборка 57)
}
# хват по длине (доля от нижнего конца) для древковых: у процедурных axe_great — 20 %, staff_bone — 29 %
GRIP = {'axe': 0.22, 'staff': 0.36}
# у процедурной кисти в покое ось оружия наклонена вперёд на ~35°; длинное оружие модели так закрывало грудь и лицо —
# доля, на которую ось выпрямляется к вертикали (поворот добавляется к сокету в покое, удары рига идут от него)
UPRIGHT = {'staff': 0.75, 'axe': 0.6, 'sword': 0.45}

def load(src):
    raw = open(src, 'rb').read(); jl = struct.unpack('<I', raw[12:16])[0]; j = json.loads(raw[20:20 + jl]); B = raw[20 + jl + 8:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; t = CT[a['componentType']]; n = NC[a['type']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0) or np.dtype(t).itemsize * n
        return np.lib.stride_tricks.as_strided(np.frombuffer(B, t, offset=off), (a['count'], n), (st, np.dtype(t).itemsize)).astype(np.float64)
    p = j['meshes'][0]['primitives'][0]; at = p['attributes']
    P, N, UV = acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0']); I = acc(p['indices']).astype(np.int64).reshape(-1, 3)
    tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']; im = j['images'][j['textures'][tex]['source']]; bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    return P, N, UV, I, img

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

def groups_by_x(iv):
    """слить интервалы [lo, hi] по X, которые перекрываются → номера групп"""
    order = sorted(range(len(iv)), key=lambda k: iv[k][0]); g = [0] * len(iv); cur, end = -1, -1e9
    for k in order:
        if iv[k][0] > end + 1e-3: cur += 1; end = iv[k][1]
        else: end = max(end, iv[k][1])
        g[k] = cur
    return g

def seg_dist(X, a, b):
    a, b = np.asarray(a, float), np.asarray(b, float); ab = b - a; t = np.clip(((X - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(X - (a + t[:, None] * ab), axis=1)

def rot_between(u, v):
    u = u / np.linalg.norm(u); v = v / np.linalg.norm(v); c = float(u @ v); ax = np.cross(u, v); s = np.linalg.norm(ax)
    if s < 1e-9: return np.eye(3)
    ax /= s; K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]]); a = np.arctan2(s, c)
    return np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * K @ K

def silhouette(P, T, res=600):
    """маска силуэта спереди (X, Y) — растр треугольников"""
    lo, hi = P[:, :2].min(0), P[:, :2].max(0); sc = (res - 1) / max(hi - lo)
    W, H = int((hi[0] - lo[0]) * sc) + 2, int((hi[1] - lo[1]) * sc) + 2
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im); Q = (P[:, :2] - lo) * sc
    for a, b, c in T: d.polygon([(Q[a, 0], H - 1 - Q[a, 1]), (Q[b, 0], H - 1 - Q[b, 1]), (Q[c, 0], H - 1 - Q[c, 1])], fill=255)
    M = np.asarray(im)[::-1] > 0   # строка 0 — низ
    return M, lo, sc

def joints(P, T, ov):
    """суставы в Т-позе по силуэту; P уже: стопы y=0, центр x=0, рост H. ov — ручные поправки"""
    H = P[:, 1].max(); M, lo, sc = silhouette(P, T); X = lambda c: c / sc + lo[0]; Y = lambda r: r / sc + lo[1]
    ext = np.array([(np.where(M[r])[0].max() - np.where(M[r])[0].min()) if M[r].any() else 0 for r in range(M.shape[0])])
    band = np.where(ext >= ext.max() * 0.93)[0]; yarm = Y(np.median(band))
    J = {}
    for s, sg in (('L', 1), ('R', -1)):
        side = P[P[:, 0] * sg > 0]; tip = (side[:, 0] * sg).max()
        sh, el, wr = ov.get('sh', 0.39) * tip, ov.get('el', 0.65) * tip, ov.get('wr', 0.885) * tip
        def zc(x, r=0.04 * H):   # глубина сустава — середина вершин рядом по X на высоте руки
            m = (np.abs(side[:, 0] * sg - x) < r) & (np.abs(side[:, 1] - yarm) < 0.08 * H); return float(np.median(side[m, 2])) if m.any() else 0.0
        J['arm' + s] = np.array([sg * sh, yarm, zc(sh)]); J['el' + s] = np.array([sg * el, yarm, zc(el)])
        J['hand' + s] = np.array([sg * wr, yarm, zc(wr)]); J['tip' + s] = np.array([sg * tip, yarm, zc(tip * 0.97)])
    # промежность: по центральному столбцу снизу — первый закрашенный пиксель (у мантии — нет щели, берётся доля роста)
    # ноги — по пропорциям (набедренные повязки и мантии закрывают промежность, по силуэту её не найти)
    hipY = ov.get('hip', 0.46) * H; ank = ov.get('ankle', 0.09) * H; crotch = hipY - 0.05 * H
    for s, sg in (('L', 1), ('R', -1)):
        m = (P[:, 0] * sg > 0.01 * H) & (P[:, 1] < crotch * 0.75) & (P[:, 1] > ank)
        lx = float((P[m, 0].min() + P[m, 0].max()) / 2) if m.sum() > 20 else sg * 0.1 * H; lz = float(np.median(P[m, 2])) if m.sum() > 20 else 0.0
        lx = sg * ov.get('legx', abs(lx) / H) * H
        J['leg' + s] = np.array([lx, hipY, lz]); J['knee' + s] = np.array([lx, ov.get('knee', 0.26) * H, lz + 0.01 * H])
        J['foot' + s] = np.array([lx, ank, lz]); J['toe' + s] = np.array([lx, 0.02 * H, lz + 0.12 * H])
    neck = yarm + ov.get('neck', 0.05) * H
    J['hips'] = np.array([0, hipY, 0.0]); J['neck'] = np.array([0, neck, 0.0]); J['top'] = np.array([0, H, 0.0])
    m = (np.abs(P[:, 0]) < 0.08 * H) & (np.abs(P[:, 1] - neck) < 0.05 * H)
    if m.any(): J['neck'][2] = J['top'][2] = float(np.median(P[m, 2]))
    return J, yarm

def main(src, name, debug=None):
    C = CFG[name]; rig = C['rig']; P, N, UV, T, img = load(src)
    comp = components(P, T); ks = np.unique(comp)
    iv = [(P[comp == k, 0].min(), P[comp == k, 0].max()) for k in ks]; g = groups_by_x(iv)
    big = ks[np.argmax([(comp == k).sum() for k in ks])]; gb = g[list(ks).index(big)]
    # предметы — только справа от тела (Meshy кладёт оружие туда); куски слева и внутри (кулак отдельно от рукава) — тело
    bx = max(iv[i][1] for i in range(len(ks)) if g[i] == gb)
    gx = {gg: min(iv[i][0] for i in range(len(ks)) if g[i] == gg) for gg in set(g)}
    others = sorted([gg for gg in gx if gg != gb and gx[gg] > bx], key=gx.get)
    body = np.isin(comp, [k for k, gg in zip(ks, g) if gg not in others])
    items = [np.isin(comp, [k for k, gg2 in zip(ks, g) if gg2 == gg]) for gg in others]
    print('тело: %d вершин; предметов рядом: %d (%s)' % (body.sum(), len(items), ', '.join(str(int(m.sum())) for m in items)))
    assert len(items) == len(C['items']), ('ждали предметов', len(C['items']))
    # масштаб и центр — по телу: стопы на y=0, рост C['h'], центр — середина стоп по X и Z
    lo, hi = P[body].min(0), P[body].max(0); s = C['h'] / (hi[1] - lo[1])
    feet = P[body & (P[:, 1] < lo[1] + 0.1 * (hi[1] - lo[1]))]
    org = np.array([(feet[:, 0].min() + feet[:, 0].max()) / 2, lo[1], np.median(feet[:, 2])])
    P = (P - org) * s; H = C['h']
    Tb = T[body[T].all(1)]
    J, yarm = joints(P[body], np.searchsorted(np.where(body)[0], Tb), C.get('ov', {}))
    print('суставы:', {k: np.round(v, 3).tolist() for k, v in J.items()})
    # ---- кости рига
    if rig == 'boss':
        BONES = [('spin', None, [0, C['spin'], 0]), ('hips', 'spin', J['hips']), ('torso', 'hips', J['hips']), ('head', 'torso', J['neck'])]
        par_arm, par_leg = 'torso', 'hips'
    else:
        BONES = [('spin', None, [0, C['spin'], 0]), ('body', 'spin', J['hips']), ('head', 'body', J['neck'])]
        par_arm, par_leg = 'body', 'spin'
    hands = rig != 'ghoul'
    for sd in 'LR':
        BONES += [('arm' + sd, par_arm, J['arm' + sd]), ('el' + sd, 'arm' + sd, J['el' + sd])] + ([('hand' + sd, 'el' + sd, J['hand' + sd])] if hands else [])
    for sd in 'LR':
        BONES += [('leg' + sd, par_leg, J['leg' + sd]), ('knee' + sd, 'leg' + sd, J['knee' + sd]), ('foot' + sd, 'knee' + sd, J['foot' + sd])]
    # оружие — своя кость wpnR/wpnL в кулаке (дочерняя к кисти): игра может довернуть предмет в руке, не трогая саму кисть
    BONES += [('wpn' + bone[-1], bone, [0, 0, 0]) for bone, kind in C['items'] if kind != 'shield']
    bn = [b[0] for b in BONES]; BI = {b: i for i, b in enumerate(bn)}
    # ---- отрезки для весов: кость → (начало, конец, толщина)
    th = C.get('thick', {})
    segs = {'head': (J['neck'], J['top'], 0.12 * H), 'armL': (J['armL'], J['elL'], 0.05 * H), 'elL': (J['elL'], J['handL'], 0.045 * H),
            'handL': (J['handL'], J['tipL'], 0.04 * H), 'armR': (J['armR'], J['elR'], 0.05 * H), 'elR': (J['elR'], J['handR'], 0.045 * H),
            'handR': (J['handR'], J['tipR'], 0.04 * H)}
    for sd in 'LR':
        segs['leg' + sd] = (J['leg' + sd], J['knee' + sd], 0.06 * H); segs['knee' + sd] = (J['knee' + sd], J['foot' + sd], 0.05 * H)
        segs['foot' + sd] = (J['foot' + sd] + [0, -0.03 * H, 0], J['toe' + sd], 0.05 * H)
    sh = (J['armL'] + J['armR']) / 2; sh[1] = yarm
    if rig == 'boss': segs['hips'] = (J['hips'] - [0, 0.06 * H, 0], J['hips'] + [0, 0.08 * H, 0], 0.16 * H); segs['torso'] = (J['hips'] + [0, 0.08 * H, 0], sh, 0.16 * H)
    else: segs['body'] = (J['hips'] - [0, 0.06 * H, 0], sh, 0.16 * H)
    if not hands:
        for sd in 'LR': segs['el' + sd] = (J['el' + sd], J['tip' + sd], 0.045 * H); del segs['hand' + sd]
    names = [n for n in segs if n in BI]
    PB = P[body]; D = np.stack([seg_dist(PB, *segs[n][:2]) - segs[n][2] * th.get(n, 1) for n in names], 1)
    sideL = np.array([n.endswith('L') for n in names]); sideR = np.array([n.endswith('R') for n in names])
    armish = np.array([n[:-1] in ('arm', 'el', 'hand') for n in names]); legish = np.array([n[:-1] in ('leg', 'knee', 'foot') for n in names])
    x, y = PB[:, 0], PB[:, 1]
    D[np.ix_(x > 0.015 * H, sideR)] += 9; D[np.ix_(x < -0.015 * H, sideL)] += 9   # левая сторона — не правые кости
    # в полосе рук дальше плеча — только кости руки; ниже промежности и далеко от рук — не руки; выше таза — не ноги
    far = np.abs(x) > np.abs(J['armL'][0]) * 1.08
    D[np.ix_(far & (np.abs(y - yarm) < 0.14 * H), ~armish)] += 9
    D[np.ix_(y < J['hips'][1] - 0.08 * H, armish)] += 9
    D[np.ix_(y > J['hips'][1] + 0.06 * H, legish)] += 9
    blend = C.get('blend', 0.03) * H
    o = np.argsort(D, 1); d1 = np.take_along_axis(D, o[:, :1], 1)[:, 0]; d2 = np.take_along_axis(D, o[:, 1:2], 1)[:, 0]
    w2 = 0.5 * np.exp(-(d2 - d1) / blend)
    W = np.zeros((len(P), len(bn)))
    bi = np.array([BI[n] for n in names]); idxb = np.where(body)[0]
    W[idxb, bi[o[:, 0]]] = 1 - w2; W[idxb, bi[o[:, 1]]] += w2
    # ---- поза покоя: руки вниз как у процедурного моба
    ARMS = {'skel': SKEL_ARMS, 'boss': BOSS_ARMS, 'ghoul': GHOUL_ARMS}[rig]
    Rb = {b: np.eye(3) for b in bn}; Jp = {b: np.array(a, float) for b, _, a in BONES}
    for sd in 'LR':
        up, fo = (np.array(v, float) for v in ARMS[sd])
        Ru = rot_between(J['el' + sd] - J['arm' + sd], up)
        Rf = rot_between(Ru @ (J['hand' + sd] - J['el' + sd]), fo) @ Ru
        Rb['arm' + sd] = Ru; Rb['el' + sd] = Rf
        if hands: Rb['hand' + sd] = Rf
        Jp['el' + sd] = J['arm' + sd] + Ru @ (J['el' + sd] - J['arm' + sd])
        if hands: Jp['hand' + sd] = Jp['el' + sd] + Rf @ (J['hand' + sd] - J['el' + sd])
        Jp['tip' + sd] = Jp['el' + sd] + Rf @ (J['tip' + sd] - J['el' + sd])
    J0 = {b: np.array(a, float) for b, _, a in BONES}
    P1 = P.copy(); N1 = N.copy()
    Pb = np.zeros((len(P), 3)); Nb = np.zeros((len(P), 3))
    for b in bn:
        w = W[:, BI[b]][:, None]
        if not w.any(): continue
        Pb += w * ((P - J0[b]) @ Rb[b].T + Jp[b]); Nb += w * (N @ Rb[b].T)
    P1[body] = Pb[body]; N1[body] = Nb[body]
    # ---- оружие: жёстко в кулак, поворот — как у процедурного оружия в сокете
    SOCK = {'skel': SKEL_SOCK, 'boss': BOSS_SOCK}.get(rig, {}); items_meta = []
    for (bone, kind), m in zip(C['items'], items):
        Q = P[m]; lo_, hi_ = Q.min(0), Q.max(0); c = (lo_ + hi_) / 2; L = hi_[1] - lo_[1]
        ey = np.array([0, 1.0, 0])   # в Т-позе Meshy оружие стоит вертикально, навершие/клинок вверху
        if kind == 'shield':
            # лицом к нам (+Z модели) → +X сокета (нормаль лица у процедурного щита); хват — середина тыльной стороны
            ex, ez = np.array([0, 0, 1.0]), np.array([-1.0, 0, 0]); grip = np.array([c[0], c[1], lo_[2]])
        elif kind == 'bow':
            # рукоять — середина по высоте; концы плеч и тетива — по одну сторону по X, рукоять (пузо) — по другую → +Z сокета
            mid = Q[np.abs(Q[:, 1] - c[1]) < 0.06 * L]; tips = Q[np.abs(Q[:, 1] - c[1]) > 0.4 * L]
            sgn = np.sign(mid[:, 0].mean() - tips[:, 0].mean()) or 1.0
            ez = np.array([sgn, 0, 0]); ex = np.cross(ey, ez); grip = np.array([mid[:, 0].mean(), c[1], mid[:, 2].mean()])
        else:
            # меч / топор / посох: ось — вверх; ширина лезвия — по X модели. Хват: меч — середина рукояти (ниже гарды),
            # древковые — доля длины снизу. Лезвие топора (тяжёлая сторона по X) → +Z сокета, как у axe_great
            ys = np.linspace(lo_[1], lo_[1] + L * 0.45, 40)
            if kind == 'sword':
                wid = [np.ptp(Q[np.abs(Q[:, 1] - yy) < 0.012 * L, 0]) if (np.abs(Q[:, 1] - yy) < 0.012 * L).sum() > 2 else 0 for yy in ys]
                gy = ys[int(np.argmax(wid))]; gyy = lo_[1] + (gy - lo_[1]) * 0.5
            else: gyy = lo_[1] + L * GRIP[kind]
            near = Q[np.abs(Q[:, 1] - gyy) < 0.02 * L]; gx, gz = (near[:, 0].mean(), near[:, 2].mean()) if len(near) else (c[0], c[2])
            grip = np.array([gx, gyy, gz])
            if kind in ('axe', 'sword'):
                # широкая сторона лезвия (по X в Т-позе) → +Z сокета: лезвие ребром вперёд, плашмя не закрывает тело
                head = Q[Q[:, 1] > lo_[1] + 0.6 * L]; sgn = np.sign(head[:, 0].mean() - gx) or 1.0
                ez = np.array([sgn, 0, 0]); ex = np.cross(ey, ez)
            else: ex, ez = np.array([1.0, 0, 0]), np.array([0, 0, 1.0])
        if C.get('turn') and kind != 'shield': ex, ez = -ex, -ez
        # локальная система предмета (строки) → система сокета в покое (столбцы X, Y, Z)
        Bm = np.stack([ex, ey, ez]); S = np.array(SOCK[bone], float).T; S /= np.linalg.norm(S, axis=0)
        u = UPRIGHT.get(kind, 0.0)
        if C.get('aim') and kind != 'shield':
            # aim — ось оружия в покое: вперёд от кулака, как меч у героя-воина (просьба пользователя, сборка 57)
            y0 = S[:, 1]; yt = np.array(C['aim'], float); yt /= np.linalg.norm(yt); ax = np.cross(y0, yt); sn = np.linalg.norm(ax)
            k = ax / sn; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]); ang = np.arctan2(sn, y0 @ yt)
            S = (np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K) @ S; u = 0
        if u:
            y0 = S[:, 1]; ax = np.cross(y0, [0, 1.0, 0]); sn = np.linalg.norm(ax); ang = u * np.arctan2(sn, y0[1])
            if sn > 1e-6:
                k = ax / sn; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
                S = (np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K) @ S
        Rw = S @ Bm
        sd = bone[-1]; fist = Jp['hand' + sd] + (Jp['tip' + sd] - Jp['hand' + sd]) * 0.5
        P1[m] = (P[m] - grip) @ Rw.T + fist; N1[m] = N[m] @ Rw.T
        wb = 'wpn' + sd if 'wpn' + sd in BI else bone
        W[m] = 0; W[m, BI[wb]] = 1
        if wb != bone: Jp[wb] = fist.copy(); items_meta.append({'bone': wb, 'kind': kind, 'len': round(float(L), 4), 'grip': round(float((grip[1] - lo_[1]) / L), 3),
                                                            'axes': [[round(float(v), 4) for v in S[:, i]] for i in range(3)]})   # оси X, Y (вдоль древка), Z предмета в покое
        print('%s → %s: длина %.2f, хват %.0f%% снизу' % (kind, bone, L, 100 * (grip[1] - lo_[1]) / L))
    # подъём (парящий колдун) и выход
    lift = C.get('lift', 0.0); P1[:, 1] += lift
    for b in Jp: Jp[b] = Jp[b] + [0, lift, 0]
    meta_b = [[b, p, [round(float(v), 4) for v in (Jp[b] if b != 'spin' else np.array(a, float))]] for b, p, a in BONES]
    o4 = np.argsort(-W, 1)[:, :4]; w4 = np.take_along_axis(W, o4, 1); w4 /= np.maximum(w4.sum(1, keepdims=True), 1e-9)
    SIo = o4.astype(np.uint8); SWo = np.round(w4 * 255).astype(np.int32); SWo[:, 0] += 255 - SWo.sum(1)
    print('вершин по костям:', dict(collections.Counter(bn[k] for k in SIo[:, 0])))
    Nn = N1 / np.maximum(np.linalg.norm(N1, axis=1, keepdims=True), 1e-9)
    out = {'pos': P1.astype('<f4').tobytes(), 'nrm': np.concatenate([np.round(Nn * 127).astype(np.int8), np.zeros((len(P1), 1), np.int8)], 1).tobytes(),
           'uv': np.round(np.clip(UV, 0, 1) * 65535).astype('<u2').tobytes(), 'si': SIo.tobytes(), 'sw': SWo.astype(np.uint8).tobytes(),
           'idx': T.astype('<u2').ravel().tobytes()}
    assert len(P1) < 65536
    meta = {'vertices': len(P1), 'triangles': len(T), 'bones': meta_b, 'height': H, 'items': items_meta, 'layout': {}}
    buf = b''
    for k in ['pos', 'nrm', 'uv', 'si', 'sw', 'idx']:
        while len(buf) % 4: buf += b'\0'
        meta['layout'][k] = [len(buf), len(out[k])]; buf += out[k]
    open(f'assets/models/{name}.bin', 'wb').write(buf); json.dump(meta, open(f'assets/models/{name}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    img.resize((1024, 1024), Image.LANCZOS).save(f'assets/models/{name}.webp', quality=86, method=6)
    if debug: json.dump({'joints': {k: v.tolist() for k, v in J.items()}, 'posed': {k: np.asarray(v).tolist() for k, v in Jp.items()}}, open(debug, 'w'))
    print('готово:', len(P1), 'вершин', len(T), 'треугольников', len(buf) // 1024, 'КБ')

if __name__ == '__main__':
    a = sys.argv[1:]; dbg = None
    if '--debug' in a: i = a.index('--debug'); dbg = a[i + 1]; del a[i:i + 2]
    main(a[0], a[1], dbg)
