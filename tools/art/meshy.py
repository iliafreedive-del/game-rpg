#!/usr/bin/env python3
"""Картинка → 3D-модель через Meshy API (только Image to 3D: форма + текстура, без рига — риг делается вручную).

  MESHY_API_KEY=… python3 tools/art/meshy.py <картинка.png|jpg|webp> <имя> [--polycount 3000] [--tex 1024] [--prompt "текст для текстуры"]
  python3 tools/art/meshy.py --resume <имя>        # дождаться/докачать уже запущенную задачу (id берётся из журнала)
  … --rig wolf_grey                                 # сразу взять скелет и анимации готового зверя (tools/art/rig_transfer.mjs)
  python3 tools/art/meshy.py --local art_meshy/raw/<имя>.glb <имя> --rig wolf_grey   # GLB скачан вручную из кабинета Meshy
  python3 tools/art/meshy.py --remesh <имя> --polycount 3000 --rig wolf_grey   # упростить уже готовую модель (Meshy Remesh, та же форма)

Размер: 3000 треугольников (как волк и герои) — по умолчанию; --tex 512 — текстура для мелочи (собаки, куры, жители).

Что делает:
  1. картинка → PNG (webp Meshy может не принять) → data URI → POST /openapi/v1/image-to-3d;
  2. ждёт готовности (опрос раз в 10 с), id задачи сразу пишется в tools/art/meshy_tasks.json — если связь оборвалась, --resume;
  3. скачивает GLB как есть → art_meshy/raw/<имя>.glb (для рига: загрузить в Meshy/Blender, ригнуть, анимации);
  4. сжимает для игры (glb_pack.py: текстура JPEG, компактные числа) → assets/models/<имя>.glb.
Модель без скелета игра показывает как есть (glbmob.js: «статичная» модель, движение — покачиванием корпуса);
когда придёт ригнутая GLB с тем же именем (после glb_pack.py) — тот же код возьмёт скелет и ходьбу из файла.
"""
import sys, os, json, time, base64, argparse, subprocess, urllib.request

API = 'https://api.meshy.ai/openapi/v1/image-to-3d'
REMESH = 'https://api.meshy.ai/openapi/v1/remesh'
TEX = 1024
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG = os.path.join(ROOT, 'tools/art/meshy_tasks.json')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glb_pack import main as pack


def req(url, body=None):
    key = os.environ.get('MESHY_API_KEY') or sys.exit('нет MESHY_API_KEY в окружении')
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method='POST' if body else 'GET',
                               headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=120) as f: return json.loads(f.read())


def log_get():
    return json.load(open(LOG)) if os.path.exists(LOG) else {}


def log_put(name, rec):
    j = log_get(); j[name] = {**j.get(name, {}), **rec}
    json.dump(j, open(LOG, 'w'), ensure_ascii=False, indent=1)


def start(img, name, a):
    png = subprocess.run(['convert', img, 'png:-'], capture_output=True, check=True).stdout
    body = {
        'image_url': 'data:image/png;base64,' + base64.b64encode(png).decode(),
        'ai_model': a.model, 'topology': 'triangle', 'target_polycount': a.polycount, 'should_remesh': True,
        'should_texture': True, 'enable_pbr': False, 'symmetry_mode': a.symmetry,
    }
    if a.prompt: body['texture_prompt'] = a.prompt
    if a.pose: body['pose_mode'] = a.pose
    tid = req(API, body)['result']
    log_put(name, {'task': tid, 'image': os.path.relpath(os.path.abspath(img), ROOT), 'model': a.model, 'polycount': a.polycount, 'started': time.strftime('%Y-%m-%d %H:%M')})
    print('задача', tid); return tid


def rig(name, donor):
    dst = os.path.join(ROOT, 'assets/models', name + '.glb')
    subprocess.run(['node', os.path.join(ROOT, 'tools/art/rig_transfer.mjs'), os.path.join(ROOT, 'assets/models', donor + '.glb'), dst, dst], check=True)
    pack(dst, dst, TEX)   # перенос пишет числа float — сжать снова
    log_put(name, {'rig': donor})


def local(src, name, donor):
    dst = os.path.join(ROOT, 'assets/models', name + '.glb'); pack(src, dst, TEX)
    if donor: rig(name, donor)


def remesh(name, polycount):
    src = log_get()[name]['task']
    tid = req(REMESH, {'input_task_id': src, 'target_formats': ['glb'], 'topology': 'triangle', 'target_polycount': polycount})['result']
    log_put(name, {'remesh': tid, 'polycount': polycount}); print('упрощение', tid); return tid


def finish(name, tid, donor=None, api=API):
    while True:
        t = req(f'{api}/{tid}'); st = t.get('status')
        print(f'  {st} {t.get("progress", 0)}%', flush=True)
        if st == 'SUCCEEDED': break
        if st in ('FAILED', 'CANCELED', 'EXPIRED'): sys.exit(f'Meshy: {st} {t.get("task_error")}')
        time.sleep(10)
    raw = os.path.join(ROOT, 'art_meshy/raw', name + '.glb'); os.makedirs(os.path.dirname(raw), exist_ok=True)
    urllib.request.urlretrieve(t['model_urls']['glb'], raw)
    if t.get('thumbnail_url'): urllib.request.urlretrieve(t['thumbnail_url'], os.path.join(ROOT, 'art_meshy/raw', name + '_thumb.png'))
    dst = os.path.join(ROOT, 'assets/models', name + '.glb'); pack(raw, dst, TEX)
    log_put(name, {'done': time.strftime('%Y-%m-%d %H:%M'), 'raw': os.path.relpath(raw, ROOT), 'glb': os.path.relpath(dst, ROOT)})
    if donor: rig(name, donor)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('image', nargs='?'); p.add_argument('name', nargs='?')
    p.add_argument('--resume'); p.add_argument('--local'); p.add_argument('--rig', help='имя ригнутого донора в assets/models (wolf_grey)'); p.add_argument('--polycount', type=int, default=3000)
    p.add_argument('--remesh'); p.add_argument('--tex', type=int, default=1024, help='размер текстуры, px')
    p.add_argument('--model', default='latest'); p.add_argument('--symmetry', default='auto')
    p.add_argument('--prompt'); p.add_argument('--pose', help='a-pose / t-pose — для двуногих')
    a = p.parse_args(); TEX = a.tex
    if a.remesh: finish(a.remesh, remesh(a.remesh, a.polycount), a.rig, REMESH)
    elif a.resume:   # было упрощение — докачивается оно
        rec = log_get()[a.resume]; finish(a.resume, rec.get('remesh') or rec['task'], a.rig, REMESH if rec.get('remesh') else API)
    elif a.local: local(a.local, a.image or a.name, a.rig)
    else:
        if not (a.image and a.name): p.error('нужны картинка и имя')
        finish(a.name, start(a.image, a.name, a), a.rig)
