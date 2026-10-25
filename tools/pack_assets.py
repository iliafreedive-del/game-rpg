#!/usr/bin/env python3
# Сборка 66: картинки в копии игры для архива (tools/build_zip.sh) — в репозитории ничего не меняется.
#   1. Листы эффектов (assets/art/fx, fx/m): WebP заново, прозрачность — с потерями (alpha_quality); одинаковые листы — один файл.
#   2. Нарисованный арт GPT: фоны .jpg → .webp, значки навыков/даров/Жатвы и портреты классов (.png без прозрачности) → .jpg 4:4:4,
#      победа/поражение и зелья (.png с прозрачностью) → .webp. Пути в коде меняются по точному списку замен (GROUPS);
#      если хоть одна замена не нашлась или после замены остался старый путь — группа остаётся как была (картинки и код).
#   3. Текстуры шкур (assets/models/*.webp) — WebP заново.
#   4. Файлы, на которые ничего не ссылается (DEAD) — убираются (проверяется: имени нет ни в коде, ни в стилях, ни в json).
# Каждый файл берётся новым, только если он меньше старого. python3 tools/pack_assets.py <папка копии>
import sys, os, re, io, glob, json, hashlib
from multiprocessing import Pool
from PIL import Image

ROOT = sys.argv[1]
A = lambda *p: os.path.join(ROOT, 'assets', *p)
FX_PC = dict(quality=78, alpha_quality=70, method=6)     # кадр 192: PSNR ≥ 37 дБ к нынешнему листу (на чёрном фоне)
FX_M = dict(quality=76, alpha_quality=65, method=6)      # телефонные копии, кадр 128
BG = dict(quality=82, method=6)                          # фоны 1920×1080: титул, Летопись, Жатва, смерть
VEIL = dict(quality=78, method=6)                        # картинки зон под тёмной шторкой «Загрузка…» и в шапках окон
ICON = dict(quality=92, subsampling=0, optimize=True)    # значки 256 px: JPEG 4:4:4 (у WebP цвет мелких деталей «плывёт»)
ICON_S = dict(ICON, quality=88, side=192)               # сборка 75: значки навыков/даров/Жатвы — 192 px (на экране ≤ 68 px, ×3 на телефоне ≈ 200): вдвое легче
ALPHA = dict(quality=85, alpha_quality=90, method=6)
SKIN = dict(quality=78, method=6)                        # текстуры шкур 1024 (на телефоне игра сама уменьшает до 512)

def size(p): return os.path.getsize(p) if os.path.exists(p) else 0
def text_files():
    out = [os.path.join(ROOT, 'index.html')] + glob.glob(os.path.join(ROOT, 'css', '*.css'))
    for d in glob.glob(os.path.join(ROOT, 'js*')):
        if os.path.isdir(d): out += glob.glob(os.path.join(d, '**', '*.js'), recursive=True)
    return [f for f in out if os.path.exists(f)]
TXT = {f: open(f, encoding='utf8').read() for f in text_files()}
for f in glob.glob(A('**', '*.json'), recursive=True): TXT.setdefault(f, open(f, encoding='utf8').read())
CHANGED = set()

def encode(job):   # (src, dst, fmt, kw, keep_if_bigger)
    src, dst, fmt, kw, force = job
    im = Image.open(src); im.load()
    kw = dict(kw); side = kw.pop('side', 0)
    if side and max(im.size) > side: im = im.resize((side, side * im.size[1] // im.size[0]), Image.LANCZOS)   # сборка 75: значки 256 → 192
    if fmt == 'JPEG': im = im.convert('RGB')
    elif im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA')
    b = io.BytesIO(); im.save(b, fmt, **kw); data = b.getvalue()
    if not force and len(data) >= size(src): return src, dst, 0
    open(dst, 'wb').write(data)
    return src, dst, len(data)

# ---------------------------------------------------------------- 4. мёртвые файлы
DEAD = ['art/gpt/store/cover_800x470.jpg', 'art/gpt/store/cover_logo_800x470.jpg',   # обложки для страницы игры в каталоге, не для игры
        'art/gpt/ui/energy_32.png', 'art/gpt/ui/gold_32.png', 'art/gpt/ui/shard_32.png', 'art/gpt/ui/shard_drop.png', 'art/gpt/ui/shard_pile_128.png']
words = set(re.findall(r'[A-Za-z0-9_\-]+', '\n'.join(TXT.values())))
freed = 0
for d in DEAD:
    p = A(d); stem = os.path.basename(d).split('.')[0]
    if os.path.exists(p) and stem not in words: freed += size(p); os.remove(p)
    elif os.path.exists(p): print('  оставлен (есть ссылка):', d)
print(f'мёртвые файлы: −{freed / 1e6:.2f} МБ')

# ---------------------------------------------------------------- 1. листы эффектов
jobs = []
fxj = [A('art', 'fx', 'fx.json'), A('art', 'fx', 'fx_mobs.json')]
metas = {f: json.loads(TXT[f]) for f in fxj if f in TXT}
def h(p): return hashlib.md5(open(p, 'rb').read()).hexdigest() if os.path.exists(p) else None
first, dup = {}, {}
for f in sorted(glob.glob(A('art', 'fx', '*.webp'))):
    k = (h(f), h(A('art', 'fx', 'm', os.path.basename(f))))
    if k in first: dup[os.path.basename(f)] = first[k]
    else: first[k] = os.path.basename(f)
for name, to in dup.items():   # одинаковые листы (sv_evo_sky_wrath = hit_fire_explosion): ссылка в json на первый, копия удаляется
    for f, J in metas.items():
        for m in J.values():
            if isinstance(m, dict) and str(m.get('file', '')).endswith('/' + name): m['file'] = m['file'][:-len(name)] + to
    for p in (A('art', 'fx', name), A('art', 'fx', 'm', name)):
        if os.path.exists(p): freed += size(p); os.remove(p)
for f, J in metas.items():
    if dup: TXT[f] = json.dumps(J, ensure_ascii=False, separators=(',', ':')); CHANGED.add(f)
print('одинаковые листы:', dup or 'нет')
for f in glob.glob(A('art', 'fx', '*.webp')): jobs.append((f, f, 'WEBP', FX_PC, False))
for f in glob.glob(A('art', 'fx', 'm', '*.webp')): jobs.append((f, f, 'WEBP', FX_M, False))
for f in glob.glob(A('models', '*.webp')): jobs.append((f, f, 'WEBP', SKIN, False))

# ---------------------------------------------------------------- 2. арт GPT со сменой расширения
G = 'art/gpt/'
GROUPS = [   # (картинки, новое расширение, формат, настройки, [(файлы кода — подстрока пути, было, стало)], старый путь — регулярка для проверки)
    ('skills/*.png', '.jpg', 'JPEG', ICON_S, [('ui/art.js', 'skills/${id}.png', 'skills/${id}.jpg'), ('ui/art.js', 'skills/branch_${id}.png', 'skills/branch_${id}.jpg')], r'skills/[^\'"`\s)]*\.png'),
    ('boons/*.png', '.jpg', 'JPEG', ICON_S, [('ui/art.js', 'boons/${id}.png', 'boons/${id}.jpg')], r'boons/[^\'"`\s)]*\.png'),
    ('harvest/*.png', '.jpg', 'JPEG', ICON_S, [('ui/art.js', 'harvest/perk_${id}.png', 'harvest/perk_${id}.jpg'), ('ui/art.js', 'harvest/${id}.png', 'harvest/${id}.jpg')], r'harvest/[^\'"`\s)]*\.png'),
    ('heroes/*.png', '.jpg', 'JPEG', ICON, [('main.js', 'heroes/${id}.png', 'heroes/${id}.jpg')], r'heroes/[^\'"`\s)]*\.png'),
    ('items/*.png', '.webp', 'WEBP', ALPHA, [('ui/art.js', 'items/${id}.png', 'items/${id}.webp')], r'items/[^\'"`\s)]*\.png'),
    ('hw/*.png', '.webp', 'WEBP', ALPHA, [('ui/art.js', "hw/${win ? 'victory' : 'defeat'}.png", "hw/${win ? 'victory' : 'defeat'}.webp")], r"'defeat'\}\.png"),
    ('hw/*.jpg', '.webp', 'WEBP', BG, [('ui/art.js', "hw/ch${ch}_${v}_${port ? 'port' : 'land'}.jpg", "hw/ch${ch}_${v}_${port ? 'port' : 'land'}.webp"), ('ui/art.js', 'hw/banner_ch${ch}.jpg', 'hw/banner_ch${ch}.webp')], r'hw/[^\'"`\s)]*\.jpg'),
    ('harvest/*.jpg', '.webp', 'WEBP', BG, [('ui/art.js', 'harvest/${k}.jpg', 'harvest/${k}.webp')], r'harvest/\$\{k\}\.jpg'),   # значки Жатвы уже .jpg (группа выше)
    ('start/*.jpg', '.webp', 'WEBP', BG, 're:' + r'(art/gpt/start/[a-z_]+)\.jpg', r'start/[^\'"`\s)]*\.jpg'),
    ('battle/*.jpg', '.webp', 'WEBP', BG, 're:' + r'(art/gpt/battle/[a-z_]+)\.jpg', r'battle/[^\'"`\s)]*\.jpg'),
    ('zones/*.jpg', '.webp', 'WEBP', VEIL, [('ui/art.js', "zones/${id}_${port ? 'port' : 'land'}.jpg", "zones/${id}_${port ? 'port' : 'land'}.webp"), ('render/index.js', "z + '_land.jpg'", "z + '_land.webp'"), ('render/index.js', "z + '_port.jpg'", "z + '_port.webp'")], r"zones/[^'\"`\s)]*\.jpg|_(land|port)\.jpg"),
]
code = {f: t for f, t in TXT.items() if not f.endswith('.json')}
for pat, ext, fmt, kw, subs, old in GROUPS:
    files = sorted(glob.glob(A(*(G + pat).split('/'))))
    if not files: continue
    new = dict(code); ok = True
    if isinstance(subs, str):   # регулярка по всем файлам кода
        rx = re.compile(subs[3:]); hits = 0
        for f, t in new.items():
            t2, n = rx.subn(lambda m: m.group(1) + ext, t); hits += n; new[f] = t2
        ok = hits > 0
    else:
        for part, a, b in subs:
            tgt = [f for f in new if f.replace(os.sep, '/').endswith('/' + part)]
            if not tgt or any(a not in new[f] for f in tgt): ok = False; break
            for f in tgt: new[f] = new[f].replace(a, b)
    if ok and any(re.search(old, t) for t in new.values()): ok = False
    if not ok: print('  НЕ ТРОНУТО (пути в коде не совпали):', pat); continue
    for f in new:
        if new[f] != code[f]: CHANGED.add(f)
    code = new
    for f in files: jobs.append((f, f[: f.rfind('.')] + ext, fmt, kw, True))
TXT.update(code)

before = sum(size(j[0]) for j in jobs)
with Pool() as pool:
    res = pool.map(encode, jobs, chunksize=2)
for src, dst, n in res:
    if n and dst != src: os.remove(src)
after = sum(n if n else size(src) for src, dst, n in res)
for f in CHANGED: open(f, 'w', encoding='utf8').write(TXT[f])
print(f'картинки: {len(jobs)} файлов, {before / 1e6:.1f} → {after / 1e6:.1f} МБ; правок в коде: {len(CHANGED)} файлов')
