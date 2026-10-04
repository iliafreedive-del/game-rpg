#!/usr/bin/env python3
"""Поза для статичной модели из Meshy перед привязкой к скелету героя (glb_rig.py): Т-поза → руки вниз, кисти в кулак,
отдельно стоящий меч — в правый кулак.
  python3 tools/art/pose_npc.py art_meshy/in/npc_trainer_elvin.glb art_meshy/raw/npc_trainer_posed.glb
Почему так: glbskin.js в покое показывает модель ровно как она нарисована, а герой в покое держит руки внизу и меч поднятым
вперёд — значит и модель должна стоять так же, иначе Т-поза останется навсегда. Вершины поворачиваются вокруг суставов
с плавными весами (плечо, локоть, костяшки), как если бы у модели был скелет. Суставы замерены на модели (в её единицах).
Печатает суставы в метрах в системе glb_rig.py (рост height, стопы y=0, центр рамки по x/z) — их строка идёт в RIGS.
"""
import sys, json, struct, io
import numpy as np

# Наставник Элвин (Meshy, Т-поза, лицом +Z, правая рука — на −X; меч стоит справа от него остриём вверх)
J = dict(cx=-0.0965, armY=0.165, armZ=0.02, shoulder=0.146, elbow=0.232, wrist=0.33, knuckle=0.365, tip=0.41,
         hip=-0.09, knee=-0.205, ankle=-0.31, waist=0.0, neck=0.245, legX=0.08)
SWORD = dict(minX=0.34, grip=[0.43, -0.25, 0.037])     # всё правее minX — меч; grip — место хвата у гарды, клинок по +Y
POSE = dict(shoulder=80, elbowR=55, curl=150)            # градусы: руки вниз (от горизонтали), правое предплечье вперёд, пальцы
BLADE = [0.15, 0.9, 0.42]                                # куда смотрит клинок в покое — как меч процедурного героя (_hero.js)
HEIGHT = 2.0                                             # рост разметки glb_rig.py (RIGS[...]['height'])


def band(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def rot(axis, ang):   # ang — массив углов (рад) или число; возвращает (n,3,3)
    ang = np.atleast_1d(ang).astype(np.float64); c, s = np.cos(ang), np.sin(ang); x, y, z = axis
    R = np.zeros((len(ang), 3, 3))
    R[:, 0] = np.stack([c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s], 1)
    R[:, 1] = np.stack([y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s], 1)
    R[:, 2] = np.stack([z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)], 1)
    return R


def turn(P, N, piv, axis, ang):   # повернуть точки (и нормали) вокруг оси через piv на свой угол каждую
    R = rot(axis, ang); P[:] = np.einsum('nij,nj->ni', R, P - piv) + piv; N[:] = np.einsum('nij,nj->ni', R, N)


def load(p):
    d = open(p, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); B = d[28 + L:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: np.float32, 5121: np.uint8, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
        x = np.frombuffer(B, dt, a['count'] * n, bv.get('byteOffset', 0) + a.get('byteOffset', 0)); return (x.reshape(-1, n) if n > 1 else x).copy()
    pr = j['meshes'][0]['primitives'][0]; im = j['images'][0]; bv = j['bufferViews'][im['bufferView']]
    return (acc(pr['attributes']['POSITION']).astype(np.float64), acc(pr['attributes']['NORMAL']).astype(np.float64), acc(pr['attributes']['TEXCOORD_0']),
            acc(pr['indices']).astype(np.uint32), B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']], im['mimeType'])


def save(p, P, N, UV, I, img, mime):
    parts = [P.astype('<f4').tobytes(), N.astype('<f4').tobytes(), UV.astype('<f4').tobytes(), I.astype('<u4').tobytes(), img]
    views, off = [], 0
    for b in parts:
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}); off += len(b) + (-len(b)) % 4
    n = len(P)
    j = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
         'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
         'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': n, 'type': 'VEC3', 'min': P.min(0).tolist(), 'max': P.max(0).tolist()},
                       {'bufferView': 1, 'componentType': 5126, 'count': n, 'type': 'VEC3'}, {'bufferView': 2, 'componentType': 5126, 'count': n, 'type': 'VEC2'},
                       {'bufferView': 3, 'componentType': 5125, 'count': len(I), 'type': 'SCALAR'}],
         'bufferViews': views, 'buffers': [{'byteLength': off}], 'images': [{'bufferView': 4, 'mimeType': mime}],
         'textures': [{'source': 0}], 'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}}, 'doubleSided': True}]}
    bin_ = b''.join(b + b'\0' * ((-len(b)) % 4) for b in parts); js = json.dumps(j).encode(); js += b' ' * ((-len(js)) % 4)
    open(p, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(bin_)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(bin_)) + b'BIN\0' + bin_)


def main(src, dst):
    P, N, UV, I, img, mime = load(src); cx = J['cx']
    sw = P[:, 0] > SWORD['minX']; body = ~sw
    gate = band(P[:, 1], 0.075, 0.12)   # ниже подмышки — тело и плащ, их не трогаем
    joints = {}
    for side, s in (('R', -1), ('L', 1)):
        dx = (P[:, 0] - cx) * s; arm = body & (dx > 0.1) & (P[:, 1] > 0.05)
        S = np.array([cx + s * J['shoulder'], J['armY'], J['armZ']]); E = np.array([cx + s * J['elbow'], J['armY'], J['armZ']])
        W = np.array([cx + s * J['wrist'], J['armY'], J['armZ']]); K = np.array([cx + s * J['knuckle'], 0.15, J['armZ']])
        F = np.array([cx + s * (J['knuckle'] + 0.012), 0.138, 0.035])   # середина кулака (сквозь неё пройдёт рукоять)
        # 1) кулак: пальцы за костяшками загибаются вниз, к ладони (угол растёт к кончикам); большой палец прижимается
        fing = arm & (dx > J['knuckle'] - 0.005)
        a = np.radians(POSE['curl']) * np.clip((dx[fing] - J['knuckle']) / (J['tip'] - J['knuckle']), 0, 1) * (-s)
        pf, nf = P[fing], N[fing]; turn(pf, nf, K, (0, 0, 1), a); P[fing], N[fing] = pf, nf
        th = arm & (dx > J['wrist']) & (P[:, 2] > 0.06); P[th, 2] -= (P[th, 2] - 0.05) * 0.6
        # 2) правый локоть: предплечье вперёд (+Z)
        pts = [W, F]
        if side == 'R':
            w = band(dx, J['elbow'] - 0.017, J['elbow'] + 0.018) * gate * arm; m = w > 0
            pa, na = P[m], N[m]; turn(pa, na, E, (0, 1, 0), np.radians(POSE['elbowR']) * w[m]); P[m], N[m] = pa, na
            pts = [rot((0, 1, 0), np.radians(POSE['elbowR']))[0] @ (p - E) + E for p in pts]
        # 3) плечо: рука вниз
        w = band(dx, J['shoulder'] - 0.026, J['shoulder'] + 0.044) * gate * arm; m = w > 0
        ang = np.radians(POSE['shoulder']) * (-s)
        pa, na = P[m], N[m]; turn(pa, na, S, (0, 0, 1), ang * w[m]); P[m], N[m] = pa, na
        R = rot((0, 0, 1), ang)[0]; Wp, Fp = [R @ (p - S) + S for p in pts]; Ep = R @ (E - S) + S
        joints[side] = (S, Ep, Wp, Fp)
    # 4) меч — в правый кулак: место хвата → середина кулака, клинок (+Y) → как у героя
    d = np.array(BLADE, float); d /= np.linalg.norm(d); y = np.array([0, 1.0, 0]); ax = np.cross(y, d); ang = np.arccos(np.clip(y @ d, -1, 1))
    R = rot(ax / np.linalg.norm(ax), ang)[0]; G = np.array(SWORD['grip'])
    P[sw] = (P[sw] - G) @ R.T + joints['R'][3]; N[sw] = N[sw] @ R.T
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    save(dst, P, N, UV, I, img, mime)
    # суставы в системе glb_rig.py: по телу (без меча — он торчит над головой и вперёд): ось тела по x/z, стопы на 0, рост HEIGHT;
    # 'origin' и 'unit' идут в RIGS, чтобы glb_rig.py центрировал так же
    lo, hi = P[body].min(0), P[body].max(0); sc = HEIGHT / (hi[1] - lo[1]); o = np.array([cx, lo[1], 0.0])
    m = lambda v: [round(float(x), 3) for x in (np.asarray(v, float) - o) * sc]
    out = {'unit': round(sc, 5), 'origin': [round(float(x), 4) for x in o],
           'hips': m([cx, J['hip'], 0]), 'waist': m([cx, J['waist'], 0]), 'neck': m([cx, J['neck'], 0]),
           'armR': m(joints['R'][0]), 'elR': m(joints['R'][1]), 'handR': m(joints['R'][2]), 'fistR': m(joints['R'][3]),
           'armL': m(joints['L'][0]), 'elL': m(joints['L'][1]), 'handL': m(joints['L'][2]), 'fistL': m(joints['L'][3]),
           'legR': m([cx - J['legX'], J['hip'], 0]), 'kneeR': m([cx - J['legX'], J['knee'], 0]), 'footR': m([cx - J['legX'], J['ankle'], 0]),
           'legL': m([cx + J['legX'], J['hip'], 0]), 'kneeL': m([cx + J['legX'], J['knee'], 0]), 'footL': m([cx + J['legX'], J['ankle'], 0]),
           'sword': [m(P[sw].min(0)), m(P[sw].max(0))], 'bladeTip': m(P[sw][np.argmax((P[sw] - joints['R'][3]) @ d)]), 'grip': m(joints['R'][3])}
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
