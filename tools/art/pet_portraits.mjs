// Портреты питомцев для лавки Кофи: модели Meshy через тот же вид, что окно питомца (js/render3d/petview.js), прозрачный фон,
// одна полоса 8 × 160 px по порядку PET_PIC (js/data/pets.js) → assets/art/pets/portraits.webp. node tools/art/pet_portraits.mjs
import fs from 'fs';
import { execFileSync } from 'child_process';
import { browser, open, stopServers, mkdir, ROOT } from '../qa/lib.mjs';
const tmp = mkdir('/tmp/claude-0/pet_portraits'), S = 320;
const b = await browser(), p = await open(b, { w: 600, h: 600, titleOnly: true });
const shots = await p.evaluate(async S => {
  const THREE = await import('/js/vendor/three.module.min.js'), { petView } = await import('/js/render3d/petview.js'), { PET_PIC } = await import('/js/data/pets.js');
  const R = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); R.setClearColor(0, 0);
  const out = {};
  for (const id of PET_PIC) {
    const v = await petView(id, R); if (!v) { out[id] = null; continue; }
    v.resize(S, S, 1); for (let i = 0; i < 20; i++) v.draw(1 / 30);
    out[id] = R.domElement.toDataURL('image/png'); v.dispose();
  }
  return out;
}, S);
const ids = Object.keys(shots);
for (const id of ids) { if (!shots[id]) throw new Error('нет модели ' + id); fs.writeFileSync(`${tmp}/${id}.png`, Buffer.from(shots[id].split(',')[1], 'base64')); }
mkdir(`${ROOT}/assets/art/pets`);
execFileSync('python3', ['-c', `
import sys
from PIL import Image
ids = sys.argv[2:]; T = 160; A = Image.new('RGBA', (T * len(ids), T), (0, 0, 0, 0))
for i, n in enumerate(ids): A.paste(Image.open(f'${tmp}/{n}.png').convert('RGBA').resize((T, T), Image.LANCZOS), (i * T, 0))
A.save(sys.argv[1], quality=86, method=6)`, `${ROOT}/assets/art/pets/portraits.webp`, ...ids], { stdio: 'inherit' });
console.log(fs.statSync(`${ROOT}/assets/art/pets/portraits.webp`).size, 'байт');
await b.close(); stopServers();
