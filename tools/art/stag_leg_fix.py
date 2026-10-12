#!/usr/bin/env python3
"""Правки 3: у каменного оленя (assets/models/t_stag.glb) в анимации ходьбы левая задняя нога ходит шире правой
(размах поворотов 49/54/142° против 36/31/107°) — волочится и вытягивается назад. Движение левой задней ноги
заменено зеркальной копией правой со сдвигом на полцикла. Файл правится на месте (размер буфера не меняется).
python3 tools/art/stag_leg_fix.py [assets/models/t_stag.glb]"""
(Правки 4: настоящая причина — веса: голень левой задней ноги была привязана к хвосту волка; исправлено переносом рига
с --skip tail1,tail2,tail3, см. rig_transfer.mjs; к новому t_stag.glb этот скрипт не применялся.)
import sys, json, struct, numpy as np
f = sys.argv[1] if len(sys.argv) > 1 else 'assets/models/t_stag.glb'
raw = bytearray(open(f, 'rb').read()); jl = struct.unpack('<I', raw[12:16])[0]; j = json.loads(raw[20:20 + jl]); B0 = 20 + jl + 8
def view(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; off = B0 + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    n = {'VEC4': 4, 'VEC3': 3, 'SCALAR': 1}[a['type']]; return off, a['count'], n
def read(i): off, c, n = view(i); return np.frombuffer(bytes(raw[off:off + c * n * 4]), np.float32).reshape(c, n).astype(np.float64)
def write(i, v): off, c, n = view(i); raw[off:off + c * n * 4] = v.astype(np.float32).tobytes()
nm = [n.get('name') for n in j['nodes']]; an = j['animations'][0]
rot = {nm[c['target']['node']]: an['samplers'][c['sampler']]['output'] for c in an['channels'] if c['target']['path'] == 'rotation'}
def rng(v): q0 = mean(v); return max(2 * np.degrees(np.arccos(min(1, abs(q @ q0)))) for q in v)
def mean(v): s = np.sign(v @ v[0])[:, None]; m = (v * s).sum(0); return m / np.linalg.norm(m)
def slerp(a, b, t):
    d = a @ b
    if d < 0: b, d = -b, -d
    if d > 0.9995: r = a + (b - a) * t; return r / np.linalg.norm(r)
    th = np.arccos(d); return (np.sin((1 - t) * th) * a + np.sin(t * th) * b) / np.sin(th)
# левая нога повторяет правую со сдвигом на полцикла, зеркально (отклонение от покоя правой кости, отражённое в плоскости YZ)
rest = {n.get('name'): np.array(n.get('rotation', [0, 0, 0, 1]), float) for n in j['nodes']}
def qmul(a, b):
    x1, y1, z1, w1 = a; x2, y2, z2, w2 = b
    return np.array([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2])
inv = lambda q: np.array([-q[0], -q[1], -q[2], q[3]])
for b in ['backleg', 'backleg0', 'backleg1', 'backleg2']:
    L, R = read(rot[b]), read(rot['R_' + b]); n = len(R); assert len(L) == n
    out = []
    for i in range(n):
        d = qmul(inv(rest['R_' + b]), R[(i + (n - 1) // 2) % (n - 1)])   # кадры цикла: последний = первый
        d = np.array([d[0], -d[1], -d[2], d[3]])
        q = qmul(rest[b], d); out.append(q / np.linalg.norm(q))
    write(rot[b], np.array(out)); print(b, 'размах', round(rng(L)), '→', round(rng(np.array(out))))
open(f, 'wb').write(raw)
