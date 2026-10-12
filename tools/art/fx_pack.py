# Запуск: python3 -I tools/art/fx_pack.py <распакованный dark_ascent_assets_in_progress> assets/art/fx
# Листы эффектов от GPT (атаки мобов по краям + навыки героя) -> игра. Что делает:
#  - чёрный фон («blend: add») -> альфа, как tools/art/fx_mobs_prep.py (оверлей прозрачный, сложение на светлой траве выцветало);
#  - ПК: кадр 192 px (нарисовано 256), WebP q75; телефон: кадр 128 px в assets/art/fx/m/ — вчетверо меньше видеопамяти и трафика;
#    размер кадра игра считает по ширине картинки (render/fxsheets.js), поле cell в json — как нарисовано;
#  - узоры телеграфов (тайлы): ПК 384, телефон 256;
#  - пустые в архиве листы (fr_shield_stomp, tm_sand_nova, fr_tele_pattern) собираются из fx_src/;
#  - mob_bite/claw/gore/charge_* уже подготовлены fx_mobs_prep.py — для них только телефонная копия.
#  - --new (полный комплект, сборка 66): только листы, которых ещё нет в assets/art/fx/*.json, уже настроенные не трогаем;
#  - у листов из DARK GPT нарисовал тёмную фигуру героя/врага (лёд вокруг неё) или чёрную сердцевину молнии — тёмное гасится в прозрачность.
import sys, json, os
from PIL import Image
import numpy as np
args = [a for a in sys.argv[1:] if not a.startswith('--')]; ONLY_NEW = '--new' in sys.argv
src, dst = args[0], args[1]
os.makedirs(dst + '/m', exist_ok=True)
SRCJ = src + '/assets/art/fx/'
mobs = json.load(open(SRCJ + 'fx_mobs.json')); hero = json.load(open(SRCJ + 'fx.json'))
old = json.load(open(dst + '/fx_mobs.json'))   # уже настроенные mob_* (якоря, режим полосы)
old_hero = json.load(open(dst + '/fx.json'))
DARK = {'st_ice_armor', 'st_frozen', 'sk_thunder_strike'}
# сборка 66: точка касания земли у «объёмных» листов полного комплекта (в json GPT у всех 0.5 — эффект висел над землёй)
ANCHOR = {'sk_shatter': .85, 'sk_frost_nova_spikes': .86, 'st_shock': .86, 'sk_thunder_strike': .88, 'sv_levelup': .86, 'gr_burning_ground_flames': .85, 'st_burning': .85,
          'sk_burn_explode': .85, 'sk_meteor_impact': .82, 'st_chill': .85, 'st_frozen': .88, 'sv_evo_sky_wrath': .88, 'sk_meteor_fall': .75}
for k, v in ANCHOR.items():
  if k in hero: hero[k]['anchor'] = [0.5, v]

def black_to_alpha(rgb):
  rgb = rgb.astype(np.float32); a = rgb.max(-1); a = np.where(a < 6, 0, a)
  out = np.zeros(rgb.shape[:2] + (4,), np.float32)
  nz = a > 0; out[..., :3][nz] = rgb[nz] * 255.0 / a[nz][:, None]; out[..., 3] = a
  return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')

def load(id_, m):
  p = SRCJ + id_ + '.webp'
  if os.path.getsize(p) > 0: return Image.open(p)
  for alt in (f'{src}/fx_src/{id_}_normalized.png', f'{src}/fx_src/{id_}_source.png'):
    if os.path.exists(alt): print('  из fx_src:', os.path.basename(alt)); return Image.open(alt)
  raise SystemExit('нет листа ' + id_)

def save(im, path, q): im.save(path, 'WEBP', quality=q, method=4, exact=False)
def prep(im, m, id_=''):
  if not (im.mode == 'RGBA' and (np.asarray(im)[..., 3] < 10).mean() > 0.3): im = black_to_alpha(np.asarray(im.convert('RGB')))   # иначе уже с прозрачностью (сборка 66: RGBA с непрозрачным чёрным фоном — тоже в альфу)
  if id_ in DARK:
    a = np.asarray(im.convert('RGBA')).astype(np.float32); v = a[..., :3].max(-1); a[..., 3] *= np.clip((v - 70) / 90, 0, 1)
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
  if m.get('view') != 'upright': return im
  # «объёмные» листы у GPT упираются в нижний край кадра — в игре был виден ровный срез; гасим нижние 12 % кадра плавно
  a = np.asarray(im).copy(); C = m['cell']; f = np.ones(C, np.float32); n = int(C * 0.12); f[C - n:] = np.linspace(1, 0, n)
  a[..., 3] = (a[..., 3].reshape(m['rows'], C, -1) * f[None, :, None]).reshape(a.shape[:2]).astype(np.uint8)
  return Image.fromarray(a, 'RGBA')

stats = [0, 0, 0]
def emit(id_, m):
  im = load(id_, m)
  if m.get('tile'):
    im = im.convert('RGBA'); big = im.resize((384, 384), Image.LANCZOS)
    save(big, f'{dst}/{id_}.webp', 80); save(big.resize((256, 256), Image.LANCZOS), f'{dst}/m/{id_}.webp', 80)
  else:
    C, cols, rows = m['cell'], m['cols'], m['rows']; W, H = C * cols, C * rows
    if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
    im = prep(im, m, id_); save(im.resize((W * 3 // 4, H * 3 // 4), Image.LANCZOS), f'{dst}/{id_}.webp', 75)
    save(im.resize((W // 2, H // 2), Image.LANCZOS), f'{dst}/m/{id_}.webp', 75)
  stats[0] += os.path.getsize(SRCJ + id_ + '.webp'); stats[1] += os.path.getsize(f'{dst}/{id_}.webp'); stats[2] += os.path.getsize(f'{dst}/m/{id_}.webp')

def job(t):
  id_, m = t
  if id_.startswith('mob_'):   # готовые листы игры: только телефонная копия
    im = Image.open(f'{dst}/{id_}.webp'); save(im.resize((im.width // 2, im.height // 2), Image.LANCZOS), f'{dst}/m/{id_}.webp', 75); return [0, 0, 0]
  stats[:] = [0, 0, 0]; emit(id_, m); return list(stats)
from multiprocessing import Pool
todo = [(k, m) for J in (mobs, hero) for k, m in J.items() if 'same' not in m and not (ONLY_NEW and (k in old or k in old_hero))]
for k, m in todo:
  if not k.startswith('mob_'): m['file'] = 'assets/art/fx/' + k + '.webp'
with Pool() as pool: stats = [sum(x) for x in zip(*pool.map(job, todo))] if todo else [0, 0, 0]
for k in old: mobs[k] = old[k]
if ONLY_NEW:
  for k in old_hero: hero[k] = old_hero[k]
print('листов:', len(todo))
json.dump(mobs, open(dst + '/fx_mobs.json', 'w'), ensure_ascii=False, indent=1)
json.dump(hero, open(dst + '/fx.json', 'w'), ensure_ascii=False, indent=1)
print('исходные %.1f МБ -> ПК %.1f МБ, телефон %.1f МБ' % tuple(x / 1e6 for x in stats))
