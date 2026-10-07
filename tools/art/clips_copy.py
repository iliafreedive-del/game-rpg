#!/usr/bin/env python3
"""Перенести клипы ходьбы и бега (meta.clips из glb_mixamo.py) с одной шкуры героя на другую — по именам костей рига.
python3 tools/art/clips_copy.py <откуда> <куда>   (например: mage_staff archer_raven)
Клипы — повороты костей в пространстве модели относительно покоя, поэтому годятся любой шкуре на том же риге (_hero.js).
Длина шага и качание таза пересчитываются по длине ног получателя. Кости получателя без пары (nock у лучника) — без поворота.
Запускать заново после пересборки получателя через glb_rig.py (он клипы не пишет).
"""
import sys, json

src, dst = sys.argv[1], sys.argv[2]
S = json.load(open(f'assets/models/{src}.json')); D = json.load(open(f'assets/models/{dst}.json'))
leg = lambda m: (lambda b: b['legL'][1] - b['footL'][1])({n: a for n, _, a in m['bones']})
k = leg(D) / leg(S)
si = {n: i for i, (n, _, _) in enumerate(S['bones'])}
clips = {}
for key, c in S['clips'].items():
    frames = []
    for fr in c['frames']:
        out = []
        for n, _, _ in D['bones']:
            i = si.get(n); out += fr[i * 4:i * 4 + 4] if i is not None else [0, 0, 0, 1]
        frames.append(out)
    clips[key] = {'dur': c['dur'], 'stride': round(c['stride'] * k, 4), 'frames': frames, 'hips': [[round(v * k, 4) for v in h] for h in c['hips']], 'from': src}
    print(key, 'шаг %.2f → %.2f м' % (c['stride'], clips[key]['stride']))
D['clips'] = clips
json.dump(D, open(f'assets/models/{dst}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
