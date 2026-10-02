#!/usr/bin/env python3
"""Генератор большой деревни для 3D-режима (assets/maps/village_big.json): 64×64, всё раздвинуто на «диабловские» расстояния.
Запуск: python3 tools/level/gen_village_big.py   (детерминирован). Старая деревня 40×40 (village.json) нужна только 2D-запасному режиму."""
import json, math, random
W = H = 64
R = random.Random(42)
g = [['x' if (x < 3 or y < 3 or x >= W - 3 or y >= H - 3) else '.' for x in range(W)] for y in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and g[y][x] != 'x' or (c == 'x' and 0 <= x < W and 0 <= y < H): g[y][x] = c
def disc(cx, cy, r, c):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r and 3 <= x < W - 3 and 3 <= y < H - 3: g[y][x] = c
def road(a, b, w=1.6, c=','):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
    for i in range(n + 1):
        t = i / n; x = a[0] + (b[0] - a[0]) * t + math.sin(t * 6.2 + a[0]) * 0.8; y = a[1] + (b[1] - a[1]) * t + math.cos(t * 5.1 + a[1]) * 0.6
        disc(x, y, w, c)
P = {'plaza': (32, 31), 'start': (32, 57), 'K': (11, 13), 'D': (24, 14), 'C': (36, 8), 'F': (54, 14), 'H': (49, 32), 'S': (50, 52), 'L': (12, 52)}
# дороги: от площади во все стороны, к каждому порталу
disc(*P['plaza'], 6.2, '#')
for k in ('K', 'D', 'C', 'F', 'H', 'S', 'L'): road(P['plaza'], P[k])
road(P['plaza'], P['start'], 1.9)
road((40, 40), (48, 44), 1.2); road((20, 36), (10, 38), 1.2)
# пруд и лесные пятна (не на дорогах)
disc(10, 40, 3.2, '~'); disc(8, 41, 2.2, '~')
for _ in range(34):
    cx, cy, r = R.randint(6, W - 7), R.randint(6, H - 7), R.uniform(1.4, 3.4)
    if all(math.hypot(cx - px, cy - py) > 11 for px, py in P.values()) and not any(g[int(cy + dy)][int(cx + dx)] in ',#~' for dy in range(-4, 5, 2) for dx in range(-4, 5, 2) if 0 <= cy + dy < H and 0 <= cx + dx < W):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                if 0 <= x < W and 0 <= y < H and math.hypot(x - cx, y - cy) <= r * R.uniform(0.7, 1.1) and g[y][x] == '.': g[y][x] = 'x'
rows = [''.join(r) for r in g]
obj = []
def O(t, x, y, **k): obj.append({'t': t, 'x': round(x, 2), 'y': round(y, 2), **k})
O('portal', 11.5, 13.5)                      # катакомбы (id portal_town)
O('well', 32, 31)
O('board', 36.5, 25.5)
O('forge', 43.5, 24.0); O('barrel', 41.2, 22.4); O('crate', 40.4, 23.4); O('hay', 46.4, 26.6)
O('stall', 20.5, 36.5); O('barrel', 18.6, 35.6); O('crate', 22.8, 38.0)
O('house_1', 56.5, 24)                           # таверна (крупный дом) на востоке; рядом скамья Гадалки
O('logpile', 51.4, 28.6); O('barrel', 53.4, 28.0)
O('house_0', 8, 26); O('house_2', 44, 17); O('house_0', 22, 49); O('house_2', 40, 55); O('house_0', 24, 22)
for i in range(7): O('fence_x', 6.5 + i, 29.8)
for gx, gy in [(5, 19), (6.5, 19.8), (8, 19), (5.6, 21.4), (7.2, 22), (8.8, 21.2)]: O('grave', gx, gy)   # кладбище у входа в катакомбы
O('deadtree', 4.5, 22.5); O('deadtree', 9.5, 18)
for lx, ly in [(28, 27), (36, 27), (28, 36), (36, 36), (32, 45), (32, 52), (22, 24), (26, 17), (44, 30), (44, 34), (17, 34), (14, 20), (40, 12), (50, 46), (19, 46)]: O('lamp', lx, ly)
for bx, by in [(29.5, 25.5), (34.5, 25.5), (30, 38), (35, 38)]: O('banner', bx, by)
O('statue', 32, 36.5)
O('shrine', 41.5, 46.0)                         # святилище на дороге к Жатве
# деревья-акценты вне троп (свободные места)
def free(x, y, m=1): return all(0 <= int(y + dy) < H and 0 <= int(x + dx) < W and g[int(y + dy)][int(x + dx)] == '.' for dy in range(-m, m + 1) for dx in range(-m, m + 1))
placed = [(o['x'], o['y']) for o in obj]
n = tries = 0
while n < 70 and tries < 20000:
    tries += 1
    x, y = R.uniform(5, W - 5), R.uniform(5, H - 5)
    if free(x, y, 1) and all(math.hypot(x - px, y - py) > 3.4 for px, py in placed) and all(math.hypot(x - px, y - py) > 4.5 for px, py in P.values()): O(R.choice(['tree_0', 'tree_1', 'tree_0']), x, y); placed.append((x, y)); n += 1
for _ in range(300):
    if sum(1 for o in obj if o['t'] == 'rocks') >= 14: break
    x, y = R.uniform(5, W - 5), R.uniform(5, H - 5)
    if free(x, y, 1) and all(math.hypot(x - px, y - py) > 3 for px, py in placed): O('rocks', x, y); placed.append((x, y))
npcs = [
  {'id': 'elder', 'name': 'Староста Эдрик', 'x': 33.8, 'y': 27.4, 'model': 'npc_elder'},
  {'id': 'smith', 'name': 'Кузнец Горан', 'x': 42.2, 'y': 25.6, 'model': 'npc_smith'},
  {'id': 'merchant', 'name': 'Торговка Мира', 'x': 22.4, 'y': 35.4, 'model': 'npc_merchant'},
  {'id': 'trainer', 'name': 'Наставник Элвин', 'x': 26.0, 'y': 40.5, 'model': 'npc_trainer'},
  {'id': 'fortune', 'name': 'Гадалка Фортуна', 'x': 51.2, 'y': 27.6, 'model': 'npc_fortune'},
]
out = {'w': W, 'h': H, 'rows': rows, 'objects': obj, 'npcs': npcs, 'start': [32.5, 57.5], 'name': 'Деревня Ордена', 'floor': {'w': 0, 'h': 0, 'scale': 1, 'ox': 0, 'chunks': []},
       'big': {'castle': [36.5, 9.0], 'survportal': [50.5, 52.5], 'depths': [24.5, 14.5], 'fjord': [54.5, 14.5], 'forest': [12.5, 52.5], 'hwsign': [49.0, 32.5]}}
json.dump(out, open('assets/maps/village_big.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(obj), 'objects')
