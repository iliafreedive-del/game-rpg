# Общие помощники для сборки моделей в Blender (bpy 5.2, без интерфейса).
# Все размеры пишем в «стоечной» системе игры: X — к носу доски, Y — вверх, Z — к носкам (как в js/rider.js).
# В Blender это (x, -z, y): экспортёр glTF (+Y вверх) вернёт ровно стоечные координаты.
import bpy, bmesh, math
from mathutils import Vector, Matrix

TAU = math.pi * 2


def S(x, y=None, z=None):
    if y is None:
        x, y, z = x
    return Vector((x, -z, y))


def toS(v):
    return Vector((v.x, v.z, -v.y))


def V(x=0.0, y=0.0, z=0.0):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


def clamp(x, a, b):
    return a if x < a else b if x > b else x


def smooth(e0, e1, x):
    if e0 == e1:
        return 0.0 if x < e0 else 1.0
    t = clamp((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    return sc


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- материалы
MATS = {}


def mat(name, color, rough=0.7, metal=0.0, emit=None, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    c = color if isinstance(color, tuple) else hex_rgb(color)
    b.inputs['Base Color'].default_value = (*c, 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    MATS[name] = m
    return m


def hex_rgb(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


# ---------------------------------------------------------------- сетка из колец (лофт)
class MeshBuilder:
    """Копит вершины (в стоечной системе), грани и номер материала каждой грани."""

    def __init__(self):
        self.v = []
        self.f = []
        self.fm = []
        self.mats = []
        self.smooth = []

    def mat_index(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def add_v(self, p):
        self.v.append(Vector(p))
        return len(self.v) - 1

    def face(self, idx, m, smooth=True):
        self.f.append(tuple(idx))
        self.fm.append(self.mat_index(m))
        self.smooth.append(smooth)

    def loft(self, rings, m, cap0=False, cap1=False, closed=True, smooth=True, mats=None):
        """rings — список колец одинаковой длины (стоечные точки). mats(i, j) → материал грани."""
        n = len(rings[0])
        base = len(self.v)
        for r in rings:
            for p in r:
                self.add_v(p)
        segs = n if closed else n - 1
        for i in range(len(rings) - 1):
            for j in range(segs):
                a = base + i * n + j
                b = base + i * n + (j + 1) % n
                c = base + (i + 1) * n + (j + 1) % n
                d = base + (i + 1) * n + j
                self.face((a, b, c, d), mats(i, j) if mats else m, smooth)
        if cap0:
            self.fan(base, n, rings[0], m, flip=True, smooth=smooth)
        if cap1:
            self.fan(base + (len(rings) - 1) * n, n, rings[-1], m, flip=False, smooth=smooth)
        return base

    def fan(self, start, n, ring, m, flip, smooth=True):
        c = sum((Vector(p) for p in ring), Vector()) / n
        ci = self.add_v(c)
        for j in range(n):
            a, b = start + j, start + (j + 1) % n
            self.face((ci, b, a) if flip else (ci, a, b), m, smooth)

    def to_object(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata([S(p) for p in self.v], [], self.f)
        for m in self.mats:
            me.materials.append(m)
        for i, p in enumerate(me.polygons):
            p.material_index = self.fm[i]
            p.use_smooth = self.smooth[i]
        me.validate()
        return link(bpy.data.objects.new(name, me))


def frame(d, up=V(0, 1, 0)):
    """Ортонормированный базис (X, Y) поперёк направления d."""
    d = Vector(d).normalized()
    a = up - d * up.dot(d)
    if a.length < 1e-6:
        a = V(0, 0, 1) - d * d.z
    a.normalize()
    b = d.cross(a).normalized()
    return b, a


def superellipse(c, X, Y, rx, ry, n=24, p=2.4, ph=0.0, bulge=None):
    out = []
    for j in range(n):
        t = ph + TAU * j / n
        ct, st = math.cos(t), math.sin(t)
        x = math.copysign(abs(ct) ** (2 / p), ct) * rx
        y = math.copysign(abs(st) ** (2 / p), st) * ry
        if bulge:
            x, y = bulge(t, x, y)
        out.append(Vector(c) + X * x + Y * y)
    return out


# ---------------------------------------------------------------- модификаторы
def apply_mods(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    obj.modifiers.clear()
    old = obj.data
    obj.data = me
    bpy.data.meshes.remove(old)
    return obj


def subsurf(obj, levels=2, apply=True):
    m = obj.modifiers.new('sub', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    if apply:
        apply_mods(obj)
    return obj


def decimate(obj, ratio):
    m = obj.modifiers.new('dec', 'DECIMATE')
    m.ratio = ratio
    return apply_mods(obj)


def skin_object(name, verts, edges, radii, root=0, smooth_shade=True, branch=0.0):
    """Скин-модификатор: из «скелета» рёбер — гладкая трубчатая сетка (radii — (полуширина, полуглубина))."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([S(p) for p in verts], edges, [])
    obj = link(bpy.data.objects.new(name, me))
    m = obj.modifiers.new('skin', 'SKIN')
    m.use_smooth_shade = smooth_shade
    m.branch_smoothing = branch
    for i, sv in enumerate(me.skin_vertices[0].data):
        sv.radius = radii[i]
        sv.use_root = (i == root)
    return obj


def join(objs, name):
    """Склейка объектов в один (без bpy.ops): переносим геометрию через bmesh."""
    bm = bmesh.new()
    mats = []
    for o in objs:
        me = o.data
        idx = []
        for m in me.materials:
            if m not in mats:
                mats.append(m)
            idx.append(mats.index(m))
        tmp = bmesh.new()
        tmp.from_mesh(me)
        tmp.transform(o.matrix_world)
        for f in tmp.faces:
            f.material_index = idx[f.material_index] if idx else 0
        me2 = bpy.data.meshes.new('tmp')
        tmp.to_mesh(me2)
        tmp.free()
        bm.from_mesh(me2)
        bpy.data.meshes.remove(me2)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = link(bpy.data.objects.new(name, me))
    for o in objs:
        bpy.data.objects.remove(o)
    return obj


def export_glb(path, objs=None):
    for o in bpy.context.scene.objects:
        o.select_set(objs is None or o in objs)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=objs is not None,
                              export_yup=True, export_apply=False, export_skins=True, export_animations=False,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_normals=True, export_tangents=False, export_def_bones=False,
                              export_extras=True, export_materials='EXPORT')


def bake_ao(obj, samples=24, distance=0.25, name='AO'):
    """Запекаем затенение складок (ambient occlusion) в цвет вершин — в игре он темнит подмышки, складки, низ куртки."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.world = sc.world or bpy.data.worlds.new('w')
    sc.world.light_settings.distance = distance
    me = obj.data
    if name not in me.color_attributes:
        me.color_attributes.new(name, 'BYTE_COLOR', 'CORNER')
    me.color_attributes.active_color = me.color_attributes[name]
    for o in sc.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj
    with bpy.context.temp_override(active_object=obj, selected_objects=[obj], object=obj):
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS', use_clear=True)


def closest_on_polyline(p, pts):
    best, bd = None, 1e9
    for a, b in zip(pts[:-1], pts[1:]):
        d = b - a
        t = clamp((p - a).dot(d) / max(d.length_squared, 1e-12), 0, 1)
        q = a + d * t
        if (p - q).length < bd:
            best, bd = q, (p - q).length
    return best


def inside_axes(*polylines):
    """Функция «точка внутри»: ближайшая точка на одной из осей (для разворота нормалей наружу)."""
    pls = [[Vector(q) for q in pl] for pl in polylines]

    def f(p):
        best, bd = None, 1e9
        for pl in pls:
            q = closest_on_polyline(p, pl) if len(pl) > 1 else pl[0]
            if (p - q).length < bd:
                best, bd = q, (p - q).length
        return best
    return f


def orient(obj, inside):
    """Разворачивает грани нормалью наружу (от точки inside(p)). Нужно и для света, и для запекания AO."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    flip = []
    for f in bm.faces:
        c = toS(f.calc_center_median())
        n = toS(f.normal)
        if n.dot(c - inside(c)) < 0:
            flip.append(f)
    if flip:
        bmesh.ops.reverse_faces(bm, faces=flip)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def remap_colors(obj, lo=0.45, gamma=0.8, name='AO'):
    """AO 0…1 → lo…1: складки темнее, но вещи не чернеют."""
    ca = obj.data.color_attributes[name]
    for d in ca.data:
        a = d.color[0]
        v = lo + (1 - lo) * (a ** gamma)
        d.color = (v, v, v, 1.0)
