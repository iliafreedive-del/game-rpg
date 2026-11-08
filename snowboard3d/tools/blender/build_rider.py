# Райдер для snowboard3d: одна сетка с костями (куртка Marmot в два цвета, прямые серые штаны поверх ботинок,
# варежки, баф, маска и шлем). Купол шлема — из нейросети Hunyuan3D (по кадру из видео), остальное смоделировано здесь.
# Запуск: python3 snowboard3d/tools/blender/build_rider.py   (нужен pip-пакет bpy 5.2)
# Выход: snowboard3d/models/rider.glb + rider_rig.json (суставы позы покоя для привязки к IK игры).
import os, sys, math, json
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from bkit import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'models')
reset()

# ---------------------------------------------------------------- суставы позы покоя (стоечная система)
THIGH, SHIN, TORSO, UARM, FARM, NECK = 0.45, 0.45, 0.52, 0.29, 0.27, 0.16
CHEST_AT, MID_AT = 0.27, 0.14
W = 0.52


def ik(root, end, l1, l2, pole):
    d = end - root
    dist = d.length
    dn = d.normalized()
    a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    perp = pole - dn * pole.dot(dn)
    perp.normalize()
    return root + dn * a + perp * h


P = V(0, 0.99, 0)
J = {'pelvis': P}
for s, sg in (('F', 1), ('R', -1)):
    hip = P + V(0.1 * sg, 0, 0)
    ank = V(W / 2 * sg, 0.13, 0)
    J['hip' + s], J['ank' + s] = hip, ank
    J['knee' + s] = ik(hip, ank, THIGH, SHIN, V(0, 0.2, 1))
    J['foot' + s] = V(W / 2 * sg, 0.018, 0)
J['chest'] = P + V(0, CHEST_AT, 0)
J['neck'] = P + V(0, TORSO, 0)
J['headC'] = J['neck'] + V(0, NECK, 0)
for s, sg in (('F', 1), ('R', -1)):
    sh = J['neck'] + V(0.18 * sg, -0.05, 0)
    ua = V(math.sin(math.radians(36)) * sg, -math.cos(math.radians(36)), 0.06).normalized()
    el = sh + ua * UARM
    fa = (ua + V(0, 0.05, 0.42)).normalized()
    wr = el + fa * FARM
    J['sh' + s], J['el' + s], J['wr' + s] = sh, el, wr
REST = {k: [round(c, 5) for c in v] for k, v in J.items()}

# ---------------------------------------------------------------- материалы (цвета — для превью; в игре палитра своя)
M = {
    'jacket': mat('jacket', '#1ba7e3', 0.62),
    'jacket2': mat('jacket2', '#22306a', 0.66),
    'piping': mat('piping', '#e8edf3', 0.5),
    'trim': mat('trim', '#16181c', 0.45),
    'pants': mat('pants', '#6b7079', 0.8),
    'boots': mat('boots', '#2c3139', 0.55),
    'sole': mat('sole', '#1b1d21', 0.8),
    'midsole': mat('midsole', '#c9cdd3', 0.7),
    'accent': mat('accent', '#e11d48', 0.4),
    'gloves': mat('gloves', '#1d1f24', 0.55),
    'gcuff': mat('gcuff', '#3a4049', 0.6),
    'helmet': mat('helmet', '#f3f5f7', 0.35),
    'frame': mat('frame', '#16181c', 0.4),
    'lens': mat('lens', '#ffb100', 0.08, 0.6),
    'strap': mat('strap', '#2a2f38', 0.6),
    'skin': mat('skin', '#e9b48f', 0.6),
    'gaiter': mat('gaiter', '#44566b', 0.85),
}

parts = []  # (объект, функция весов)

# ---------------------------------------------------------------- веса
BONES = ['pelvis', 'spine', 'chest', 'neck', 'head',
         'thigh_F', 'knee_F', 'shin_F', 'foot_F', 'thigh_R', 'knee_R', 'shin_R', 'foot_R',
         'uarm_F', 'elbow_F', 'farm_F', 'uarm_R', 'elbow_R', 'farm_R']


def limb_s(p, A, Mj, E):
    L1, L2 = (Mj - A).length, (E - Mj).length
    d1, d2 = (Mj - A).normalized(), (E - Mj).normalized()
    t1 = (p - A).dot(d1)
    t2 = (p - Mj).dot(d2)
    c1 = A + d1 * clamp(t1, 0, L1)
    c2 = Mj + d2 * clamp(t2, 0, L2)
    if (p - c1).length <= (p - c2).length:
        return t1, L1
    return L1 + t2, L1


def limb_w(s, L1, band, names):
    t = clamp((s - L1) / band, -1, 1)
    h = 1 - smooth(0, 1, abs(t))
    return {names[0]: (1 - h) if t < 0 else 0.0, names[1]: h, names[2]: (1 - h) if t > 0 else 0.0}


def add(w, k, x):
    w[k] = w.get(k, 0.0) + x


def scale(w, k):
    return {a: b * k for a, b in w.items()}


def merge(*ws):
    out = {}
    for w in ws:
        for a, b in w.items():
            add(out, a, b)
    return out


def leg_w(p, s):
    sh, L1 = limb_s(p, J['hip' + s], J['knee' + s], J['ank' + s])
    w = limb_w(sh, L1, 0.085, ('thigh_' + s, 'knee_' + s, 'shin_' + s))
    r = smooth(-0.03, 0.12, sh)
    w = scale(w, r)
    add(w, 'pelvis', 1 - r)
    return w


def pants_w(p):
    f = smooth(-0.045, 0.045, p.x)
    return merge(scale(leg_w(p, 'F'), f), scale(leg_w(p, 'R'), 1 - f))


def torso_w(p):
    y = p.y
    wp = 1 - smooth(P.y + 0.03, P.y + 0.17, y)
    wc = smooth(P.y + 0.13, P.y + 0.31, y)
    w = {'pelvis': wp, 'spine': max(0.0, 1 - wp - wc), 'chest': wc}
    h = 0.55 * smooth(P.y - 0.03, P.y - 0.17, y) * smooth(-0.03, 0.09, p.z)
    if h > 0:
        f = smooth(-0.06, 0.06, p.x)
        w = scale(w, 1 - h)
        add(w, 'thigh_F', h * f)
        add(w, 'thigh_R', h * (1 - f))
    return w


def seg_dist(p, a, b):
    d = b - a
    t = clamp((p - a).dot(d) / d.length_squared, 0, 1)
    return (p - (a + d * t)).length


def arm_dist(p, s):
    return min(seg_dist(p, J['sh' + s], J['el' + s]), seg_dist(p, J['el' + s], J['wr' + s]))


def arm_w(p, s):
    sa, L1 = limb_s(p, J['sh' + s], J['el' + s], J['wr' + s])
    return sa, limb_w(sa, L1, 0.07, ('uarm_' + s, 'elbow_' + s, 'farm_' + s))


def jacket_w(p):
    s = 'F' if p.x > 0 else 'R'
    sa, wa = arm_w(p, s)
    b = smooth(-0.05, 0.06, sa) * (1 - smooth(0.095, 0.135, arm_dist(p, s)))
    return merge(scale(torso_w(p), 1 - b), scale(wa, b))


def const_w(name):
    return lambda p: {name: 1.0}


def boot_w(s):
    def f(p):
        ws = smooth(0.13, 0.21, p.y)
        return {'foot_' + s: 1 - ws, 'shin_' + s: ws}
    return f


def collar_w(p):
    wn = 0.6 * smooth(J['neck'].y - 0.02, J['neck'].y + 0.06, p.y)
    return {'chest': 1 - wn, 'neck': wn}


def gaiter_w(p):
    wc = 1 - smooth(1.46, 1.52, p.y)
    wh = smooth(1.555, 1.625, p.y)
    return {'chest': wc, 'neck': max(0.0, 1 - wc - wh), 'head': wh}


def stance_verts(obj):
    return [toS(obj.matrix_world @ v.co) for v in obj.data.vertices]


def assign_weights(obj, fn):
    for b in BONES:
        obj.vertex_groups.new(name=b)
    vg = {b: obj.vertex_groups[b] for b in BONES}
    for i, p in enumerate(stance_verts(obj)):
        w = fn(p)
        tot = sum(x for x in w.values() if x > 1e-4) or 1.0
        for b, x in w.items():
            if x > 1e-4:
                vg[b].add([i], x / tot, 'REPLACE')


# ---------------------------------------------------------------- складки ткани
def displace(obj, fn):
    """Сдвиг вершин вдоль нормали: fn(стоечная точка, стоечная нормаль) → метры."""
    me = obj.data
    for v in me.vertices:
        p, n = toS(v.co), toS(v.normal)
        d = fn(p, n)
        if d:
            v.co += v.normal * d
    me.update()


def around(p, A, B, ref):
    """Угол вокруг оси A→B (0 — направление ref) и параметр вдоль оси."""
    ax = (B - A).normalized()
    r = p - A
    t = r.dot(ax)
    q = r - ax * t
    X = (ref - ax * ref.dot(ax)).normalized()
    Y = ax.cross(X)
    return math.atan2(q.dot(Y), q.dot(X)), t


def pants_folds(p, n):
    s = 'F' if p.x > 0 else 'R'
    hip, knee, ank = J['hip' + s], J['knee' + s], J['ank' + s]
    d = 0.0
    # «гармошка» над ботинком: штанина ложится волнами на голенище
    th, t = around(p, knee, ank, V(0, 0, 1))
    L = (ank - knee).length
    env = smooth(L - 0.30, L - 0.16, t) * (1 - smooth(L + 0.02, L + 0.05, t))
    if env > 0:
        d += env * 0.0055 * math.sin(t / 0.034 * TAU + 1.3 * math.sin(th * 2 + 0.7) + 0.6 * math.cos(th * 3))
    # под коленом — поперечные складки сзади
    back = smooth(0.3, 0.95, -math.cos(th))
    env2 = (1 - smooth(0.0, 0.09, abs(t))) * back
    if env2 > 0:
        d += env2 * 0.0045 * math.sin(t / 0.028 * TAU + th * 1.5)
    # на бедре спереди — пара мягких диагональных складок
    th2, t2 = around(p, hip, knee, V(0, 0, 1))
    env3 = smooth(0.12, 0.25, t2) * (1 - smooth(0.33, 0.42, t2)) * smooth(0.2, 0.9, math.cos(th2))
    if env3 > 0:
        d += env3 * 0.003 * math.sin((t2 + 0.06 * th2) / 0.06 * TAU)
    return d


def jacket_folds(p, n):
    s = 'F' if p.x > 0 else 'R'
    sh, el, wr = J['sh' + s], J['el' + s], J['wr' + s]
    d = 0.0
    th, t = around(p, sh, el, V(0, 0, 1))
    L = (el - sh).length
    if t > 0.04:
        # локоть: складки на сгибе (внутренняя сторона)
        env = (1 - smooth(0.03, 0.11, abs(t - L))) * smooth(-0.2, 0.8, math.cos(th))
        d += env * 0.005 * math.sin((t - L) / 0.026 * TAU + 0.8 * th)
        # гармошка у манжеты
        th3, t3 = around(p, el, wr, V(0, 0, 1))
        L3 = (wr - el).length
        env3 = smooth(L3 - 0.12, L3 - 0.04, t3) * (1 - smooth(L3 + 0.005, L3 + 0.03, t3))
        d += env3 * 0.004 * math.sin(t3 / 0.03 * TAU + 1.1 * math.sin(th3 * 2))
    else:
        # талия по бокам: горизонтальные заломы
        side = smooth(0.12, 0.19, abs(p.x))
        env = side * smooth(P.y - 0.05, P.y + 0.02, p.y) * (1 - smooth(P.y + 0.14, P.y + 0.22, p.y))
        d += env * 0.0035 * math.sin(p.y / 0.035 * TAU + p.z * 30)
    return d


# ---------------------------------------------------------------- штаны (скин-модификатор: пояс → таз → две штанины)
def build_pants():
    vs, ed, rr = [], [], []

    def v(p, r):
        vs.append(p)
        rr.append(r)
        return len(vs) - 1

    w0 = v(V(0, 1.045, -0.006), (0.162, 0.118))
    s0 = v(V(0, 0.935, -0.014), (0.178, 0.128))
    ed.append((w0, s0))
    for s, sg in (('F', 1), ('R', -1)):
        hip, knee, ank = J['hip' + s], J['knee' + s], J['ank' + s]
        a = v(hip.lerp(knee, 0.14) + V(0.004 * sg, 0, -0.004), (0.111, 0.118))
        b = v(hip.lerp(knee, 0.55), (0.104, 0.108))
        c = v(knee + V(0, 0, -0.006), (0.098, 0.102))
        d = v(knee.lerp(ank, 0.5) + V(0, 0, -0.008), (0.1, 0.104))
        e = v(knee.lerp(ank, 0.86) + V(0, 0, -0.006), (0.107, 0.112))
        hem = ank + (ank - knee).normalized() * 0.058
        f = v(hem + V(0, 0, -0.004), (0.114, 0.12))
        ed += [(s0, a), (a, b), (b, c), (c, d), (d, e), (e, f)]
    o = skin_object('pants', vs, ed, rr)
    subsurf(o, 3)
    # низ штанины открыт — внутри ботинок
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = [f for f in bm.faces if all(toS(v.co).y < 0.092 for v in f.verts) and toS(f.normal).y < -0.5]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(o.data); bm.free()
    o.data.materials.append(M['pants'])
    for p in o.data.polygons:
        p.use_smooth = True
    displace(o, pants_folds)
    return o


# ---------------------------------------------------------------- куртка (торс + рукава одним куском)
def build_jacket():
    vs, ed, rr = [], [], []

    def v(p, r):
        vs.append(p)
        rr.append(r)
        return len(vs) - 1

    hem = v(V(0, 0.805, -0.004), (0.199, 0.149))
    wai = v(V(0, 0.975, -0.002), (0.193, 0.143))
    ch = v(V(0, 1.215, 0.006), (0.203, 0.148))
    yo = v(V(0, 1.395, -0.01), (0.176, 0.126))
    nk = v(V(0, 1.47, -0.014), (0.082, 0.077))
    ed += [(hem, wai), (wai, ch), (ch, yo), (yo, nk)]
    for s, sg in (('F', 1), ('R', -1)):
        sh, el, wr = J['sh' + s], J['el' + s], J['wr' + s]
        a = v(sh + V(-0.012 * sg, 0.0, -0.008), (0.086, 0.086))
        b = v(sh.lerp(el, 0.5), (0.077, 0.077))
        c = v(el, (0.071, 0.071))
        d = v(el.lerp(wr, 0.5), (0.069, 0.069))
        e = v(wr + (wr - el).normalized() * 0.012, (0.067, 0.067))
        ed += [(yo, a), (a, b), (b, c), (c, d), (d, e)]
    o = skin_object('jacket', vs, ed, rr)
    subsurf(o, 3)
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = []
    for f in bm.faces:
        c = toS(f.calc_center_median())
        n = toS(f.normal)
        for s in 'FR':
            el, wr = J['el' + s], J['wr' + s]
            ax = (wr - el).normalized()
            if (c - wr).dot(ax) > 0.004 and n.dot(ax) > 0.55:
                kill.append(f)
        # низ куртки открыт и ровный — не «боди»: штаны уходят внутрь
        if c.y < 0.86 and n.y < -0.35:
            kill.append(f)
    bmesh.ops.delete(bm, geom=list(set(kill)), context='FACES')
    edge_v = {v for e in bm.edges if e.is_boundary for v in e.verts if toS(v.co).y < 0.9}
    for v in edge_v:
        p = toS(v.co)
        v.co = S(p.x * 1.015, 0.806, p.z * 1.015)
    bm.to_mesh(o.data); bm.free()
    for m in ('jacket', 'jacket2', 'piping'):
        o.data.materials.append(M[m])
    # два цвета: плечи и верх рукавов — голубые, низ корпуса и предплечья — тёмно-синие; по шву — светлый кант
    for pl in o.data.polygons:
        c = toS(pl.center)
        yoke = 1.262 + 0.03 * smooth(0.05, -0.12, c.z)
        s = 'F' if c.x > 0 else 'R'
        sa, L1 = limb_s(c, J['sh' + s], J['el' + s], J['wr' + s])
        if sa > 0.0 and arm_dist(c, s) < 0.1:
            idx = 0 if sa < L1 + 0.04 else 1
        else:
            idx = 0 if c.y > yoke else 1
        if c.y < 0.835:
            idx = 1
        pl.material_index = idx
        pl.use_smooth = True
    displace(o, jacket_folds)
    return o


def surface_bvh(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bm.transform(obj.matrix_world)
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t


def ribbon(bvh, pts_s, ray_dir_s, width, off, m, name, up_s=None):
    """Тонкая лента по поверхности (молния, кант): лучи из точек вдоль ray_dir попадают в поверхность."""
    mb = MeshBuilder()
    rows = []
    for p in pts_s:
        hit = bvh.ray_cast(S(p), S(ray_dir_s) - S(0, 0, 0))
        if hit[0] is None:
            continue
        hp, hn = toS(hit[0]), toS(hit[1])
        rows.append((hp + hn * off, hn))
    rings = []
    for i, (p, n) in enumerate(rows):
        a = rows[min(i + 1, len(rows) - 1)][0] - rows[max(i - 1, 0)][0]
        side = a.cross(n).normalized() * (width / 2)
        rings.append([p - side, p + side, p + side - n * off * 0.8, p - side - n * off * 0.8])
    mb.loft(rings, m, cap0=True, cap1=True)
    return mb.to_object(name)


def build_jacket_details(jk):
    bvh = surface_bvh(jk)
    out = []
    # молния по центру
    zp = [V(0, y, 0.4) for y in [0.812 + i * 0.012 for i in range(52)]]
    out.append((ribbon(bvh, zp, V(0, 0, -1), 0.011, 0.0035, M['trim'], 'zip'), jacket_w))
    # нагрудный карман на молнии (передняя сторона, ближе к носу доски)
    pp = [V(0.055 + i * 0.008, 1.20 - i * 0.004, 0.4) for i in range(12)]
    out.append((ribbon(bvh, pp, V(0, 0, -1), 0.006, 0.003, M['trim'], 'pocket'), jacket_w))
    # нижние карманы
    for sg in (1, -1):
        pp = [V(sg * (0.07 + i * 0.006), 0.95 - i * 0.008, 0.4) for i in range(11)]
        out.append((ribbon(bvh, pp, V(0, 0, -1), 0.006, 0.003, M['trim'], 'pocket'), jacket_w))
    # светлая нашивка на груди (без логотипов)
    pp = [V(-0.125 + i * 0.006, 1.33, 0.4) for i in range(6)]
    out.append((ribbon(bvh, pp, V(0, 0, -1), 0.016, 0.003, M['piping'], 'patch'), jacket_w))
    return out


def build_collar_hood():
    mb = MeshBuilder()
    rings = []
    for y, r, dz in ((1.452, 0.086, -0.012), (1.478, 0.095, -0.009), (1.52, 0.093, -0.006), (1.565, 0.094, -0.004), (1.575, 0.091, -0.004)):
        rings.append(superellipse(V(0, y, dz), V(1, 0, 0), V(0, 0, 1), r, r * 1.02, 28, 2.2))
    mb.loft(rings, M['jacket2'])
    col = mb.to_object('collar')
    subsurf(col, 1)
    # капюшон, свёрнутый валиком за воротником
    vs, ed, rr = [], [], []
    for k in range(7):
        t = math.radians(-62 + 124 * k / 6)
        vs.append(V(math.sin(t) * 0.098, 1.49 + 0.012 * math.cos(t), -0.012 - math.cos(t) * 0.1))
        rr.append((0.034 * (0.7 + 0.3 * math.cos(t)), 0.03 * (0.7 + 0.3 * math.cos(t))))
        if k:
            ed.append((k - 1, k))
    hood = skin_object('hood', vs, ed, rr, root=3)
    subsurf(hood, 1)
    hood.data.materials.append(M['jacket2'])
    # молния на воротнике спереди
    zb = MeshBuilder()
    zr = []
    for y in (1.435, 1.5, 1.572):
        c = V(0, y, 0.1 - 0.004 + 0.004)
        zr.append([c + V(-0.006, 0, 0), c + V(0.006, 0, 0), c + V(0.006, 0, -0.006), c + V(-0.006, 0, -0.006)])
    zb.loft(zr, M['trim'], cap0=True, cap1=True)
    return [(col, collar_w), (hood, const_w('chest')), (zb.to_object('czip'), collar_w)]


# ---------------------------------------------------------------- варежки
def build_mitten(s, sg):
    el, wr = J['el' + s], J['wr' + s]
    ax = (wr - el).normalized()
    palm = V(-sg, 0, 0)
    palm = (palm - ax * palm.dot(ax)).normalized()
    kn = ax.cross(palm).normalized()
    mb = MeshBuilder()
    secs = [(-0.05, 0.077, 0.071, 'gcuff'), (-0.02, 0.078, 0.072, 'gcuff'), (0.022, 0.071, 0.063, 'gcuff'),
            (0.034, 0.052, 0.036, 'gloves'), (0.06, 0.054, 0.031, 'gloves'), (0.1, 0.056, 0.03, 'gloves'),
            (0.14, 0.052, 0.028, 'gloves'), (0.165, 0.041, 0.023, 'gloves'), (0.178, 0.022, 0.014, 'gloves')]
    rings = []
    for u, rw, rt, _ in secs:
        c = wr + ax * u + palm * (0.008 if u > 0.03 else 0)
        rings.append(superellipse(c, kn, palm, rw, rt, 20, 2.3))
    mats = lambda i, j: M[secs[i][3]]
    mb.loft(rings, M['gloves'], cap1=True, mats=mats)
    # большой палец
    tr = []
    base = wr + ax * 0.055 + palm * 0.02 + kn * (-0.03)
    tdir = (ax * 0.7 + palm * 0.45 - kn * 0.3).normalized()
    tx, ty = frame(tdir, palm)
    for u, r in ((0, 0.019), (0.03, 0.017), (0.055, 0.014), (0.068, 0.007)):
        tr.append(superellipse(base + tdir * u, tx, ty, r, r * 0.85, 12, 2.1))
    mb.loft(tr, M['gloves'], cap0=True, cap1=True)
    o = mb.to_object('mitten' + s)
    subsurf(o, 1)
    return o


# ---------------------------------------------------------------- ботинки
def boot_profile():
    # z (вдоль стопы), полуширина, высота верха над подошвой
    return [(-0.138, 0.034, 0.085), (-0.128, 0.046, 0.13), (-0.1, 0.051, 0.15), (-0.05, 0.053, 0.15), (0.0, 0.054, 0.135),
            (0.05, 0.055, 0.1), (0.1, 0.054, 0.078), (0.14, 0.05, 0.066), (0.165, 0.04, 0.056), (0.176, 0.026, 0.045)]


def build_boot(s, sg):
    f0 = J['foot' + s]
    mb = MeshBuilder()
    SOLE = 0.024
    rings = []
    for z, w, h in boot_profile():
        c = f0 + V(0, SOLE + h / 2, z)
        rings.append(superellipse(c, V(1, 0, 0), V(0, 1, 0), w, h / 2, 18, 2.8))
    mb.loft(rings, M['boots'], cap0=True, cap1=True)
    # голенище
    sr = []
    ank = J['ank' + s]
    sd = (J['knee' + s] - ank).normalized()
    sx = V(1, 0, 0) - sd * sd.x
    sx.normalize()
    sz = sx.cross(sd).normalized()
    if sz.z < 0:
        sz = -sz
    for y, rx, rz, dz in ((0.07, 0.054, 0.066, -0.04), (0.16, 0.057, 0.068, -0.028), (0.24, 0.058, 0.068, -0.02), (0.3, 0.06, 0.07, -0.016), (0.31, 0.052, 0.062, -0.016)):
        k = max(0.0, (y + f0.y - ank.y) / sd.y)
        c = (ank + sd * k) if y + f0.y > ank.y else f0 + V(0, y, 0)
        sr.append(superellipse(c + V(0, 0, dz), sx, sz, rx, rz, 18, 2.3))
    mb.loft(sr, M['boots'], cap1=True)
    # язык спереди
    tr = []
    for y, dz in ((0.12, 0.03), (0.2, 0.045), (0.29, 0.054)):
        k = max(0.0, (y + f0.y - ank.y) / sd.y)
        c = (ank + sd * k if y + f0.y > ank.y else f0 + V(0, y, 0)) + V(0, 0, dz)
        tr.append(superellipse(c, V(1, 0, 0), V(0, 0, 1), 0.036, 0.012, 12, 2.2))
    mb.loft(tr, M['boots'], cap0=True, cap1=True)
    # подошва: протектор и светлая промежуточная полоса
    def sole_ring(y, grow):
        pts = []
        prof = boot_profile()
        n = 28
        for j in range(n):
            t = TAU * j / n
            zz = math.cos(t)
            z = lerp(prof[0][0] - 0.004, prof[-1][0] + 0.004, (zz + 1) / 2)
            # полуширина по профилю
            k = min(range(len(prof) - 1), key=lambda i: abs((prof[i][0] + prof[i + 1][0]) / 2 - z))
            w = max(prof[k][1], 0.03) + grow
            pts.append(f0 + V(math.sin(t) * w, y, z))
        return pts
    ob = mb.to_object('boot' + s)
    sb = MeshBuilder()
    sb.loft([sole_ring(0.0, 0.004), sole_ring(0.013, 0.006)], M['sole'], cap0=True)
    sb.loft([sole_ring(0.013, 0.006), sole_ring(SOLE + 0.004, 0.004)], M['midsole'], cap1=True)
    so = sb.to_object('sole' + s)
    subsurf(ob, 1)
    subsurf(so, 1)
    # колёсико BOA снаружи голенища
    bb = MeshBuilder()
    c = f0 + V(0.06 * sg, 0.2, -0.02)
    n = V(sg, 0, 0.2).normalized()
    X, Y = frame(n, V(0, 1, 0))
    bb.loft([superellipse(c, X, Y, 0.02, 0.02, 18, 2), superellipse(c + n * 0.012, X, Y, 0.019, 0.019, 18, 2)], M['accent'], cap1=True)
    return [(ob, boot_w(s)), (so, const_w('foot_' + s)), (bb.to_object('boa' + s), boot_w(s))]


# ---------------------------------------------------------------- голова: лицо, баф, шлем (Hunyuan3D), маска
def build_head():
    hc = J['headC']
    out = []
    mb = MeshBuilder()
    rings = []
    for k in range(1, 12):
        a = math.pi * k / 12
        y = math.cos(a)
        r = math.sin(a)
        rings.append(superellipse(hc + V(0, -0.035 + y * 0.085, 0.022), V(1, 0, 0), V(0, 0, 1), 0.074 * r, 0.082 * r, 20, 2.1))
    mb.loft(rings, M['skin'], cap0=True, cap1=True)
    # нос
    nr = []
    for u, r in ((0, 0.016), (0.012, 0.014), (0.02, 0.008)):
        nr.append(superellipse(hc + V(0, -0.05 + u * 0.4, 0.098 + u), V(1, 0, 0), V(0, 1, 0), r * 0.8, r, 10, 2))
    mb.loft(nr, M['skin'], cap1=True)
    face = mb.to_object('face')
    out.append((face, const_w('head')))

    # баф: от воротника до маски, закрывает подбородок
    gb = MeshBuilder()
    gr = []
    for y, rx, rz, dz in ((1.445, 0.075, 0.075, -0.012), (1.5, 0.068, 0.07, -0.005), (1.555, 0.072, 0.08, 0.012), (1.6, 0.082, 0.092, 0.022),
                          (1.618, 0.087, 0.1, 0.026), (1.628, 0.085, 0.097, 0.024)):
        gr.append(superellipse(V(0, y, dz), V(1, 0, 0), V(0, 0, 1), rx, rz, 24, 2.2))
    gb.loft(gr, M['gaiter'])
    g = gb.to_object('gaiter')
    subsurf(g, 1)
    out.append((g, gaiter_w))

    # купол шлема — сетка из Hunyuan3D (обрезана, симметрична, упрощена)
    src = os.path.join(HERE, 'src', 'helmet_hunyuan.glb')
    bpy.ops.import_scene.gltf(filepath=src)
    hel = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
    hel.name = 'helmet'
    me = hel.data
    for v in me.vertices:
        b = hel.matrix_world @ v.co
        s = V(b.x, b.z, -b.y)  # нормированные координаты Hunyuan: x вбок, z вверх, −y вперёд
        p = hc + V(s.x * 0.131, 0.028 + s.y * 0.15, -0.012 + s.z * 0.158)
        v.co = S(p)
    hel.matrix_world = Matrix.Identity(4)
    me.materials.clear()
    me.materials.append(M['helmet'])
    for p in me.polygons:
        p.use_smooth = True
    out.append((hel, const_w('head')))

    # нижний пояс шлема: уши и затылок (спереди — маска)
    hb = MeshBuilder()
    rings = []
    for y, k in ((1.748, 0.93), (1.71, 1.0), (1.672, 0.985), (1.64, 0.95), (1.62, 0.9)):
        pts = []
        for j in range(17):
            a = math.radians(62 + 236 * j / 16)  # от правой щеки через затылок к левой
            pts.append(hc + V(math.sin(a) * 0.124 * k, y - hc.y, -0.012 + math.cos(a) * 0.15 * k))
        rings.append(pts)
    hb.loft(rings, M['helmet'], closed=False)
    low = hb.to_object('helmet_low')
    subsurf(low, 1)
    out.append((low, const_w('head')))

    # маска: оправа, линза, ремешок
    fb = MeshBuilder()
    R0, yb, yt = 0.118, 1.632, 1.702
    ring = []
    n = 19
    for j in range(n):
        a = math.radians(-66 + 132 * j / (n - 1))
        nose = 0.016 * math.exp(-(a / 0.22) ** 2)
        r = R0 + 0.006 * math.cos(a)
        cx = hc + V(math.sin(a) * r, 0, -0.012 + math.cos(a) * r * 1.14)
        out_d = V(math.sin(a), 0, math.cos(a) * 1.14).normalized()
        ring.append((cx, out_d, yb + nose - hc.y, yt - hc.y))
    frame_rings = []
    for cx, od, y0, y1 in ring:
        frame_rings.append([cx + V(0, y0 + 0.004, 0), cx + V(0, y0, 0) + od * 0.014, cx + V(0, y0 + 0.003, 0) + od * 0.024, cx + V(0, y1 - 0.003, 0) + od * 0.024, cx + V(0, y1, 0) + od * 0.014, cx + V(0, y1 - 0.004, 0)])
    fb.loft(frame_rings, M['frame'], cap0=True, cap1=True)
    fr = fb.to_object('goggle_frame')
    subsurf(fr, 1)
    out.append((fr, const_w('head')))
    lb = MeshBuilder()
    lrows = []
    for i in range(6):
        t = i / 5
        row = []
        for cx, od, y0, y1 in ring[2:-2]:
            y = lerp(y0 + 0.007, y1 - 0.007, t)
            bul = 0.004 * math.sin(math.pi * t)
            row.append(cx + V(0, y, 0) + od * (0.0265 + bul))
        lrows.append(row)
    lb.loft(lrows, M['lens'], closed=False)
    lens = lb.to_object('lens')
    out.append((lens, const_w('head')))
    sb = MeshBuilder()
    srows = []
    for y in (1.648, 1.686):
        pts = []
        for j in range(15):
            a = math.radians(64 + 232 * j / 14)
            pts.append(hc + V(math.sin(a) * 0.129, y - hc.y, -0.012 + math.cos(a) * 0.156))
        srows.append(pts)
    sb.loft(srows, M['strap'], closed=False)
    st = sb.to_object('strap')
    out.append((st, const_w('head')))
    return out


# ---------------------------------------------------------------- сборка
parts.append((build_pants(), pants_w))
jk = build_jacket()
parts.append((jk, jacket_w))
parts += build_jacket_details(jk)
parts += build_collar_hood()
for s, sg in (('F', 1), ('R', -1)):
    parts.append((build_mitten(s, sg), const_w('farm_' + s)))
    parts += build_boot(s, sg)
parts += build_head()

HC = J['headC']
head_axis = inside_axes([HC + V(0, -0.2, -0.012), HC + V(0, 0.2, -0.012)])
body_axis = inside_axes([V(0, 0.7, -0.03), V(0, 1.7, -0.03)])
INSIDE = {'zip': body_axis, 'pocket': body_axis, 'patch': body_axis, 'collar': body_axis, 'czip': body_axis, 'gaiter': body_axis,
          'face': inside_axes([HC + V(0, -0.03, 0.01)], [HC + V(0, -0.045, 0.1)]),
          'helmet_low': head_axis, 'goggle_frame': inside_axes([HC + V(0, -0.03, -0.012)]), 'lens': head_axis, 'strap': head_axis}
for s_ in 'FR':
    INSIDE['mitten' + s_] = inside_axes([J['wr' + s_] - (J['wr' + s_] - J['el' + s_]).normalized() * 0.06, J['wr' + s_] + (J['wr' + s_] - J['el' + s_]).normalized() * 0.16])
    f0 = J['foot' + s_]
    INSIDE['boot' + s_] = inside_axes([f0 + V(0, 0.07, -0.11), f0 + V(0, 0.06, 0.15)], [f0 + V(0, 0.07, -0.03), J['ank' + s_] + (J['knee' + s_] - J['ank' + s_]).normalized() * 0.2])
    INSIDE['sole' + s_] = inside_axes([f0 + V(0, 0.012, -0.12), f0 + V(0, 0.012, 0.16)])
    INSIDE['boa' + s_] = inside_axes([f0 + V(0.03 * (1 if s_ == 'F' else -1), 0.2, -0.02)])
    INSIDE['thumb' + s_] = None
for o, fn in parts:
    key = o.name.split('.')[0]
    if INSIDE.get(key):
        orient(o, INSIDE[key])
    print('part', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))
    for p in o.data.polygons:
        p.use_smooth = True
    assign_weights(o, fn)

rider = join([o for o, _ in parts], 'Rider')
# порядок групп одинаков у всех частей — переносим имена
for b in BONES:
    rider.vertex_groups.new(name=b)

tris = sum(len(p.vertices) - 2 for p in rider.data.polygons)
print('rider tris', tris, 'verts', len(rider.data.vertices))

bake_ao(rider, samples=int(os.environ.get('AO_SAMPLES', 24)), distance=0.09)
remap_colors(rider, 0.5, 0.75)

# ---------------------------------------------------------------- кости (без родителей: игра ставит каждую сама)
arm = bpy.data.armatures.new('RiderRig')
ao = link(bpy.data.objects.new('RiderRig', arm))
bpy.context.view_layer.objects.active = ao
for o in bpy.context.scene.objects:
    o.select_set(o == ao)
bpy.ops.object.mode_set(mode='EDIT')


def bone(name, h, t, roll_to=V(0, 0, 1)):
    b = arm.edit_bones.new(name)
    b.head, b.tail = S(h), S(t)
    b.align_roll(S(roll_to) - S(0, 0, 0))


bone('pelvis', P, P + V(0, 0.12, 0))
bone('spine', P + V(0, MID_AT, 0), P + V(0, MID_AT + 0.1, 0))
bone('chest', J['chest'], J['neck'])
bone('neck', J['neck'], J['neck'] + V(0, 0.08, 0))
bone('head', J['headC'], J['headC'] + V(0, 0.15, 0))
for s in 'FR':
    bone('thigh_' + s, J['hip' + s], J['knee' + s])
    bone('knee_' + s, J['knee' + s], J['knee' + s] + (J['ank' + s] - J['knee' + s]).normalized() * 0.06)
    bone('shin_' + s, J['knee' + s], J['ank' + s])
    bone('foot_' + s, J['foot' + s], J['foot' + s] + V(0, 0, 0.15), V(0, 1, 0))
    bone('uarm_' + s, J['sh' + s], J['el' + s])
    bone('elbow_' + s, J['el' + s], J['el' + s] + (J['wr' + s] - J['el' + s]).normalized() * 0.05)
    bone('farm_' + s, J['el' + s], J['wr' + s])
bpy.ops.object.mode_set(mode='OBJECT')

rider.parent = ao
md = rider.modifiers.new('arm', 'ARMATURE')
md.object = ao

os.makedirs(OUT, exist_ok=True)
export_glb(os.path.join(OUT, 'rider.glb'), [rider, ao])
with open(os.path.join(OUT, 'rider_rig.json'), 'w') as f:
    json.dump({'rest': REST, 'dims': {'THIGH': THIGH, 'SHIN': SHIN, 'TORSO': TORSO, 'UARM': UARM, 'FARM': FARM, 'NECK': NECK, 'W': W},
               'source': 'tools/blender/build_rider.py'}, f, indent=1)
print('ok', os.path.getsize(os.path.join(OUT, 'rider.glb')))
