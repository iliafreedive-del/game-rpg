# Ели, камни и скалы в духе POLYGON Snow Kit: крупные грани, ярусы хвои со снежными шапками, трещины на камнях.
# Все модели единичного размера (высота 1, основание в 0) — игра расставляет их сотнями через InstancedMesh.
# Запуск: python3 snowboard3d/tools/blender/build_scenery.py → models/scenery.glb
import os, sys, math, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, noise
from bkit import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'models')
reset()
MAT = mat('scenery', '#ffffff', 0.95)


def C(h):
    h = h.lstrip('#')
    return Vector([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


class ColorMesh(MeshBuilder):
    def __init__(self):
        super().__init__()
        self.fc = []

    def tri(self, a, b, c, col, n=None):
        if n is not None and (b - a).cross(c - a).dot(n) < 0:
            b, c = c, b  # грань смотрит наружу (по подсказке n)
        i = len(self.v)
        for p in (a, b, c):
            self.add_v(p)
        self.face((i, i + 1, i + 2), MAT, smooth=False)
        self.fc.append(col)

    def quad(self, a, b, c, d, col, n=None):
        self.tri(a, b, c, col, n)
        self.tri(a, c, d, col, n)

    def finish(self, name):
        o = self.to_object(name)
        me = o.data
        ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
        me.color_attributes.active_color = ca
        for p in me.polygons:
            col = self.fc[p.index]
            for li in p.loop_indices:
                ca.data[li].color = (*[c ** 2.2 for c in col], 1.0)  # sRGB → линейный
        return o


def shade_by_light(col, n, k=0.18):
    """Лёгкая «запечённая» светотень по нормали: верх светлее, низ темнее — как в low-poly наборах."""
    f = 1 + k * (n.y * 0.8 + n.x * 0.25 - n.z * 0.1)
    return Vector([min(1.0, c * f) for c in col])


def pine(name, seed, tiers=6, sides=8, snow=0.8, trunk=True, under=True, lean=0.0):
    rnd = random.Random(seed)
    cm = ColorMesh()
    green_hi, green_lo, under_c = C('#4f9466'), C('#2f6a48'), C('#1d3f2a')
    white, ice = C('#f3f7fb'), C('#cfdeee')
    if trunk:
        n6 = 6
        for j in range(n6):
            a0, a1 = TAU * j / n6, TAU * (j + 1) / n6
            p = lambda a, y, r: V(math.cos(a) * r, y, math.sin(a) * r)
            col = C('#5b4030') * (0.85 + 0.25 * math.cos(a0 - 0.6))
            cm.quad(p(a0, 0, 0.038), p(a1, 0, 0.038), p(a1, 0.22, 0.026), p(a0, 0.22, 0.026), col)
    for k in range(tiers):
        t = k / max(1, tiers - 1)
        y0 = 0.12 + t * 0.7
        R = (0.42 * (1 - t) ** 1.05 + 0.045) * (0.92 + rnd.random() * 0.16)
        h = (1.0 - y0) if k == tiers - 1 else min(0.36, R * 1.15 + 0.07)
        apex = V(lean * y0, y0 + h, 0)
        rot = rnd.random() * TAU
        rim = []
        for j in range(sides):
            a = rot + TAU * (j + (rnd.random() - 0.5) * 0.25) / sides
            tip = j % 2 == 0
            rr = R * (1.0 + rnd.random() * 0.1 if tip else 0.8 + rnd.random() * 0.06)
            droop = (0.05 + rnd.random() * 0.03 if tip else 0.015) * (R / 0.42) + 0.006
            rim.append(V(math.cos(a) * rr + lean * y0, y0 - droop, math.sin(a) * rr))
        # хвоя: грани конуса; снежная шапка — верхняя часть тех же граней, чуть выше поверхности
        sn = snow * (0.75 + rnd.random() * 0.4)
        for j in range(sides):
            a, b = rim[j], rim[(j + 1) % sides]
            n = (b - apex).cross(a - apex).normalized()
            if n.y < 0:
                n = -n
            gcol = shade_by_light(green_lo.lerp(green_hi, 0.35 + 0.65 * t), n)
            cut = clamp(0.3 + 0.26 * sn + (rnd.random() - 0.5) * 0.18, 0.16, 0.8)  # доля склона под снегом
            ca, cb = apex.lerp(a, cut), apex.lerp(b, cut * (0.85 + rnd.random() * 0.3))
            if sn > 0.05:
                cm.quad(ca, a, b, cb, gcol)
                # бортик снега (видна толщина шапки)
                off = n * 0.012
                cm.quad(ca + off, ca, cb, cb + off, shade_by_light(ice, n, 0.05))
                cm.tri(apex + off, ca + off, cb + off, shade_by_light(white, n, 0.1))
            else:
                cm.tri(apex, a, b, gcol)
        if under:
            c0 = V(lean * y0, y0 + 0.03, 0)
            for j in range(sides):
                cm.tri(c0, rim[(j + 1) % sides], rim[j], under_c)
    o = cm.finish(name)
    return o


def rock(name, seed, flat=False, snow=0.6):
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2 if flat else 3, radius=1.0)
    off = Vector((rnd.random() * 50, rnd.random() * 50, rnd.random() * 50))
    for v in bm.verts:
        p = Vector(v.co)
        k = 1 + 0.3 * noise.noise(p * 0.9 + off) + 0.12 * noise.noise(p * 2.6 + off)
        p *= k
        if p.z > 0:
            p.z *= 1.15 if flat else 0.72
        else:
            p.z *= 0.35
        if flat:
            p.x *= 1 + 0.25 * noise.noise(Vector((p.z * 3, 1, 0)) + off)
        v.co = p
    cm = ColorMesh()
    for f in bm.faces:
        pts = [toS(Vector(v.co)) for v in f.verts]  # Blender (Z вверх) → стоечные (Y вверх)
        pts = [V(p.x, p.y, p.z) for p in pts]
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized()
        c = sum(pts, Vector()) / 3
        base = C('#6d7684').lerp(C('#4a525e'), 0.5 + 0.5 * noise.noise(c * 2.5 + off))
        sn = smooth(0.5, 0.72, n.y) * smooth(-0.1, 0.25, c.y) * snow
        col = shade_by_light(base.lerp(C('#f3f7fb'), sn), n, 0.22)
        cm.tri(pts[0], pts[1], pts[2], col)
    bm.free()
    o = cm.finish(name)
    return o


def chalet(name, seed=3):
    """Бревенчатый домик-шале со снежной крышей, трубой и тёплыми окнами (размеры в метрах, основание в 0)."""
    rnd = random.Random(seed)
    cm = ColorMesh()
    W2, D2, H = 3.2, 2.6, 2.7  # полуширина (вдоль конька), полуглубина, высота стен
    log, log2 = C('#8a5a3a'), C('#6e4529')
    # стены из брёвен: восьмигранные брёвна, концы торчат на углах
    r = 0.15
    k = 0
    y = r
    while y < H:
        for axis in (0, 1):
            L = (W2 + 0.25) if axis == 0 else (D2 + 0.25)
            off = (D2 if axis == 0 else W2)
            for sg in (-1, 1):
                col = (log if k % 2 == 0 else log2) * (0.92 + rnd.random() * 0.12)
                for j in range(8):
                    a0, a1 = TAU * j / 8, TAU * (j + 1) / 8
                    def P(t, a):
                        if axis == 0:
                            return V(t, y + math.sin(a) * r, sg * off + math.cos(a) * r)
                        return V(sg * off + math.cos(a) * r, y + math.sin(a) * r, t)
                    n = V(0, math.sin((a0 + a1) / 2), math.cos((a0 + a1) / 2)) if axis == 0 else V(math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0)
                    cm.quad(P(-L, a0), P(L, a0), P(L, a1), P(-L, a1), shade_by_light(col, n, 0.25), n)
        y += 2 * r * 0.92
        k += 1
    # фронтоны
    peak = H + 1.9
    for sg in (-1, 1):
        x = sg * W2
        cm.tri(V(x, H, -D2 - 0.1), V(x, H, D2 + 0.1), V(x, peak, 0), shade_by_light(log2, V(sg, 0, 0), 0.2), V(sg, 0, 0))
    # крыша: доски и толстый слой снега со свесом
    roof, snow, snow2 = C('#4a3326'), C('#f4f8fc'), C('#d6e3f1')
    for sg in (-1, 1):
        e = V(0, H - 0.25, sg * (D2 + 0.9))
        a, b = V(-W2 - 0.7, peak + 0.1, 0), V(W2 + 0.7, peak + 0.1, 0)
        c, d = V(W2 + 0.7, e.y, e.z), V(-W2 - 0.7, e.y, e.z)
        n = (b - a).cross(d - a).normalized()
        if n.y < 0:
            n = -n
        cm.quad(a, b, c, d, shade_by_light(roof, n, 0.1), n)
        cm.quad(a, b, c, d, roof * 0.7, -n)  # доски снизу видно из-под свеса
        up = n * 0.32
        cm.quad(a + up, b + up, c + up, d + up, shade_by_light(snow, n, 0.12), n)
        cm.quad(d, c, c + up, d + up, shade_by_light(snow2, V(0, 0, sg), 0.05), V(0, 0, sg))
        for x in (-W2 - 0.7, W2 + 0.7):
            cm.quad(V(x, a.y, 0), V(x, d.y, d.z), V(x, d.y, d.z) + up, V(x, a.y, 0) + up, snow2, V(x, 0, 0))
    # труба
    cx, cz = 1.6, -0.9
    for j in range(4):
        a0, a1 = TAU * j / 4 + math.pi / 4, TAU * (j + 1) / 4 + math.pi / 4
        p0 = V(cx + math.cos(a0) * 0.42, 0, cz + math.sin(a0) * 0.42)
        p1 = V(cx + math.cos(a1) * 0.42, 0, cz + math.sin(a1) * 0.42)
        cm.quad(p0 + V(0, H + 0.6, 0), p1 + V(0, H + 0.6, 0), p1 + V(0, peak + 0.9, 0), p0 + V(0, peak + 0.9, 0), shade_by_light(C('#7b8794'), V(math.cos((a0 + a1) / 2), 0, math.sin((a0 + a1) / 2)), 0.3), V(math.cos((a0 + a1) / 2), 0, math.sin((a0 + a1) / 2)))
    cm.quad(V(cx - 0.42, peak + 0.95, cz - 0.42), V(cx + 0.42, peak + 0.95, cz - 0.42), V(cx + 0.42, peak + 0.95, cz + 0.42), V(cx - 0.42, peak + 0.95, cz + 0.42), snow, V(0, 1, 0))
    # дверь и окна (тёплый свет)
    door, glass, frame_c = C('#5a3a24'), C('#ffd27a'), C('#f1e6d4')
    z = D2 + 0.17
    cm.quad(V(-0.55, 0.02, z), V(0.55, 0.02, z), V(0.55, 2.0, z), V(-0.55, 2.0, z), door, V(0, 0, 1))
    for x0 in (-2.3, 1.3):
        cm.quad(V(x0 - 0.08, 0.92, z - 0.01), V(x0 + 1.08, 0.92, z - 0.01), V(x0 + 1.08, 2.08, z - 0.01), V(x0 - 0.08, 2.08, z - 0.01), frame_c, V(0, 0, 1))
        cm.quad(V(x0, 1.0, z), V(x0 + 1.0, 1.0, z), V(x0 + 1.0, 2.0, z), V(x0, 2.0, z), glass, V(0, 0, 1))
    # сугроб у стены
    for j in range(10):
        a0, a1 = math.pi * j / 10, math.pi * (j + 1) / 10
        P = lambda a, h: V(-W2 - 0.4 + (2 * W2 + 0.8) * (1 - math.cos(a)) / 2, h, -D2 - 0.2 - 0.6 * math.sin(a))
        cm.quad(P(a0, 0), P(a1, 0), P(a1, 0.45 * math.sin(a1)), P(a0, 0.45 * math.sin(a0)), snow2, V(0, 0.3, -1))
    return cm.finish(name)


objs = [
    pine('PineA', 11, tiers=7, sides=9, snow=0.7),
    pine('PineB', 23, tiers=6, sides=8, snow=0.45),
    pine('PineC', 37, tiers=7, sides=9, snow=0.95, lean=0.02),
    pine('PineFar', 51, tiers=4, sides=7, snow=0.6, trunk=False, under=False),
    rock('Rock', 5),
    rock('Cliff', 9, flat=True, snow=0.8),
    chalet('Chalet'),
]
for i, o in enumerate(objs):
    o.location = S(i * 1.5 + (6 if o.name == 'Chalet' else 0), 0, 0)
os.makedirs(OUT, exist_ok=True)
export_glb(os.path.join(OUT, 'scenery.glb'), objs)
for o in objs:
    print(o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
print('scenery ok', os.path.getsize(os.path.join(OUT, 'scenery.glb')))
