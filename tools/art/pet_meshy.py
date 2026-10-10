#!/usr/bin/env python3
"""Питомцы каравана Кофи из Meshy (сборка 60): один GLB «линейка» с восемью зверьками → у каждого свой скелет → assets/models/pet_<id>.*
  python3 tools/art/pet_meshy.py <файл.glb> [выход]       выход по умолчанию — assets/models
1) Делёж: связные куски меша, каждый — к ближайшему центру зверька (CENTERS, координаты файла). Мелкие отдельные куски
   (клешня скорпиона — отдельный кусок) идут к своему зверьку; треугольников «через» двух зверьков нет (проверяется).
2) Нормировка: ноги на y=0, x по центру, вперёд +Z (так в файле), размер — SIZE (ось, метры).
3) Скелет — суставы в анатомических точках каждой модели (RIGS: плечо/локоть/запястье спереди, бедро/колено/скакательный
   сустав сзади, крыло плечо/локоть/кисть, позвонки хвоста). Вес — по «геодезической» близости: волна по рёбрам меша
   от каждой кости, поэтому лапа не берёт вершины бока через щель. Сглаживание — только между соседями по цепочке
   (кость — её родитель — её дети); вершина никогда не держится за две несоседние кости. Треугольники, связавшие
   несоседние кости (лапа «прилипла» к груди), вырезаются.
4) Текстура — одна общая на всех (atlas Meshy 2048 → 1024 webp, pets_meshy.webp).
"""
import os, sys, os, json, struct, io
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import glb_rig

CENTERS = {'fennec': (-0.8, 0.3, 0.56), 'crow': (-0.5, 0.3, -0.13), 'scorpid': (0.15, 0.3, -0.4), 'wisp': (0.77, 0.3, -0.7),
           'skull': (-0.56, -0.3, 0.72), 'basilisk': (-0.43, -0.3, -0.04), 'bat': (0.19, -0.3, -0.34), 'golem': (0.74, -0.3, -0.79)}
SCALE = {'fennec': 1.2, 'skull': 1.2, 'basilisk': 1.2, 'scorpid': 1.2, 'golem': 1.1, 'wisp': 1.1}
SIZE = {'fennec': ('z', 1.1), 'crow': ('x', 1.3), 'scorpid': ('z', 1.0), 'wisp': ('y', 0.75), 'skull': ('z', 1.2), 'basilisk': ('z', 1.4), 'bat': ('x', 1.3), 'golem': ('y', 1.1)}


def B(name, parent, at, tip=None): return [[name, parent, list(at)] + ([list(tip)] if tip else [])]


def LR(parent, pts, tip, box=None):
    """Цепочка суставов левой стороны (+X, имена ...L) и её зеркало справа (...R). box — «своя зона» конечности
    [xmin, xmax, ymin, ymax, zmin, zmax] слева (справа зеркально): вершины в ней берут только кости этой цепочки и её родителя."""
    bones, limbs = [], []
    for s, sf in ((1, 'L'), (-1, 'R')):
        prev, ch = None, []
        for i, (n, p) in enumerate(pts):
            nm = n + sf; bones.append([nm, (parent.replace('%', sf) if parent else None) if i == 0 else prev, [p[0] * s, p[1], p[2]]]); prev = nm; ch.append(nm)
        bones[-1].append([tip[0] * s, tip[1], tip[2]])
        if box:
            x0, x1 = (box[0], box[1]) if s > 0 else (-box[1], -box[0])
            limbs.append((ch, [x0, x1] + list(box[2:])))
    return bones, limbs


def rig(gait, kw, *parts):
    bones, limbs = [], []
    for p in parts:
        if isinstance(p, tuple): bones += p[0]; limbs += p[1]
        else: bones += p
    return dict(gait=gait, bones=bones, limbs=limbs, **kw)


# Суставы (метры, после нормировки). L = +X (левый бок зверька, он смотрит в +Z).
RIGS = {
  # фенек (лиса): плечо, локоть (смотрит назад), запястье; бедро, колено (вперёд), скакательный сустав (назад)
  'fennec': rig('quad', dict(stride=0.6, trot=2.6, span=0.55, soft=('tail1', 'tail2', 'tail3'), pref='tail',
                                 own=(('tail', [-1, 1, 0.12, 1, -2, -0.22]),)),
    B('hips', None, (0, 0.40, -0.15)), B('spine', 'hips', (0, 0.42, 0.12)), B('neck', 'spine', (0, 0.47, 0.27)), B('head', 'neck', (0, 0.55, 0.38), (0, 0.48, 0.56)),
    LR('head', [('ear', (0.06, 0.63, 0.37))], (0.19, 0.81, 0.34)),
    B('tail1', 'hips', (0, 0.40, -0.27)), B('tail2', 'tail1', (0, 0.28, -0.40)), B('tail3', 'tail2', (0, 0.18, -0.50), (0, 0.11, -0.60)),
    LR('spine', [('fsh', (0.07, 0.36, 0.21)), ('fel', (0.07, 0.22, 0.19)), ('fwr', (0.08, 0.07, 0.25))], (0.11, 0.01, 0.33), [0.0, 0.4, -0.01, 0.27, 0.05, 0.4]),
    LR('hips', [('hhip', (0.07, 0.36, -0.13)), ('hkn', (0.08, 0.23, -0.07)), ('hho', (0.09, 0.10, -0.15))], (0.13, 0.01, -0.03), [0.0, 0.4, -0.01, 0.27, -0.22, 0.05])),
  # костяной пёс (череп): та же собачья цепочка, суставы крупнее и шире
  'skull': rig('quad', dict(stride=0.75, trot=3.0, span=0.7),
    B('hips', None, (0, 0.52, -0.22)), B('spine', 'hips', (0, 0.58, 0.08)), B('neck', 'spine', (0, 0.64, 0.22)), B('head', 'neck', (0, 0.70, 0.33), (0, 0.62, 0.58)),
    B('tail1', 'hips', (0, 0.50, -0.32)), B('tail2', 'tail1', (0, 0.38, -0.44)), B('tail3', 'tail2', (0, 0.25, -0.54), (0, 0.12, -0.63)),
    LR('spine', [('fsh', (0.19, 0.48, 0.15)), ('fel', (0.22, 0.30, 0.19)), ('fwr', (0.235, 0.10, 0.28))], (0.25, 0.01, 0.43), [0.1, 0.45, -0.01, 0.40, 0.0, 0.55]),
    LR('hips', [('hhip', (0.16, 0.47, -0.18)), ('hkn', (0.20, 0.33, -0.19)), ('hho', (0.22, 0.15, -0.31))], (0.24, 0.01, -0.18), [0.1, 0.45, -0.01, 0.38, -0.45, 0.0])),
  # василиск (ящерица): лапы в стороны — плечо и бедро почти горизонтально, локоть и колено снаружи
  'basilisk': rig('sprawl', dict(stride=0.55, span=0.75),
    B('hips', None, (0, 0.22, -0.12)), B('spine', 'hips', (0, 0.30, 0.15)), B('neck', 'spine', (0, 0.40, 0.33)), B('head', 'neck', (0, 0.47, 0.47), (0, 0.45, 0.70)),
    B('tail1', 'hips', (0, 0.18, -0.28)), B('tail2', 'tail1', (0, 0.11, -0.43)), B('tail3', 'tail2', (0, 0.06, -0.57), (0, 0.02, -0.72)),
    LR('spine', [('fsh', (0.13, 0.25, 0.25)), ('fel', (0.24, 0.17, 0.25)), ('fwr', (0.28, 0.05, 0.33))], (0.30, 0.01, 0.45), [0.12, 0.45, -0.01, 0.30, 0.12, 0.6]),
    LR('hips', [('hhip', (0.12, 0.20, -0.05)), ('hkn', (0.24, 0.17, 0.0)), ('hho', (0.27, 0.05, -0.06))], (0.28, 0.01, 0.06), [0.12, 0.45, -0.01, 0.30, -0.25, 0.12])),
  # голем: двуногий — бедро, колено, голеностоп; руки-валуны — плечо, локоть, кисть; хвост
  'golem': rig('biped', dict(stride=0.75, span=0.8, bridge='cut', cut='limbs'),
    B('hips', None, (0, 0.50, 0.12)), B('spine', 'hips', (0, 0.78, 0.14)), B('head', 'spine', (0, 0.98, 0.20), (0, 1.08, 0.42)),
    B('tail1', 'hips', (0, 0.48, -0.02)), B('tail2', 'tail1', (0, 0.35, -0.20)), B('tail3', 'tail2', (0, 0.22, -0.36), (0, 0.08, -0.50)),
    LR('hips', [('lhip', (0.15, 0.47, 0.13)), ('lkn', (0.18, 0.26, 0.15)), ('lan', (0.20, 0.08, 0.15))], (0.20, 0.02, 0.30), [0.03, 0.335, -0.01, 0.47, -0.05, 0.45]),
    LR('spine', [('ash', (0.30, 0.88, 0.15)), ('ael', (0.42, 0.62, 0.15)), ('awr', (0.46, 0.36, 0.15))], (0.45, 0.20, 0.15), [0.26, 0.7, 0.1, 0.75, -0.2, 0.5])),
  # ворон: крыло — плечо, локоть, кисть; лапы — бедро, «пятка» назад (интертарзальный сустав), стопа
  'crow': rig('bird', dict(lift=0.85, span=0.6),
    *[B('body', None, (0, 0.24, -0.04)), B('chest', 'body', (0, 0.31, 0.03)), B('head', 'chest', (0, 0.40, 0.09), (0, 0.40, 0.28)),
    B('tail1', 'body', (0, 0.17, -0.10)), B('tail2', 'tail1', (0, 0.10, -0.20), (0, 0.0, -0.30)),
    LR('chest', [('wsh', (0.07, 0.33, 0.0)), ('wel', (0.22, 0.36, 0.0)), ('wwr', (0.42, 0.40, 0.0))], (0.65, 0.46, 0.0), [0.1, 0.8, 0.1, 0.6, -0.3, 0.3]),
    LR('body', [('leg', (0.035, 0.17, 0.0)), ('ank', (0.04, 0.08, 0.02)), ('foot', (0.045, 0.02, 0.07))], (0.05, 0.0, 0.17), [0.0, 0.1, -0.01, 0.13, -0.05, 0.25])]),
  # летучая мышь: крыло на пальцах — плечо, локоть, запястье; задние лапки коленом назад; уши
  'bat': rig('bat', dict(lift=0.85, span=0.6),
    *[B('body', None, (0, 0.24, -0.03)), B('chest', 'body', (0, 0.33, 0.0)), B('head', 'chest', (0, 0.40, 0.05), (0, 0.38, 0.16)),
    LR('head', [('ear', (0.04, 0.46, 0.04))], (0.09, 0.55, 0.03)),
    LR('chest', [('wsh', (0.08, 0.36, 0.0)), ('wel', (0.22, 0.46, 0.0)), ('wwr', (0.33, 0.56, 0.0))], (0.60, 0.42, 0.0), [0.1, 0.8, 0.1, 0.8, -0.3, 0.3]),
    LR('body', [('leg', (0.05, 0.17, -0.03)), ('kn', (0.08, 0.08, -0.05)), ('foot', (0.09, 0.02, -0.01))], (0.11, 0.0, 0.05), [0.0, 0.2, -0.01, 0.13, -0.2, 0.2])]),
  # скорпион (в модели по три ходильные ноги с каждой стороны): нога — от тела до «колена» (самая высокая точка), дальше вниз;
  # клешня — плечо, локоть, кисть; хвост — шесть члеников с жалом
  'scorpid': rig('scorp', dict(stride=0.4, span=0.7),
    B('body', None, (0, 0.28, -0.08), (0, 0.28, 0.12)),
    B('tl1', 'body', (0, 0.42, -0.16)), B('tl2', 'tl1', (0, 0.49, -0.32)), B('tl3', 'tl2', (0, 0.60, -0.37)), B('tl4', 'tl3', (0, 0.73, -0.36)),
    B('tl5', 'tl4', (0, 0.82, -0.28)), B('tl6', 'tl5', (0, 0.84, -0.14), (0, 0.60, -0.02)),
    LR('body', [('leg1', (0.11, 0.20, 0.0)), ('knee1', (0.22, 0.23, 0.03))], (0.30, 0.06, 0.10), [0.1, 0.45, -0.01, 0.30, -0.02, 0.12]),
    LR('body', [('leg2', (0.11, 0.20, -0.05)), ('knee2', (0.24, 0.23, -0.07))], (0.36, 0.06, -0.15), [0.1, 0.45, -0.01, 0.30, -0.15, -0.02]),
    LR('body', [('leg3', (0.08, 0.20, -0.17)), ('knee3', (0.17, 0.23, -0.24))], (0.23, 0.06, -0.47), [0.06, 0.45, -0.01, 0.30, -0.55, -0.15]),
    LR('body', [('palp', (0.08, 0.25, 0.12)), ('pel', (0.17, 0.22, 0.15)), ('claw', (0.21, 0.20, 0.25))], (0.20, 0.12, 0.46), [0.06, 0.45, -0.01, 0.40, 0.12, 0.6])),
  # огонёк: дух-капля — тело, голова с хохолком, ручки, «хвост» снизу
  'wisp': rig('wisp', dict(lift=0.75, span=0.45),
    *[B('body', None, (0, 0.22, 0.0)), B('chest', 'body', (0, 0.36, 0.02)), B('head', 'chest', (0, 0.48, 0.07), (0, 0.74, 0.0)),
    B('tailw', 'body', (0, 0.14, -0.01), (0, 0.0, 0.0)),
    LR('chest', [('ash', (0.09, 0.40, 0.04)), ('ael', (0.18, 0.33, 0.06)), ('ahd', (0.24, 0.22, 0.08))], (0.27, 0.13, 0.08), [0.165, 0.4, 0.08, 0.42, -0.2, 0.3])]),
}


def load(src):
    P, N, UV, T, img = glb_rig.load_glb(src)
    comp = glb_rig.components(P, T)
    return P.astype(np.float64), N, UV, T, img, comp


def split(P, T, comp, name):
    roots = np.unique(comp); C = {k: np.array(v) for k, v in CENTERS.items()}
    owner = {}
    for r in roots:
        c = P[comp == r].mean(0); owner[r] = min(C, key=lambda k: np.linalg.norm(C[k] - c))
    vm = np.isin(comp, [r for r in roots if owner[r] == name])
    bad = (vm[T].any(1) & ~vm[T].all(1)).sum()
    assert bad == 0, f'{name}: {bad} треугольников связывают двух зверьков'
    tm = vm[T].all(1); idx = np.where(vm)[0]; rem = -np.ones(len(P), int); rem[idx] = np.arange(len(idx))
    return idx, rem[T[tm]]


def normalize(p, name):
    ax, L = SIZE[name]; a = 'xyz'.index(ax); lo, hi = p.min(0), p.max(0); s = L / (hi[a] - lo[a])
    return (p - [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]) * s


def seg_dist(X, a, b):
    ab = b - a; t = np.clip(((X - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(X - (a + t[:, None] * ab), axis=1)


def weights(P, T, bones, limbs, smooth=int(os.environ.get('PET_SMOOTH', 40)), soft=(), own=()):
    names = [b[0] for b in bones]; par = {b[0]: b[1] for b in bones}; at = {b[0]: np.array(b[2], float) for b in bones}
    kids = {n: [m for m in names if par[m] == n] for n in names}; idx = {n: i for i, n in enumerate(names)}; nb = len(names)
    tip = {b[0]: np.array(b[3], float) if len(b) > 3 else (np.mean([at[k] for k in kids[b[0]]], 0) if kids[b[0]] else at[b[0]]) for b in bones}
    # сварка дублей вершин (швы UV) — граф по позициям
    key = np.round(P * 1e5).astype(np.int64); _, wid = np.unique(key, axis=0, return_inverse=True); wid = wid.ravel(); nW = wid.max() + 1
    Q = np.zeros((nW, 3)); np.add.at(Q, wid, P); Q /= np.bincount(wid, minlength=nW)[:, None]
    E = np.concatenate([wid[T[:, [0, 1]]], wid[T[:, [1, 2]]], wid[T[:, [2, 0]]]]); E = E[E[:, 0] != E[:, 1]]; E = np.unique(np.sort(E, 1), axis=0)
    D = np.stack([seg_dist(Q, at[n], tip[n]) for n in names], 1)
    # кто какую вершину может взять: левые кости — только левую половину, правые — правую;
    # вершина в зоне конечности — только кости этой цепочки и её родителя; нижние звенья конечности — только свою зону
    C = np.ones((nW, nb), bool)
    for n in names:
        if n.endswith('L'): C[Q[:, 0] < 0, idx[n]] = False
        if n.endswith('R'): C[Q[:, 0] >= 0, idx[n]] = False
    inLimb = np.zeros(nW, bool)
    for ch, bx in limbs:
        m = (Q[:, 0] >= bx[0]) & (Q[:, 0] <= bx[1]) & (Q[:, 1] >= bx[2]) & (Q[:, 1] <= bx[3]) & (Q[:, 2] >= bx[4]) & (Q[:, 2] <= bx[5]) & ~inLimb
        ok = np.zeros(nb, bool); ok[[idx[c] for c in ch]] = True
        if par[ch[0]]: ok[idx[par[ch[0]]]] = True
        C[m] &= ok; inLimb |= m
        for c in ch[1:]: C[~m, idx[c]] = False
    # own: (префикс, box) — зона, где берут только кости с этим префиксом и их родителя (шерсть хвоста фенека за бедром —
    # хвостовая, а не лапы, хотя до кости бедра от неё ближе)
    for pre, bx in own:
        m = (Q[:, 0] >= bx[0]) & (Q[:, 0] <= bx[1]) & (Q[:, 1] >= bx[2]) & (Q[:, 1] <= bx[3]) & (Q[:, 2] >= bx[4]) & (Q[:, 2] <= bx[5])
        okb = np.array([n.startswith(pre) or any(par[k] == n and k.startswith(pre) for k in names) for n in names])
        C[np.ix_(m, ~okb)] = False
    C[~C.any(1)] = True
    lab = np.where(C, D, np.inf).argmin(1)
    # сглаживание весов — только между соседями по цепочке (кость, её родитель, её дети)
    adj = np.eye(nb, dtype=bool)
    for n in names:
        if par[n]: adj[idx[n], idx[par[n]]] = adj[idx[par[n]], idx[n]] = True
    W = np.zeros((nW, nb)); W[np.arange(nW), lab] = 1
    allow = adj[lab] & C
    deg = np.bincount(E.ravel(), minlength=nW).astype(float) + 1
    for _ in range(smooth):
        A = W.copy(); np.add.at(A, E[:, 0], W[E[:, 1]]); np.add.at(A, E[:, 1], W[E[:, 0]]); A /= deg[:, None]
        A *= allow; W = A / np.maximum(A.sum(1, keepdims=True), 1e-9)
    # пушистые части (хвост фенека) — ещё мягче: длинная полоса перехода между позвонками, без зубцов по краю
    sm_ = np.isin(np.array(names)[lab], list(soft))
    for _ in range(80 if len(soft) else 0):
        A = W.copy(); np.add.at(A, E[:, 0], W[E[:, 1]]); np.add.at(A, E[:, 1], W[E[:, 0]]); A /= deg[:, None]
        A *= allow; A /= np.maximum(A.sum(1, keepdims=True), 1e-9); W[sm_] = A[sm_]
    # у вершины — не больше одной конечности (лапа или крыло): у корня двух лап остаётся та, чей вес больше
    def chain(n):
        while par[n] and par[n][-1] in 'LR': n = par[n]
        return n if n[-1] in 'LR' else None
    ch = [chain(n) for n in names]; heads = sorted({c for c in ch if c})
    if heads:
        CW = np.stack([W[:, [i for i in range(nb) if ch[i] == h]].sum(1) for h in heads], 1); win = CW.argmax(1)
        for j, h in enumerate(heads):
            cols = [i for i in range(nb) if ch[i] == h]; W[np.ix_(win != j, cols)] = 0
        W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    top = np.argsort(-W, 1)[:, :4]; tw = np.take_along_axis(W, top, 1); tw /= tw.sum(1, keepdims=True)
    SI = top[wid].astype(np.uint8); q = np.round(tw[wid] * 255).astype(int); q[:, 0] += 255 - q.sum(1)
    # треугольник-перемычка между несоседними костями (лапа «прилипла» к груди) — вырезать
    # «совместимые» кости для треугольника: через сустав (кость — родитель — дед, или две кости у одного сустава),
    # но не две разные конечности (левая и правая лапа, лапа и крыло, кулак и бедро — это и есть «прилипшие» полигоны)
    pi = [idx[par[n]] if par[n] else -1 for n in names]
    near = np.eye(nb, dtype=bool)
    for i in range(nb):
        for j in range(nb):
            pa_, pb_ = pi[i], pi[j]
            near[i, j] |= pa_ == j or pb_ == i or (pa_ >= 0 and pa_ == pb_) or (pa_ >= 0 and pi[pa_] == j) or (pb_ >= 0 and pi[pb_] == i)
    def chain0(n):
        while par[n] and par[n][-1] in 'LR': n = par[n]
        return n if n[-1] in 'LR' else None
    c0 = [chain0(n) for n in names]
    side = np.array([c is not None for c in c0])
    # лапа/крыло: только своя цепочка и сустав крепления; кости ствола — между собой через сустав
    comp = np.where(side[:, None] | side[None, :], adj, near) | (near & side[:, None] & side[None, :])
    comp &= ~np.array([[bool(c0[i] and c0[j] and c0[i] != c0[j]) for j in range(nb)] for i in range(nb)])
    labv = W.argmax(1)[wid]; ok = comp[labv[T[:, 0]], labv[T[:, 1]]] & comp[labv[T[:, 1]], labv[T[:, 2]]] & comp[labv[T[:, 0]], labv[T[:, 2]]]
    return SI, q.astype(np.uint8), labv, ok, names, comp, D[wid]


COLLAPSE = 0.012   # м: перемычки длиннее этого стягиваются, короче — отрываются целиком


def closest(p, pts):
    if len(pts) == 1: return np.array(pts[0], float)
    a, b = np.array(pts[0], float), np.array(pts[1], float); ab = b - a
    k = np.clip(np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-12), 0, 1); return a + k * ab


def detach(P, N, UV, SI, SW, T, lab, comp, ok, Dv, cut, mode='detach', pref=None, both=False):
    """Перемычка между двумя разными частями (кулак прижат к бедру, лапа — к груди): треугольник не удаляется (была бы дыра),
    а целиком отдаётся той части, к которой относится большинство его вершин; чужая вершина копируется с весами этой части.
    В покое модель та же, а в движении части расходятся по своему шву, не растягивая кожу между собой."""
    tw = np.unique(np.round(np.asarray(P) / 0.0005).astype(np.int64), axis=0, return_inverse=True)[1].ravel()
    P, N, UV, SI, SW, T = list(P), list(N), list(UV), list(SI), list(SW), T.copy(); cache = {}; drop = set()
    for t in np.where(~ok)[0]:
        v = T[t]; L = [lab[i] for i in v]
        # хозяин — часть, на чьей поверхности лежит треугольник (ближе к оси её кости), а не та, у кого больше вершин:
        # иначе кусок кожи бедра уезжал бы вместе с кулаком
        own = min(set(L), key=lambda b: Dv[v, b].mean())
        # pref (хвост фенека): шерсть хвоста, лежащая на бедре и скакательном суставе, всегда уходит с хвостом, а не с лапой
        if pref is not None and any(pref[b] for b in L): own = min((b for b in set(L) if pref[b]), key=lambda b: Dv[v, b].mean())
        src = next(i for i in v if lab[i] == own)
        mine = [P[i] for i in v if comp[own, lab[i]]]
        a, b, c = (np.asarray(P[i], float) for i in v); e = max(np.linalg.norm(a - b), np.linalg.norm(b - c), np.linalg.norm(c - a))
        thin = np.linalg.norm(np.cross(b - a, c - a)) / max(e * e, 1e-12) < 0.12   # длинная щепка: оторванная, торчит «волоском»
        for j, i in enumerate(v):
            if comp[own, lab[i]]: continue
            # длинная перемычка (кулак — бедро) после отрыва торчала бы осколком: такой треугольник убираем.
            # Он тянется через щель между двумя отдельными телами, поэтому без него в покое видна та же щель, что и в модели
            # (стягивать вершину в точку нельзя: вырожденный треугольник с весами другой кости в движении снова раскрывался «осколком»)
            q = closest(P[i], mine)
            # стягиваются только перемычки к отдельным телам (cut: у фенека — хвост; по умолчанию все): живая кожа брюха
            # между лапами при стягивании дала бы дыру, её оставляем отрываться целиком
            if mode == 'merge' and (cut[own] or cut[lab[i]]):
                # merge (хвост фенека): шерсть хвоста лежит на бедре — это одна поверхность; чужая вершина вместе со всеми
                # копиями по шву UV целиком переходит к хозяину, без копии: ни щели в движении, ни дыры в покое
                for k in np.where(tw == tw[i])[0]: SI[k] = SI[src].copy(); SW[k] = SW[src].copy()
                continue
            if mode == 'cut' and (cut[own] and cut[lab[i]] if both else (thin or cut[own] or cut[lab[i]])) and np.linalg.norm(P[i] - q) > COLLAPSE:
                if os.environ.get('DBG'): print('  collapse', own, lab[i], round(float(np.linalg.norm(P[i] - q)), 3))
                drop.add(int(t)); continue
            key = (int(i), int(own))
            if key not in cache:
                cache[key] = len(P); P.append(P[i]); N.append(N[i]); UV.append(UV[i]); SI.append(SI[src]); SW.append(SW[src])
            T[t, j] = cache[key]
    T = np.delete(T, sorted(drop), 0)
    return np.array(P), np.array(N), np.array(UV), np.array(SI, np.uint8), np.array(SW, np.uint8), T


def drop_islands(P, T, keep=8):
    """Крошечные островки (меньше keep треугольников), которые остались висеть после разрыва перемычек, — убрать:
    в движении они летали рядом с кулаком «осколками»."""
    key = np.round(np.asarray(P) / 0.0005).astype(np.int64); g = np.unique(key, axis=0, return_inverse=True)[1].ravel()
    p = np.arange(g.max() + 1)
    def f(x):
        while p[x] != x: p[x] = p[p[x]]; x = p[x]
        return x
    for a, b in np.concatenate([g[T[:, [0, 1]]], g[T[:, [1, 2]]]]):
        ra, rb = f(a), f(b)
        if ra != rb: p[ra] = rb
    tl = np.array([f(g[t[0]]) for t in T]); u, inv, cnt = np.unique(tl, return_inverse=True, return_counts=True)
    return T[cnt[inv] >= keep], int((cnt < keep).sum())


def write(out, name, P, N, UV, T, SI, SW, bones, extra):
    Nn = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    o = {'pos': P.astype('<f4').tobytes(), 'nrm': np.concatenate([np.round(Nn * 127).astype(np.int8), np.zeros((len(P), 1), np.int8)], 1).tobytes(),
         'uv': np.round(np.clip(UV, 0, 1) * 65535).astype('<u2').tobytes(), 'si': SI.tobytes(), 'sw': SW.tobytes(), 'idx': T.astype('<u2').ravel().tobytes()}
    meta = {'vertices': len(P), 'triangles': len(T), 'tex': 'pets_meshy', 'bones': [[b[0], b[1], [round(float(v), 4) for v in b[2]]] for b in bones], 'layout': {}, **extra}
    buf = b''
    for k in ['pos', 'nrm', 'uv', 'si', 'sw', 'idx']:
        while len(buf) % 4: buf += b'\0'
        meta['layout'][k] = [len(buf), len(o[k])]; buf += o[k]
    open(f'{out}/pet_{name}.bin', 'wb').write(buf); json.dump(meta, open(f'{out}/pet_{name}.json', 'w'), ensure_ascii=False)
    return len(buf)


def build(src, out, only=None):
    P0, N0, UV0, T0, img, comp = load(src)
    img.resize((1024, 1024), Image.LANCZOS).save(f'{out}/pets_meshy.webp', quality=76, method=6)
    res = {}
    for name in RIGS:
        if only and name not in only: continue
        R = RIGS[name]; idx, T = split(P0, T0, comp, name)
        P = normalize(P0[idx], name); N, UV = N0[idx], UV0[idx]
        bones = R['bones']; SI, SW, lab, ok, names, cm, Dv = weights(P, T, bones, R['limbs'], soft=R.get('soft', ()), own=R.get('own', ()))
        P, N, UV, SI, SW, T = detach(P, N, UV, SI, SW, T, lab, cm, ok, Dv, [n[-1] in 'LR' if R.get('cut') == 'limbs' else any(n.startswith(c) for c in R.get('cut', ('',))) for n in names], R.get('bridge', 'detach'),
                                        [n.startswith(R['pref']) for n in names] if 'pref' in R else None,
                                        R.get('cut') == 'limbs')
        T, nisl = drop_islands(P, T) if R.get('bridge') == 'cut' else (T, 0)
        # общий масштаб после рига (суставы заданы в метрах до него): наземные зверьки на 20 % крупнее — сверху их лучше видно
        k = SCALE.get(name, 1.0); P = P * k
        bones = [[b[0], b[1], [v * k for v in b[2]]] + [[v * k for v in t] for t in b[3:]] for b in bones]
        extra = {kk: (v * k if kk in ('lift', 'stride') else v) for kk, v in R.items() if kk not in ('bones', 'limbs', 'soft', 'cut', 'bridge', 'pref', 'own')}
        extra['height'] = round(float(P[:, 1].max()), 3)
        size = write(out, name, P, N, UV, T, SI, SW, bones, extra)
        print(f'{name}: {len(P)} вершин, {len(T)} треуг. (разъединено перемычек {int((~ok).sum())}, убрано островков {nisl}), {size // 1024} КБ')
        res[name] = dict(P=P, UV=UV, T=T, lab=lab, names=names, bones=bones)
    return res, img


if __name__ == '__main__':
    out = sys.argv[2] if len(sys.argv) > 2 else 'assets/models'
    build(sys.argv[1], out, sys.argv[3].split(',') if len(sys.argv) > 3 else None)
