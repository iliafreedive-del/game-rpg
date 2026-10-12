// Сборка 66: сжатие JS в копии для архива (tools/build_zip.sh) — комментарии, пробелы, короткие имена локальных переменных.
// Каждый файл отдельно, формат ESM: пути import, import.meta.url и имена экспортов не меняются. Уже сжатые *.min.js не трогаются.
// node tools/minify_js.mjs <папка> [путь к модулю esbuild]   (npm i esbuild@0.25)
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const [, , dir, esbPath = 'esbuild'] = process.argv;
const esbuild = createRequire(import.meta.url)(esbPath);
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js') && !f.endsWith('.min.js')) files.push(p); } })(dir);
let before = 0, after = 0, bad = 0;
await Promise.all(files.map(async f => {
  const src = fs.readFileSync(f, 'utf8');
  try {
    const r = await esbuild.transform(src, { loader: 'js', format: 'esm', minify: true, target: 'es2020', charset: 'utf8', legalComments: 'none' });
    before += src.length; after += r.code.length; fs.writeFileSync(f, r.code);
  } catch (e) { bad++; console.log('НЕ СЖАТ', f, String(e.message).split('\n')[0]); }
}));
console.log(`JS: ${files.length} файлов, ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} МБ${bad ? `, ошибок ${bad}` : ''}`);
