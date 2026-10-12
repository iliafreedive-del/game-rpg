#!/usr/bin/env python3
"""Жители деревни из Meshy (Т-поза) → поза «руки вниз» → скелет героя (glb_rig.py) → assets/models/<имя>.bin/.json/.webp.
  python3 tools/art/npc_meshy.py <имя> <файл.glb>          имя: npc_elder | npc_fortune | npc_merchant | npc_smith | npc_caravan
То же, что pose_npc.py + glb_rig.py для Элвина, но суставы задаются долями (рост и размах рук модели), а не подбираются руками,
и у модели может не быть оружия. У кузнеца молот — отдельные куски справа от тела: молот поворачивается бойком вперёд и
вкладывается в правый кулак (хват у конца рукояти — так держат молот кузнецы, удар идёт с плеча, молот отскакивает).
Суставы (в долях): по высоте — от стоп (0) до макушки (1); по рукам — от оси тела (0) до кончиков пальцев (1).
"""
import sys, os, json, struct, io
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pose_npc import band, rot, turn, save
import glb_rig

HEIGHT = 2.0
NPC = {
  # староста Эдрик: мантия, широкие рукава, кисти — отдельные куски
  'npc_elder': dict(outHeight=1.8, arm=dict(shoulder=0.30, elbow=0.52, wrist=0.68, knuckle=0.84), armY=0.2, armZ=0.0,
                    y=dict(ankle=0.07, knee=0.22, hip=0.40, waist=0.50, neck=0.76), legX=0.075, curl=60, elbow=25, girth=1.25),
  # гадалка (Хозяйка Колеса): тюрбан, вуаль, шаровары
  'npc_fortune': dict(outHeight=1.66, arm=dict(shoulder=0.30, elbow=0.48, wrist=0.66, knuckle=0.82), armY=0.17, armZ=0.0,
                      y=dict(ankle=0.07, knee=0.22, hip=0.42, waist=0.52, neck=0.76), legX=0.07, curl=50, elbow=25, girth=1.05),
  # торговка Мира: красное платье, платок
  'npc_merchant': dict(outHeight=1.64, arm=dict(shoulder=0.27, elbow=0.47, wrist=0.66, knuckle=0.82), armY=0.21, armZ=0.0,
                       y=dict(ankle=0.07, knee=0.22, hip=0.42, waist=0.52, neck=0.76), legX=0.07, curl=50, elbow=25, girth=1.05),
  # кузнец Горан: коренастый, рукава закатаны; молот (рукоять + боёк) — справа от тела (+X в файле)
  'npc_smith': dict(outHeight=1.8, arm=dict(shoulder=0.30, elbow=0.56, wrist=0.74, knuckle=0.87), armY=0.17, armZ=0.0,
                    y=dict(ankle=0.08, knee=0.24, hip=0.42, waist=0.52, neck=0.74), legX=0.075, curl=150, elbow=55, girth=1.4,
                    weapon=dict(minX=0.25, grip=0.13, spin=90, dir=[-0.3, 0.75, 0.6])),
  # караванщик Кофи: синий тюрбан, борода, песочный халат с бирюзовым кушаком, шаровары, туфли с загнутыми носами
  'npc_caravan': dict(outHeight=1.8, arm=dict(shoulder=0.29, elbow=0.50, wrist=0.70, knuckle=0.84), armY=0.2, armZ=0.0,
                      y=dict(ankle=0.07, knee=0.22, hip=0.40, waist=0.52, neck=0.78), legX=0.09, curl=55, elbow=25, girth=1.3),
}


def load(p):   # как pose_npc.load, но текстура — именно baseColor (у Meshy их три: цвет, металл/шероховатость, нормали)
    d = open(p, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); B = d[28 + L:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: np.float32, 5121: np.uint8, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
        x = np.frombuffer(B, dt, a['count'] * n, bv.get('byteOffset', 0) + a.get('byteOffset', 0)); return (x.reshape(-1, n) if n > 1 else x).copy()
    pr = j['meshes'][0]['primitives'][0]; ti = j['materials'][pr.get('material', 0)]['pbrMetallicRoughness']['baseColorTexture']['index']
    im = j['images'][j['textures'][ti]['source']]; bv = j['bufferViews'][im['bufferView']]
    return (acc(pr['attributes']['POSITION']).astype(np.float64), acc(pr['attributes']['NORMAL']).astype(np.float64), acc(pr['attributes']['TEXCOORD_0']),
            acc(pr['indices']).astype(np.uint32), B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']], im['mimeType'])


def pose(src, dst, C):
    P, N, UV, I, img, mime = load(src)
    comp = glb_rig.components(P.astype(np.float32), I.reshape(-1, 3).astype(np.int64))
    W = C.get('weapon'); wp = np.zeros(len(P), bool)
    if W:
        for r in np.unique(comp):
            m = comp == r
            if P[m, 0].min() > W['minX']: wp |= m
    body = ~wp
    lo, hi = P[body].min(0), P[body].max(0); cx = (lo[0] + hi[0]) / 2; H = hi[1] - lo[1]; span = (hi[0] - lo[0]) / 2
    Y = lambda f: lo[1] + f * H; A = {k: v * span for k, v in C['arm'].items()}
    armY, armZ = C['armY'], C['armZ']
    gate = band(P[:, 1], armY - 0.09 * H, armY - 0.05 * H)   # ниже подмышки — тело и одежда, их не трогаем
    joints = {}
    for side, s in (('R', -1), ('L', 1)):
        dx = (P[:, 0] - cx) * s; out_ = (dx > A['shoulder'] + 0.15 * span) & (P[:, 1] > armY - 0.18 * H) & (P[:, 1] < armY + 0.1 * H)   # дальше от тела — свисающие рукава и кисти тоже рука
        arm = body & (dx > A['shoulder'] * 0.6) & (((P[:, 1] > armY - 0.12 * H) & (P[:, 1] < armY + 0.1 * H)) | out_)
        g = np.maximum(gate, band(dx, A['shoulder'] + 0.1 * span, A['shoulder'] + 0.25 * span) * out_)
        S = np.array([cx + s * A['shoulder'], armY, armZ]); E = np.array([cx + s * A['elbow'], armY, armZ])
        Wr = np.array([cx + s * A['wrist'], armY, armZ]); K = np.array([cx + s * A['knuckle'], armY - 0.01 * H, armZ])
        F = np.array([cx + s * (A['knuckle'] + 0.02 * span), armY - 0.03 * H, armZ + 0.015])
        tip = span
        fing = arm & (dx > A['knuckle'] - 0.005)
        a = np.radians(C['curl']) * np.clip((dx[fing] - A['knuckle']) / (tip - A['knuckle']), 0, 1) * (-s)
        pf, nf = P[fing], N[fing]; turn(pf, nf, K, (0, 0, 1), a); P[fing], N[fing] = pf, nf
        # локоть: предплечье вперёд (+Z); правое — как у героя в покое (с молотом — сильнее)
        eb = C['elbow'] if side == 'R' else 18
        w = band(dx, A['elbow'] - 0.04 * span, A['elbow'] + 0.04 * span) * g * arm; m = w > 0
        pa, na = P[m], N[m]; turn(pa, na, E, (0, 1, 0), np.radians(eb) * w[m] * (-s)); P[m], N[m] = pa, na
        Rb = rot((0, 1, 0), np.radians(eb) * (-s))[0]; pts = [Rb @ (p - E) + E for p in (Wr, F)]
        # плечо: рука вниз
        w = band(dx, A['shoulder'] - 0.06 * span, A['shoulder'] + 0.1 * span) * g * arm; m = w > 0
        ang = np.radians(80) * (-s)
        pa, na = P[m], N[m]; turn(pa, na, S, (0, 0, 1), ang * w[m]); P[m], N[m] = pa, na
        R = rot((0, 0, 1), ang)[0]; Wp, Fp = [R @ (p - S) + S for p in pts]; Ep = R @ (E - S) + S
        joints[side] = (S, Ep, Wp, Fp)
    tipP = None
    if W:   # молот: повернуть бойком вперёд (вокруг рукояти), рукоять — по W['dir'], хват (доля длины от низа) — в середину кулака
        q = P[wp]; ylo, yhi = q[:, 1].min(), q[:, 1].max(); hx = np.median(q[q[:, 1] < ylo + 0.3 * (yhi - ylo), 0]); hz = np.median(q[q[:, 1] < ylo + 0.3 * (yhi - ylo), 2])
        G = np.array([hx, ylo + W['grip'] * (yhi - ylo), hz])
        Rs = rot((0, 1, 0), np.radians(W['spin']))[0]
        d = np.array(W['dir'], float); d /= np.linalg.norm(d); y = np.array([0, 1.0, 0]); ax = np.cross(y, d); ang = np.arccos(np.clip(y @ d, -1, 1))
        R = rot(ax / np.linalg.norm(ax), ang)[0] @ Rs
        P[wp] = (P[wp] - G) @ R.T + joints['R'][3]; N[wp] = N[wp] @ R.T
        tipP = R @ (np.array([hx, yhi, hz]) - G) + joints['R'][3]
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    save(dst, P, N, UV, I, img, mime)
    sc = HEIGHT / H; o = np.array([cx, lo[1], 0.0]); m = lambda v: [round(float(x), 3) for x in (np.asarray(v, float) - o) * sc]
    out = {'unit': round(sc, 5), 'origin': [round(float(x), 4) for x in o], 'span': round(span * sc, 3)}
    for k in ('hip', 'waist', 'neck', 'knee', 'ankle'): out[k] = round((Y(C['y'][k]) - lo[1]) * sc, 3)
    for sd in 'RL':
        S_, E_, W_, F_ = joints[sd]; out['arm' + sd], out['el' + sd], out['hand' + sd], out['fist' + sd] = m(S_), m(E_), m(W_), m(F_)
    if W: out['weapon'] = [m(P[wp].min(0)), m(P[wp].max(0))]; out['head'] = m(tipP)
    return out


def rig(J, C):
    lx = C['legX'] * J['unit']; g = C['girth']; hip, wst, nk, kn, an = J['hip'], J['waist'], J['neck'], J['knee'], J['ankle']
    bones = [('spin', None, [0, 0.9, 0]), ('body', 'spin', [0, 0, 0]), ('hips', 'body', [0, hip, 0]), ('torso', 'hips', [0, wst, 0]), ('head', 'torso', [0, nk, 0])]
    for s in 'LR':
        bones += [('arm' + s, 'torso', J['arm' + s]), ('el' + s, 'arm' + s, J['el' + s]), ('hand' + s, 'el' + s, J['hand' + s])]
    for s, sx in (('L', 1), ('R', -1)):
        bones += [('leg' + s, 'body', [sx * lx, hip, 0]), ('knee' + s, 'leg' + s, [sx * lx, kn, 0]), ('foot' + s, 'knee' + s, [sx * lx, an, 0])]
    segs = {'hips': ([0, hip - 0.25, 0], [0, wst, 0], 0.27 * g), 'torso': ([0, wst, 0], [0, nk - 0.04, 0], 0.3 * g), 'head': ([0, nk + 0.04, 0.03], [0, 2.0, 0.03], 0.3)}
    for s in 'LR':
        f = np.array(J['fist' + s]); h = np.array(J['hand' + s])
        segs['arm' + s] = (J['arm' + s], J['el' + s], 0.12 * g); segs['el' + s] = (J['el' + s], J['hand' + s], 0.11 * g)
        segs['hand' + s] = (J['hand' + s], (f + (f - h) * 0.6).tolist(), 0.09 * g)
    for s, sx in (('L', 1), ('R', -1)):
        segs['leg' + s] = ([sx * lx, hip, 0], [sx * lx, kn, 0], 0.14 * g); segs['knee' + s] = ([sx * lx, kn, 0], [sx * lx, an, 0], 0.13 * g)
        segs['foot' + s] = ([sx * lx, an, 0.0], [sx * lx, 0.04, 0.2], 0.12 * g)
    parts = []
    if 'weapon' in J:
        wl, wh = np.array(J['weapon'][0]) - 0.02, np.array(J['weapon'][1]) + 0.02
        parts.append(('молот', lambda lo, hi, wl=wl, wh=wh: bool((lo >= wl).all() and (hi <= wh).all()), ['handR']))
    return {'height': HEIGHT, 'outHeight': C['outHeight'], 'unit': J['unit'], 'origin': J['origin'], 'bones': bones, 'segs': segs, 'parts': parts, 'blend': 0.05}


if __name__ == '__main__':
    name, src = sys.argv[1], sys.argv[2]; C = NPC[name]
    tmp = f'/tmp/{name}_posed.glb' if len(sys.argv) < 4 else sys.argv[3]
    J = pose(src, tmp, C); print(json.dumps(J, ensure_ascii=False))
    glb_rig.RIGS[name] = rig(J, C); glb_rig.main(tmp, name)
