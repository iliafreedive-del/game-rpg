// Сборка 75: JS игры в копии для архива (tools/build_zip.sh) — один файл main.js на язык вместо ~340 модулей.
// Экран «Загрузка…» ждал сотни мелких запросов (на медленной сети и HTTP/1.1 — секунды). three.js и прочее из js/vendor
// остаются общими файлами (не копируются в каждый язык). import.meta.url каждого модуля заменяется адресом этого модуля
// от страницы — пути к assets/ не меняются. Модули, вошедшие в main.js, удаляются; index.html получает новый список предзагрузки.
// node tools/bundle_js.mjs <папка копии> [путь к модулю esbuild]
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const [, , root, esbPath = 'esbuild'] = process.argv;
const esbuild = createRequire(import.meta.url)(esbPath);
const ROOT = path.resolve(root), VENDOR = path.join(ROOT, 'js', 'vendor');
const dirs = fs.readdirSync(ROOT).filter(d => /^js(_[a-z]+)?$/.test(d) && fs.existsSync(path.join(ROOT, d, 'main.js')));
const vendorUsed = new Set();
let before = 0, after = 0;
for (const d of dirs) {
  const dir = path.join(ROOT, d), out = path.join(dir, 'main.bundle.js'), inputs = new Set();
  const plug = {
    name: 'umbra',
    setup(b) {
      b.onResolve({ filter: /vendor\// }, a => {
        const p = path.resolve(a.resolveDir, a.path); if (!p.startsWith(VENDOR + path.sep)) return;
        vendorUsed.add(path.basename(p));
        return { path: './' + path.relative(dir, p).split(path.sep).join('/'), external: true };
      });
      b.onLoad({ filter: /\.js$/ }, a => {
        inputs.add(a.path);
        const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
        const src = fs.readFileSync(a.path, 'utf8').replace(/import\.meta\.url/g, `new URL(${JSON.stringify(rel)}, document.baseURI).href`);
        return { contents: src, loader: 'js' };
      });
    },
  };
  await esbuild.build({ entryPoints: [path.join(dir, 'main.js')], bundle: true, format: 'esm', minify: true, target: 'es2020', charset: 'utf8',
    legalComments: 'none', outfile: out, plugins: [plug], logLevel: 'error' });
  for (const f of inputs) { before += fs.statSync(f).size; fs.rmSync(f); }
  fs.renameSync(out, path.join(dir, 'main.js')); after += fs.statSync(path.join(dir, 'main.js')).size;
  // пустые папки после удаления модулей
  (function prune(p) { for (const f of fs.readdirSync(p)) { const q = path.join(p, f); if (fs.statSync(q).isDirectory()) { prune(q); if (!fs.readdirSync(q).length) fs.rmdirSync(q); } } })(dir);
}
const html = path.join(ROOT, 'index.html');
const mods = ['main.js', ...[...vendorUsed].map(f => 'vendor/' + f)];
const h = fs.readFileSync(html, 'utf8'), h2 = h.replace(/window\.__MODS=\[[^\]]*\]/, 'window.__MODS=' + JSON.stringify(mods));
if (h2 === h) throw new Error('index.html: нет window.__MODS');
fs.writeFileSync(html, h2);
console.log(`JS одним файлом: ${dirs.length} языков, ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} МБ; предзагрузка: ${mods.join(', ')}`);
