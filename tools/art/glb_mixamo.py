#!/usr/bin/env python3
"""Импорт уже ригнутой модели героя (скелет Mixamo: Meshy «Применить риг», Blender) в формат шкур игры (glbskin.js).
python3 tools/art/glb_mixamo.py <файл.glb> <имя> [ещё.glb …] — пишет assets/models/<имя>.bin, <имя>.json, <имя>.webp.
Дополнительные файлы — та же модель с другими анимациями (Meshy отдаёт по файлу на анимацию): из них берутся только клипы.
В отличие от glb_rig.py веса не угадываются по расстоянию: берутся веса самой модели, кости Mixamo сводятся к костям
процедурного рига (_hero.js). Модель из Т-позы переводится в позу «руки вниз» (покой рига). Посох (отдельная сетка без
весов) ставится в правую кисть — как у процедурного мага. Анимации файла (Walking, Running) запекаются кадрами поворотов
костей рига: в игре ими идёт ходьба и бег (glbskin.js), удары и касты — по-прежнему от процедурного рига.
"""
import sys, json, struct, io, collections
import numpy as np
from PIL import Image

FRAMES = 24          # кадров на цикл анимации
# по моделям: h — рост в игре, arm — руки из Т-позы вниз (градусов), el — локти вперёд (левый, правый);
# staff — посох отдельной сеткой без скина (в правую кисть); props — меч и щит кусками меша, которые риг Meshy поставил на пол
CFG = {
  'mage_staff': {'h': 2.2, 'arm': 74, 'el': (-18, -42), 'staff': True},   # маг: рост со шляпой — как у прежней модели; правая держит посох перед собой
  'warrior_knight': {'h': 2.0, 'arm': 72, 'el': (-30, -28), 'props': True},   # воин «Violet Vanguard»: рост с рогами — как у прежней модели
}

# кость Mixamo → кость рига
MAP = {
  'Hips': 'hips', 'Spine': 'hips', 'Spine1': 'torso', 'Spine2': 'torso', 'LeftShoulder': 'torso', 'RightShoulder': 'torso',
  'Neck': 'head', 'Head': 'head', 'HeadTop_End': 'head', 'headfront': 'head',
  'LeftArm': 'armL', 'LeftForeArm': 'elL', 'LeftHand': 'handL', 'LeftHandMiddle4': 'handL',
  'RightArm': 'armR', 'RightForeArm': 'elR', 'RightHand': 'handR', 'RightHandMiddle4': 'handR',
  'LeftUpLeg': 'legL', 'LeftLeg': 'kneeL', 'LeftFoot': 'footL', 'LeftToeBase': 'footL', 'LeftToe_End': 'footL',
  'RightUpLeg': 'legR', 'RightLeg': 'kneeR', 'RightFoot': 'footR', 'RightToeBase': 'footR', 'RightToe_End': 'footR',
}
# кости рига: имя, родитель, сустав Mixamo (откуда берётся положение и поворот в анимации)
BONES = [('spin', None, None), ('body', 'spin', None), ('hips', 'body', 'Hips'), ('torso', 'hips', 'Spine2'), ('head', 'torso', 'Head'),
  ('armL', 'torso', 'LeftArm'), ('elL', 'armL', 'LeftForeArm'), ('handL', 'elL', 'LeftHand'),
  ('armR', 'torso', 'RightArm'), ('elR', 'armR', 'RightForeArm'), ('handR', 'elR', 'RightHand'),
  ('legL', 'body', 'LeftUpLeg'), ('kneeL', 'legL', 'LeftLeg'), ('footL', 'kneeL', 'LeftFoot'),
  ('legR', 'body', 'RightUpLeg'), ('kneeR', 'legR', 'RightLeg'), ('footR', 'kneeR', 'RightFoot')]

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def q2m(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
def m2q(m):
    t = np.trace(m)
    if t > 0: s = np.sqrt(t + 1) * 2; q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]: s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; q = [s / 4, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]: s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; q = [(m[0, 1] + m[1, 0]) / s, s / 4, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else: s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, s / 4, (m[1, 0] - m[0, 1]) / s]
    q = np.array(q); q /= np.linalg.norm(q); return q if q[3] >= 0 else -q
def axis_rot(ax, deg):
    a = np.radians(deg) / 2; ax = np.array(ax, float); ax /= np.linalg.norm(ax); return q2m([*(ax * np.sin(a)), np.cos(a)])
def slerp(a, b, t):
    d = a @ b
    if d < 0: b, d = -b, -d
    if d > 0.9995: r = a + (b - a) * t; return r / np.linalg.norm(r)
    th = np.arccos(d); return (np.sin((1 - t) * th) * a + np.sin(t * th) * b) / np.sin(th)

def load(src):
    raw = open(src, 'rb').read(); jl = struct.unpack('<I', raw[12:16])[0]; j = json.loads(raw[20:20 + jl])
    B = raw[20 + jl + 8:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; t = CT[a['componentType']]; n = NC[a['type']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0) or np.dtype(t).itemsize * n
        x = np.lib.stride_tricks.as_strided(np.frombuffer(B, t, offset=off), (a['count'], n), (st, np.dtype(t).itemsize)).astype(np.float64)
        if a.get('normalized'): x /= np.iinfo(t).max
        return x
    return j, B, acc

def components(P, I):
    """номер связного куска меша для каждой вершины (швы UV режут вершины — склеиваются по положению)"""
    _, inv = np.unique(np.round(P, 4), axis=0, return_inverse=True); inv = inv.ravel(); par = np.arange(inv.max() + 1)
    def f(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for a, b, c in inv[I]:
        for u, v in ((a, b), (b, c)):
            ru, rv = f(u), f(v)
            if ru != rv: par[ru] = rv
    return np.array([f(x) for x in inv])

def main(src, name, *more):
    C = CFG[name]; OUT_H, ARM_DOWN, EL_BEND = C['h'], C['arm'], C['el']
    j, B, acc = load(src)
    nodes = j['nodes']; nm = [n.get('name', '') .replace('mixamorig:', '') for n in nodes]
    par = [None] * len(nodes)
    for i, n in enumerate(nodes):
        for c in n.get('children', []): par[c] = i
    order = []
    def walk(i):
        order.append(i)
        for c in nodes[i].get('children', []): walk(c)
    for r in j['scenes'][0]['nodes']: walk(r)
    T0 = {i: np.array(n.get('translation', [0, 0, 0]), float) for i, n in enumerate(nodes)}
    R0 = {i: np.array(n.get('rotation', [0, 0, 0, 1]), float) for i, n in enumerate(nodes)}
    S0 = {i: np.array(n.get('scale', [1, 1, 1]), float) for i, n in enumerate(nodes)}
    def world(T, R, S, delta=None):
        W = {}
        for i in order:
            if 'matrix' in nodes[i]: L = np.array(nodes[i]['matrix'], float).reshape(4, 4).T   # сокет оружия (Blender) — матрицей
            else: L = np.eye(4); L[:3, :3] = q2m(R[i]) * S[i]; L[:3, 3] = T[i]
            w = (W[par[i]] if par[i] is not None else np.eye(4)) @ L
            if delta and nm[i] in delta:   # поворот в пространстве модели вокруг сустава — всё поддерево следует
                p = w[:3, 3].copy(); D = np.eye(4); D[:3, :3] = delta[nm[i]]; w = D @ w; w[:3, 3] = p
            W[i] = w
        return W
    # поза покоя: руки вниз (левая рука модели — +X), локти чуть вперёд
    pose = {'LeftArm': axis_rot([0, 0, 1], -ARM_DOWN), 'RightArm': axis_rot([0, 0, 1], ARM_DOWN),
            'LeftForeArm': axis_rot([1, 0, 0], EL_BEND[0]), 'RightForeArm': axis_rot([1, 0, 0], EL_BEND[1])}
    Wp = world(T0, R0, S0, pose); W0 = world(T0, R0, S0)
    skin = j['skins'][0]; joints = skin['joints']; IBM = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    mesh_node = next(i for i, n in enumerate(nodes) if 'skin' in n)
    pr = j['meshes'][nodes[mesh_node]['mesh']]['primitives'][0]; at = pr['attributes']
    P, N, UV = acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0'])
    JI, JW = acc(at['JOINTS_0']).astype(int), acc(at['WEIGHTS_0']); JW /= JW.sum(1, keepdims=True)
    I = acc(pr['indices']).astype(np.int64).reshape(-1, 3)
    M = np.stack([Wp[jn] @ IBM[k] for k, jn in enumerate(joints)])     # матрицы скининга для новой позы
    Mv = np.einsum('vk,vkab->vab', JW, M[JI])
    P1 = np.einsum('vab,vb->va', Mv[:, :3, :3], P) + Mv[:, :3, 3]
    N1 = np.einsum('vab,vb->va', Mv[:, :3, :3], N)
    # веса по костям рига (сумма весов костей Mixamo, сведённых к одной кости рига)
    bn = [b[0] for b in BONES]; BI = {b: i for i, b in enumerate(bn)}
    SW = np.zeros((len(P), len(bn)))
    for k in range(4):
        for v in range(len(P)): SW[v, BI[MAP[nm[joints[JI[v, k]]]]]] += JW[v, k]
    id_ = {n: i for i, n in enumerate(nm)}
    hand, tip = Wp[id_['RightHand']][:3, 3], Wp[id_['RightHandMiddle4']][:3, 3]
    palm = hand + (tip - hand) * 0.45
    body = np.ones(len(P), bool)
    if C.get('props'):
        # меч и щит — отдельные куски меша, риг Meshy поставил их на пол у ног (веса — от ног и кисти, в ходьбе они бы болтались).
        # Ставятся жёстко: меч — рукоятью в правую кисть, клинком вниз и чуть вперёд (как держал прежний воин); щит — на левое предплечье
        comp = components(P, I)
        def piece(test):
            ks = [k for k in np.unique(comp) if test(P[comp == k].min(0), P[comp == k].max(0))]
            assert len(ks) == 1, ks; return comp == ks[0]
        sw = piece(lambda lo, hi: hi[0] < -0.5 and hi[1] < 1.15)    # меч: стоит остриём вверх справа от ног
        sh = piece(lambda lo, hi: lo[0] > 0.3 and hi[1] < 0.7)      # щит: стоит слева от ног, лицом вперёд (+Z)
        body = ~(sw | sh)
        # меч: перекрестье — самый широкий срез в нижней трети, рукоять — между навершием и перекрестьем
        Q = P[sw]; lo, hi = Q.min(0), Q.max(0); ys = np.linspace(lo[1], lo[1] + (hi[1] - lo[1]) / 3, 24)
        wid = [np.ptp(Q[np.abs(Q[:, 1] - y) < 0.01, 0]) if (np.abs(Q[:, 1] - y) < 0.01).sum() > 2 else 0 for y in ys]
        gy = ys[int(np.argmax(wid))]; grip = np.array([Q[:, 0].mean(), (lo[1] + gy) / 2 + 0.01, Q[:, 2].mean()])
        R = axis_rot([1, 0, 0], 100)    # остриё вперёд, чуть ниже горизонта (было 160 — смотрело в землю; пользователь: поднять на 60°)
        P1[sw] = (P[sw] - grip) @ R.T + palm; N1[sw] = N[sw] @ R.T
        SW[sw] = 0; SW[sw, BI['handR']] = 1
        print('меч: длина %.2f, рукоять %.2f' % (hi[1] - lo[1], gy - lo[1]))
        # щит: тыльной стороной на середину левого предплечья, лицом наружу и вперёд
        Q = P[sh]; lo, hi = Q.min(0), Q.max(0); back = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])
        el, ha = Wp[id_['LeftForeArm']][:3, 3], Wp[id_['LeftHand']][:3, 3]
        R = axis_rot([0, 1, 0], 62)
        P1[sh] = (P[sh] - back) @ R.T + el + (ha - el) * 0.95 + R @ np.array([0, 0, 0.07]); N1[sh] = N[sh] @ R.T   # ближе к кисти: кулак за щитом
        SW[sh] = 0; SW[sh, BI['elL']] = 1
        # левая кисть держит щит — одно целое с предплечьем (иначе на ходу и в ударе высовывается из-под щита)
        SW[:, BI['elL']] += SW[:, BI['handL']]; SW[:, BI['handL']] = 0
    SP = np.zeros((0, 3)); SN = SP; SUV = np.zeros((0, 2)); SI_ = np.zeros((0, 3), np.int64)
    foot = min(P1[body, 1])
    if C.get('staff'):
        # посох: отдельная сетка без скина — в правую кисть, вертикально, нижний конец чуть над землёй
        staff_node = next(i for i, n in enumerate(nodes) if 'mesh' in n and 'skin' not in n)
        sp = j['meshes'][nodes[staff_node]['mesh']]['primitives'][0]; sa = sp['attributes']
        SP, SN, SUV = acc(sa['POSITION']), acc(sa['NORMAL']), acc(sa['TEXCOORD_0']); SI_ = acc(sp['indices']).astype(np.int64).reshape(-1, 3)
        Ws = W0[staff_node]; SP = SP @ Ws[:3, :3].T + Ws[:3, 3]; SN = SN @ Ws[:3, :3].T
        lo, hi = SP.min(0), SP.max(0); h = hi[1] - lo[1]
        shaft = SP[(SP[:, 1] > lo[1] + h * 0.3) & (SP[:, 1] < lo[1] + h * 0.6)]   # середина древка: без навершия и пятки
        c = shaft.mean(0)
        SP = SP + np.array([palm[0] - c[0], foot + 0.03 - lo[1], palm[2] - c[2]])
        print('посох: длина %.2f, кисть на %.0f%% высоты' % (h, 100 * (palm[1] - (foot + 0.03)) / h))
    # всё вместе; масштаб — по телу (без посоха и оружия), центр — таз
    hip = Wp[id_['Hips']][:3, 3]; s = OUT_H / (P1[body, 1].max() - foot); org = np.array([hip[0], foot, hip[2]])
    PA = (np.vstack([P1, SP]) - org) * s; NA = np.vstack([N1, SN]); UVA = np.vstack([UV, SUV])
    W = np.vstack([SW, np.zeros((len(SP), len(bn)))]); W[len(P1):, BI['handR']] = 1
    TA = np.vstack([I, SI_ + len(P1)])
    o = np.argsort(-W, 1)[:, :4]; w4 = np.take_along_axis(W, o, 1); w4 /= w4.sum(1, keepdims=True)
    SIo = o.astype(np.uint8); SWo = np.round(w4 * 255).astype(np.int32)
    SWo[:, 0] += 255 - SWo.sum(1)
    print('вершин по костям:', dict(collections.Counter(bn[k] for k in SIo[:, 0])))
    jp = lambda n: (Wp[id_[n]][:3, 3] - org) * s
    meta_b = []
    for b, p, jn in BONES:
        if b == 'spin': a = [0, jp('Hips')[1], 0]
        elif b == 'body': a = [0, 0, 0]
        elif b in ('hips', 'torso'): a = [0, jp('Hips')[1], 0]
        elif b == 'head': a = [0, jp('Neck')[1], jp('Neck')[2]]
        else: a = jp(jn).tolist()
        meta_b.append([b, p, [round(float(x), 4) for x in a]])
    # анимации: кадры поворотов костей рига в пространстве модели относительно позы покоя (+ сдвиг таза)
    clips = {}
    rp = {jn: m2q(Wp[id_[jn]][:3, :3] / np.linalg.norm(Wp[id_[jn]][:3, :3], axis=0)) for _, _, jn in BONES if jn}
    anims = [(an, acc, None) for an in j.get('animations', [])]
    for f_ in more:   # анимации из других файлов той же модели: узлы — по именам
        j2, _, acc2 = load(f_); rn = {i: id_[n.get('name', '').replace('mixamorig:', '')] for i, n in enumerate(j2['nodes']) if n.get('name', '').replace('mixamorig:', '') in id_}
        anims += [(an, acc2, rn) for an in j2.get('animations', [])]
    for an, acc_, rn in anims:
        ch = []
        for c_ in an['channels']:
            smp = an['samplers'][c_['sampler']]; nd_ = c_['target']['node']; nd_ = rn[nd_] if rn is not None else nd_
            ch.append((nd_, c_['target']['path'], acc_(smp['input'])[:, 0], acc_(smp['output'])))
        dur = max(x[2][-1] for x in ch); frames = []; hips = []; feet = []
        for f in range(FRAMES):
            t = dur * f / FRAMES; T, R, S = dict(T0), dict(R0), dict(S0)
            for nd, path, ti, vo in ch:
                k = int(np.clip(np.searchsorted(ti, t) - 1, 0, len(ti) - 1)); k2 = min(k + 1, len(ti) - 1)
                u = 0 if k2 == k else np.clip((t - ti[k]) / (ti[k2] - ti[k]), 0, 1)
                if path == 'rotation': R[nd] = slerp(vo[k] / np.linalg.norm(vo[k]), vo[k2] / np.linalg.norm(vo[k2]), u)
                elif path == 'translation': T[nd] = vo[k] * (1 - u) + vo[k2] * u
                elif path == 'scale': S[nd] = vo[k] * (1 - u) + vo[k2] * u
            Wa = world(T, R, S); fr = []
            for b, p, jn in BONES:
                if not jn: fr += [0, 0, 0, 1]; continue
                m = Wa[id_[jn]][:3, :3]; qa = m2q(m / np.linalg.norm(m, axis=0)); qr = rp[jn]
                # qa · qr⁻¹
                x1, y1, z1, w1 = qa; x2, y2, z2, w2 = -qr[0], -qr[1], -qr[2], qr[3]
                q = [w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2]
                fr += [round(float(v), 4) for v in q]
            feet.append(Wa[id_['LeftFoot']][2, 3] * s); frames.append(fr); hips.append((Wa[id_['Hips']][:3, 3] - Wp[id_['Hips']][:3, 3]) * s)
        hips = np.array(hips); hips[:, [0, 2]] -= hips[:, [0, 2]].mean(0)   # без ухода вперёд — только качание и подскок
        key = 'run' if 'run' in an['name'].lower() else 'walk'
        # длина шага: сколько проходит опорная стопа за цикл (два шага) — под неё подгоняется скорость проигрывания в игре
        clips[key] = {'dur': round(float(dur), 4), 'stride': round(float(2 * (max(feet) - min(feet))), 4), 'frames': frames, 'hips': np.round(hips, 4).tolist()}
        print('анимация', an['name'], '→', key, '%.2f с, шаг %.2f м' % (dur, clips[key]['stride']))
    Nn = NA / np.maximum(np.linalg.norm(NA, axis=1, keepdims=True), 1e-9)
    out = {'pos': PA.astype('<f4').tobytes(), 'nrm': np.concatenate([np.round(Nn * 127).astype(np.int8), np.zeros((len(PA), 1), np.int8)], 1).tobytes(),
           'uv': np.round(np.clip(UVA, 0, 1) * 65535).astype('<u2').tobytes(), 'si': SIo.tobytes(), 'sw': SWo.astype(np.uint8).tobytes(),
           'idx': TA.astype('<u2').ravel().tobytes()}
    assert len(PA) < 65536
    meta = {'vertices': len(PA), 'triangles': len(TA), 'bones': meta_b, 'height': OUT_H, 'clips': clips, 'layout': {}}
    buf = b''
    for k in ['pos', 'nrm', 'uv', 'si', 'sw', 'idx']:
        while len(buf) % 4: buf += b'\0'
        meta['layout'][k] = [len(buf), len(out[k])]; buf += out[k]
    open(f'assets/models/{name}.bin', 'wb').write(buf); json.dump(meta, open(f'assets/models/{name}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']; im = j['images'][j['textures'][tex]['source']]; bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    img.resize((1024, 1024), Image.LANCZOS).save(f'assets/models/{name}.webp', quality=88, method=6)
    print('готово:', len(PA), 'вершин', len(TA), 'треугольников', len(buf) // 1024, 'КБ')

if __name__ == '__main__': main(sys.argv[1], sys.argv[2], *sys.argv[3:])
