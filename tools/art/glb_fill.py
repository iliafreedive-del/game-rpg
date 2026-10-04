#!/usr/bin/env python3
"""Заделать дырки в сетке Meshy: python3 tools/art/glb_fill.py <in.glb> <out.glb> [макс. длина контура = 400]
Ищет открытые края (ребро только у одного треугольника; вершины с одинаковым положением считаются одной — UV-швы не дырки),
собирает их в контуры и закрывает каждый веером из новой вершины в центре контура: нормаль — средняя по контуру,
UV — у вершины контура, ближайшей к центру (заплатка того же цвета, что края). Обход заплатки — против обхода соседних
треугольников, чтобы лицевая сторона смотрела наружу. Нужна для мобов с «пустыми дырками» (медведь, кабаны);
дальше — rig_transfer.mjs / glb_pack.py как обычно."""
import sys, json, struct
from collections import defaultdict

def fix_winding(I, P, Nn):
    """треугольник, чей обход смотрит против нормалей его вершин (Meshy их считает наружу), разворачиваем"""
    flips = 0
    for t in range(0, len(I), 3):
        a, b, c = (P[I[t + k] * 3:I[t + k] * 3 + 3] for k in range(3))
        u = [b[i] - a[i] for i in range(3)]; v = [c[i] - a[i] for i in range(3)]
        n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        vn = [sum(Nn[I[t + k] * 3 + i] for k in range(3)) for i in range(3)]
        if sum(n[i] * vn[i] for i in range(3)) < 0: I[t + 1], I[t + 2] = I[t + 2], I[t + 1]; flips += 1
    return flips

def main(src, dst, maxlen=400):
    d = open(src, 'rb').read(); L = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + L]); b0 = 20 + L
    BL = struct.unpack('<I', d[b0:b0 + 4])[0]; B = bytearray(d[b0 + 8:b0 + 8 + BL])
    N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}; CT = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}
    def read(ai):
        a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        assert not bv.get('byteStride') or bv['byteStride'] == N[a['type']] * struct.calcsize(CT[a['componentType']]), 'чередованные буферы не поддерживаются'
        return list(struct.unpack_from(f'<{a["count"] * N[a["type"]]}{CT[a["componentType"]]}', B, off))
    def write(ai, vals, ctype=None):
        a = j['accessors'][ai]; ct = ctype or a['componentType']; raw = struct.pack(f'<{len(vals)}{CT[ct]}', *vals)
        while len(B) % 4: B.append(0)
        j['bufferViews'].append({'buffer': 0, 'byteOffset': len(B), 'byteLength': len(raw)}); B.extend(raw)
        a['bufferView'] = len(j['bufferViews']) - 1; a['byteOffset'] = 0; a['componentType'] = ct; a['count'] = len(vals) // N[a['type']]
        if a['type'] == 'VEC3' and ct == 5126 and 'min' in a:
            a['min'] = [min(vals[k::3]) for k in range(3)]; a['max'] = [max(vals[k::3]) for k in range(3)]
    total = 0
    for m in j['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']; P = read(at['POSITION']); Nn = read(at['NORMAL']) if 'NORMAL' in at else None
            UV = read(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None; I = read(pr['indices'])
            # обход: у Meshy часть граней вывернута (видна изнанка, обводка-оболочка рисуется поверх — чёрные «дыры»)
            I = list(I); flips = fix_winding(I, P, Nn) if Nn is not None else 0
            nv = len(P) // 3; key = {}; rid = []
            for i in range(nv): rid.append(key.setdefault(tuple(round(x, 5) for x in P[i * 3:i * 3 + 3]), len(key)))
            cnt = defaultdict(int); de = {}
            for t in range(0, len(I), 3):
                tri = I[t:t + 3]
                for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])):
                    u, v = rid[a], rid[b]; cnt[(min(u, v), max(u, v))] += 1; de[(u, v)] = (a, b)
            # открытые рёбра → контуры (обход любой: часть соседних граней только что развёрнута)
            adj = defaultdict(list); orig = {}
            for (u, v), (a, b) in de.items():
                if cnt[(min(u, v), max(u, v))] == 1: adj[u].append(v); adj[v].append(u); orig[u] = a; orig[v] = b
            used = set(); loops = []
            for s0 in list(adj):
                for v0 in adj[s0]:
                    if (min(s0, v0), max(s0, v0)) in used: continue
                    loop = [s0]; u, v = s0, v0
                    while True:
                        used.add((min(u, v), max(u, v))); loop.append(v); u = v
                        if v == s0: break
                        cand = [w for w in adj[u] if (min(u, w), max(u, w)) not in used]
                        if not cand: break
                        v = cand[0]
                    if loop[-1] == loop[0]: loops.append(loop[:-1])
            newI = list(I)
            for lp in loops:
                if len(lp) < 3 or len(lp) > maxlen: continue
                vs = [orig[u] for u in lp]
                c = [sum(P[v * 3 + k] for v in vs) / len(vs) for k in range(3)]
                near = min(vs, key=lambda v: sum((P[v * 3 + k] - c[k]) ** 2 for k in range(3)))
                ci = len(P) // 3; P += c
                if Nn is not None:
                    n = [sum(Nn[v * 3 + k] for v in vs) for k in range(3)]; l = max(1e-9, sum(x * x for x in n) ** 0.5); Nn += [x / l for x in n]
                if UV is not None: UV += UV[near * 2:near * 2 + 2]
                # соседний треугольник проходит ребро u→v — заплатка идёт v→u (лицом в ту же сторону)
                for i in range(len(lp)):
                    u, v = lp[i], lp[(i + 1) % len(lp)]
                    newI += [orig[v], orig[u], ci] if (u, v) in de else [orig[u], orig[v], ci]
                total += 1
            if Nn is not None: fix_winding(newI, P, Nn)   # и заплатки — по нормалям краёв
            write(at['POSITION'], P)
            if Nn is not None: write(at['NORMAL'], Nn)
            if UV is not None: write(at['TEXCOORD_0'], UV)
            write(pr['indices'], newI, 5125 if len(P) // 3 > 65535 else j['accessors'][pr['indices']]['componentType'])
            print(f'  сетка: открытых контуров {len(loops)}, закрыто {total}, вершин {nv} → {len(P) // 3}, вывернутых граней исправлено {flips}')
    while len(B) % 4: B.append(0)
    j['buffers'] = [{'byteLength': len(B)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(B)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(B)) + b'BIN\0' + bytes(B)
    open(dst, 'wb').write(out); print(f'{src} → {dst}')

if __name__ == '__main__': main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 400)
