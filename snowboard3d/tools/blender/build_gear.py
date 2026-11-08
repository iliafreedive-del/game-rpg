# Доска и крепления для snowboard3d (Blender, bpy 5.2).
# Доска: боковой вырез, подъём носа и хвоста, топшит, скользяк, боковина и стальной кант — размеры как в игре (js/art/gear.js).
# Крепление: диск с винтами, база, хилкап, хайбэк (поворачивается вокруг лодыжки вместе с голенью), два стрепа с трещотками.
# Запуск: python3 snowboard3d/tools/blender/build_gear.py → models/gear.glb
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix
from bkit import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'models')
reset()

BL, BE, BW, BWAIST, BT, RISE = 0.775, 0.6, 0.125, 0.1175, 0.013, 0.068


def halfW(x):
    a = abs(x)
    if a <= BE:
        return BWAIST + (BW - BWAIST) * (a / BE) ** 2
    q = min(1.0, (a - BE) / (BL - BE))
    return BW * max(0.0, 1 - q ** 3.2) ** (1 / 3.2)


def riseY(x):
    a = abs(x)
    k0 = BE - 0.07
    return 0.0 if a < k0 else RISE * ((a - k0) / (BL - k0)) ** 2.1


M = {k: mat(k, c, r, mt) for k, c, r, mt in (
    ('topsheet', '#1f6feb', 0.3, 0), ('base', '#20242b', 0.5, 0), ('sidewall', '#2a2f36', 0.4, 0), ('steel', '#aeb6bf', 0.3, 1),
    ('binding', '#d5dae0', 0.45, 0), ('highback', '#eef1f4', 0.4, 0), ('bstrap', '#2b3038', 0.65, 0), ('bpad', '#e11d48', 0.6, 0),
    ('metal', '#c7ced6', 0.28, 1), ('disc', '#30353d', 0.5, 0))}


# ---------------------------------------------------------------- доска
def build_board():
    xs = []
    tipN = 20
    for i in range(tipN + 1):
        xs.append(-BL + (BL - BE) * (1 - math.cos(i / tipN * math.pi / 2)))
    x = -BE + 0.03
    while x < BE - 0.001:
        xs.append(x)
        x += 0.03
    for i in range(tipN, -1, -1):
        xs.append(BL - (BL - BE) * (1 - math.cos(i / tipN * math.pi / 2)))
    NZ = 10
    mb = MeshBuilder()
    uvs = []  # (индекс грани, [uv на угол])

    def grid(top):
        base = len(mb.v)
        for x in xs:
            h = halfW(x) * (0.965 if top else 0.996)
            y = riseY(x) + (BT if top else 0)
            for j in range(NZ + 1):
                z = h * (2 * j / NZ - 1)
                # лёгкий прогиб топшита к центру (как у настоящей доски)
                yy = y - (0.0012 * (1 - (z / max(h, 1e-4)) ** 2) if top else 0)
                mb.add_v(V(x, yy, z))
        for i in range(len(xs) - 1):
            for j in range(NZ):
                a = base + i * (NZ + 1) + j
                b, c, d = a + NZ + 1, a + 1, a + NZ + 2
                fid = len(mb.f)
                if top:
                    mb.face((a, c, d, b), M['topsheet'])
                else:
                    mb.face((a, b, d, c), M['base'])
                uvs.append((fid, [(x_, z_) for x_, z_ in [(mb.v[k].x, mb.v[k].z) for k in mb.f[fid]]]))
    grid(True)
    grid(False)
    # боковина: фаска топшита → боковина → кант
    loop = [(x, 1) for x in xs] + [(x, -1) for x in reversed(xs)]
    rings = []
    for x, sg in loop:
        h, y = halfW(x), riseY(x)
        rings.append([V(x, y + BT, sg * h * 0.965), V(x, y + BT - 0.0035, sg * h), V(x, y + 0.0028, sg * h), V(x, y, sg * h * 0.996)])
    n = len(rings)
    base = len(mb.v)
    for r in rings:
        for p in r:
            mb.add_v(p)
    for k in range(n):
        for p in range(3):
            a = base + k * 4 + p
            b = base + ((k + 1) % n) * 4 + p
            sg = loop[k][1]
            f = (a, b, b + 1, a + 1) if sg > 0 else (a, a + 1, b + 1, b)
            mb.face(f, M['sidewall'] if p < 2 else M['steel'], smooth=False)
    o = mb.to_object('Board')
    # UV топшита и скользяка — как у старой доски: u вдоль, v поперёк (v перевёрнут под glTF)
    me = o.data
    uv = me.uv_layers.new(name='UV')
    for fid, _ in uvs:
        poly = me.polygons[fid]
        for li in poly.loop_indices:
            p = toS(me.vertices[me.loops[li].vertex_index].co)
            u = (p.x + BL) / (2 * BL)
            v = (p.z / BW + 1) / 2
            uv.data[li].uv = (u, 1 - v)
    for poly in me.polygons:
        if poly.material_index in (0, 1):
            poly.use_smooth = True
    return o


# ---------------------------------------------------------------- крепление (система стопы: X — вдоль доски, Y — вверх, Z — к носкам)
ANK = 0.112


def arch(c_z, rx, y0, ytop, width, thick, m, n=17, name='strap'):
    """Стреп дугой через ботинок: из точки сбоку (−rx, y0) через верх (0, ytop) в (rx, y0)."""
    mb = MeshBuilder()
    rings = []
    for j in range(n):
        a = math.pi * j / (n - 1)
        x = -math.cos(a) * rx
        y = y0 + math.sin(a) * (ytop - y0)
        nrm = V(-math.cos(a) * (ytop - y0), math.sin(a) * rx, 0).normalized()
        c = V(x, y, c_z)
        rings.append([c + V(0, 0, -width / 2), c + V(0, 0, width / 2), c + V(0, 0, width / 2) + nrm * thick, c + V(0, 0, -width / 2) + nrm * thick])
    mb.loft(rings, m, cap0=True, cap1=True)
    o = mb.to_object(name)
    subsurf(o, 1)
    return o


def rounded_rect(c, hx, hz, r, n=6):
    pts = []
    for qx, qz, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        cx, cz = c.x + qx * (hx - r), c.z + qz * (hz - r)
        for k in range(n):
            a = math.radians(a0 + 90 * k / (n - 1))
            pts.append(V(cx + math.cos(a) * r, c.y, cz + math.sin(a) * r))
    return pts


def build_binding():
    parts = []
    # диск
    db = MeshBuilder()
    db.loft([[V(math.cos(a) * 0.05, 0.0, math.sin(a) * 0.05) for a in [TAU * k / 32 for k in range(32)]],
             [V(math.cos(a) * 0.05, 0.007, math.sin(a) * 0.05) for a in [TAU * k / 32 for k in range(32)]]], M['disc'], cap0=True, cap1=True)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        c = V(math.cos(a) * 0.027, 0.007, math.sin(a) * 0.027)
        db.loft([[c + V(math.cos(t) * 0.0055, 0, math.sin(t) * 0.0055) for t in [TAU * k / 10 for k in range(10)]],
                 [c + V(math.cos(t) * 0.0055, 0.003, math.sin(t) * 0.0055) for t in [TAU * k / 10 for k in range(10)]]], M['metal'], cap1=True)
    disc = db.to_object('Disc')
    # база
    bb = MeshBuilder()
    bb.loft([rounded_rect(V(0, 0.002, 0.008), 0.063, 0.128, 0.03), rounded_rect(V(0, 0.012, 0.008), 0.061, 0.126, 0.028)], M['binding'], cap0=True, cap1=True)
    base = bb.to_object('Base')
    # хилкап — подкова вокруг пятки
    hb = MeshBuilder()
    rows = []
    for y, grow in ((0.012, 0.0), (0.065, 0.002), (0.118, 0.004)):
        row = []
        for k in range(17):
            t = k / 16
            # путь: левый бок (z от 0.02 к −0.08), дуга за пяткой, правый бок
            if t < 0.3:
                q = t / 0.3
                row.append(V(-(0.066 + grow), y, lerp(0.03 - y * 0.25, -0.085, q)))
            elif t > 0.7:
                q = (t - 0.7) / 0.3
                row.append(V(0.066 + grow, y, lerp(-0.085, 0.03 - y * 0.25, q)))
            else:
                a = math.pi * (t - 0.3) / 0.4
                row.append(V(-math.cos(a) * (0.066 + grow), y, -0.085 - math.sin(a) * (0.05 + grow)))
        rows.append(row)
    inner = [[p + V(0.006 * (1 if p.x < 0 else -1), 0, 0.004 if p.z < -0.09 else 0) for p in r] for r in reversed(rows)]
    hb.loft(rows + inner + [rows[0]], M['binding'], closed=False)
    heel = hb.to_object('Heelcup')
    subsurf(heel, 1)
    # хайбэк — изогнутая пластина за икрой; ось поворота — в лодыжке
    kb = MeshBuilder()
    rows = []
    for y, w, dz in ((0.07, 0.07, 0.0), (0.14, 0.074, -0.002), (0.22, 0.072, -0.006), (0.29, 0.066, -0.012), (0.325, 0.05, -0.016)):
        row = []
        for k in range(11):
            a = math.radians(-70 + 140 * k / 10)
            row.append(V(math.sin(a) * w, y - ANK, -0.078 + dz - math.cos(a) * 0.026))
        rows.append(row)
    back = [[p + V(0, 0, -0.008) for p in r] for r in reversed(rows)]
    kb.loft(rows + back + [rows[0]], M['highback'], closed=False)
    hbk = kb.to_object('Highback')
    subsurf(hbk, 1)
    hbk.location = S(0, ANK, 0)
    # мягкая накладка на хайбэке
    pb = MeshBuilder()
    rows = []
    for y, w in ((0.15, 0.05), (0.27, 0.045)):
        row = []
        for k in range(9):
            a = math.radians(-60 + 120 * k / 8)
            row.append(V(math.sin(a) * w, y - ANK, -0.073 - math.cos(a) * 0.024))
        rows.append(row)
    pb.loft(rows, M['bpad'], closed=False)
    pad = pb.to_object('Hbpad')
    pad.location = S(0, ANK, 0)
    # стрепы: голеностопный (через подъём) и носочный
    ank = arch(0.035, 0.07, 0.06, 0.178, 0.05, 0.012, M['bstrap'], name='AnkleStrap')
    toe = arch(0.128, 0.064, 0.03, 0.098, 0.03, 0.01, M['bstrap'], name='ToeStrap')
    # трещотки с внутренней стороны (−X)
    rb = MeshBuilder()
    for c, sz in ((V(-0.06, 0.125, 0.035), (0.012, 0.03, 0.026)), (V(-0.057, 0.075, 0.128), (0.01, 0.022, 0.018))):
        hx, hy, hz = sz
        box = [V(-hx, -hy, -hz), V(hx, -hy, -hz), V(hx, -hy, hz), V(-hx, -hy, hz)]
        rb.loft([[c + p for p in box], [c + p + V(0, 2 * hy, 0) for p in box]], M['metal'], cap0=True, cap1=True)
    rat = rb.to_object('Ratchets')
    for o in (disc, base, heel, hbk, pad, ank, toe, rat):
        for pl in o.data.polygons:
            pl.use_smooth = True
    root = link(bpy.data.objects.new('Binding', None))
    for o in (disc, base, heel, ank, toe, rat):
        o.parent = root
    pad.parent = hbk
    pad.location = (0, 0, 0)
    hbk.parent = root
    return root, [disc, base, heel, hbk, pad, ank, toe, rat]


board = build_board()
bind, bparts = build_binding()
bind.location = (0, -0.6, 0)  # в файле — рядом с доской; в игре ставится в начало стопы
os.makedirs(OUT, exist_ok=True)
export_glb(os.path.join(OUT, 'gear.glb'), [board, bind] + bparts)
print('gear ok', os.path.getsize(os.path.join(OUT, 'gear.glb')))
