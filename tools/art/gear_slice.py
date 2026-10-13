# Нарезка листов иконок экипировки (Glif, 5×5 на белом фоне) → assets/art/gpt/gear/<вид>_<редкость>.webp
# python3 tools/art/gear_slice.py weapons.jpg armor.jpg [папка_вывода]
# Строки листа — виды вещей, столбцы — редкость 0–4 (серое, зелёное, синее, золотое, мифическое).
# Фон: белый, связанный с краем клетки (белые блики внутри предмета остаются). Предмет обрезается по рамке и
# вписывается в квадрат почти целиком, чтобы заполнять ячейку инвентаря.
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROWS = [['sword', 'greatsword', 'axe', 'bow', 'staff'], ['hood', 'helm', 'vest', 'plate', 'amulet']]
SIZE, FILL, T = 192, 0.96, 42   # сторона иконки, доля заполнения, порог «не белого»


def slice_sheet(path, names, out, n=5, inset=14):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    H, W = im.shape[:2]
    for r in range(n):
        for c in range(n):
            # своя клетка листа без тонких рамок по краю (их рисует генератор)
            y0, y1 = int(r * H / n) + inset, int((r + 1) * H / n) - inset
            x0, x1 = int(c * W / n) + inset, int((c + 1) * W / n) - inset
            cell = im[y0:y1, x0:x1]
            d = (255 - cell).max(axis=2)             # насколько пиксель темнее белого
            lab, _ = ndimage.label(d < T)
            edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
            bg = np.isin(lab, edge[edge > 0])        # фон = белое, связанное с краем клетки
            # большие замкнутые белые пятна (между тетивой и луком) — тоже фон; мелкие блики остаются
            hl, hn = ndimage.label((d < 60) & ~bg)
            if hn: hs = ndimage.sum(np.ones_like(d), hl, range(1, hn + 1)); bg |= np.isin(hl, [i + 1 for i, v in enumerate(hs) if v > 400])
            fg = ndimage.binary_opening(~bg, iterations=2)
            comp, nc = ndimage.label(fg)
            if not nc: print('ПУСТО', names[r], c); continue
            sizes = ndimage.sum(fg, comp, range(1, nc + 1))
            m = np.isin(comp, [i + 1 for i, s in enumerate(sizes) if s >= max(60, sizes.max() * 0.002)])
            m = ndimage.binary_dilation(m, iterations=3)
            ys, xs = np.nonzero(m)
            # плотное тело предмета (с бликами внутри) — непрозрачно; свечение и кромка — полупрозрачны по «небелости»
            core = ndimage.binary_fill_holes(ndimage.binary_closing(d > 90, iterations=2)) & ~bg
            a = np.where(ndimage.binary_erosion(core, iterations=1), 1.0, np.clip(d / 110, 0, 1) * m)
            sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
            a, rgb = a[sl], cell[sl]
            # убрать белый ореол: цвет = (c − (1−a)·255) / a
            a3 = np.maximum(a[..., None], 1e-3)
            rgb = np.clip((rgb - (1 - a3) * 255) / a3, 0, 255)
            tile = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA')
            s = SIZE * FILL / max(tile.size)
            tile = tile.resize((max(1, round(tile.width * s)), max(1, round(tile.height * s))), Image.LANCZOS)
            sq = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            sq.paste(tile, ((SIZE - tile.width) // 2, (SIZE - tile.height) // 2))
            sq.save(os.path.join(out, f'{names[r]}_{c}.webp'), 'WEBP', quality=82, method=6)


if __name__ == '__main__':
    out = sys.argv[3] if len(sys.argv) > 3 else 'assets/art/gpt/gear'
    os.makedirs(out, exist_ok=True)
    for path, names in zip(sys.argv[1:3], ROWS): slice_sheet(path, names, out)
