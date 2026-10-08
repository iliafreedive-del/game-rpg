// Все языки в одной папке (сборка 54): копия игры + js_<код>/ для каждого tools/i18n/<код>.json, где каждая русская строка
// кода заменена переводом; карты — assets/maps_<код>/, тексты index.html — js_<код>/html.json. Язык выбирает boot.js.
// Русский код (js/) не меняется. node tools/i18n/build_langs.mjs [папка=dist/langs] [коды через запятую]
// Архив: SRC=$PWD/dist/langs OUT=… tools/build_zip.sh. Новые строки в игре: node tools/i18n/extract.mjs → перевести недостающие
// во всех <код>.json (скрипт печатает, чего нет; без перевода строка остаётся русской — Яндекс за такое отклоняет).
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process';
import { listJS, scan } from './extract.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist/langs'));
const I18N = path.join(ROOT, 'tools/i18n');
const LANGS = (process.argv[3] ? process.argv[3].split(',') : fs.readdirSync(I18N).filter(f => /^[a-z]{2}\.json$/.test(f)).map(f => f.slice(0, 2))).filter(l => l !== 'ru');
const LOCALE = { en: 'en-US', tr: 'tr-TR', es: 'es-ES', pt: 'pt-BR', id: 'id-ID', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ja: 'ja-JP', hi: 'hi-IN' };

const escLit = (s, q) => s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function translateJS(src, tr, patches) {
  const nodes = scan(src).sort((a, b) => a.start - b.start || b.end - a.end);
  function render(s, e) {   // в [s, e) заменить узлы верхнего уровня; строки внутри ${…} — рекурсивно
    let out = '', pos = s;
    for (const n of nodes) { if (n.start < pos || n.start < s || n.end > e) continue; out += src.slice(pos, n.start) + node(n); pos = n.end; }
    return out + src.slice(pos, e);
  }
  function node(n) {
    const t = tr(n.key);
    if (n.kind === 'lit') { if (t == null) return src.slice(n.start, n.end); const q = n.quote === '`' ? "'" : n.quote; return q + escLit(t, q) + q; }
    const exprs = n.exprs.map(([a, b]) => render(a, b));
    if (t == null) { let o = '`'; n.quasis.forEach(([a, b], i) => { o += src.slice(a, b); if (i < exprs.length) o += '${' + exprs[i] + '}'; }); return o + '`'; }
    return '`' + t.split(/(\{\d+\})/).map(p => { const m = /^\{(\d+)\}$/.exec(p); return m && exprs[+m[1]] != null ? '${' + exprs[+m[1]] + '}' : escTpl(p); }).join('') + '`';
  }
  let out = render(0, src.length);
  for (const [re, to] of patches) out = out.replace(re, to);
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
for (const f of ['_headers', 'index.html', 'boot.js', 'manifest.webmanifest', 'css', 'js', 'assets']) execSync(`cp -r "${path.join(ROOT, f)}" "${OUT}/"`);
const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let total = 0;
for (const L of LANGS) {
  const D = JSON.parse(fs.readFileSync(path.join(I18N, L + '.json'), 'utf8')); const missing = new Set();
  const tr = k => { if (Object.prototype.hasOwnProperty.call(D, k)) return D[k]; missing.add(k); return null; };
  const champ = tr('Чемпион: ') || 'Champion: ', loc = LOCALE[L] || 'en-US';
  const patches = [
    [/\/\^Чемпион: \//g, '/^' + escRe(champ) + '/'],
    [/toLocaleString\('ru-RU'\)/g, `toLocaleString('${loc}')`], [/toLocaleDateString\('ru-RU'/g, `toLocaleDateString('${loc}'`],
    [/'maps\/(village|catacombs)\.json'/g, `'maps_${L}/$1.json'`],
  ];
  const dir = path.join(OUT, 'js_' + L);
  execSync(`cp -r "${path.join(ROOT, 'js')}" "${dir}" && rm -rf "${dir}/vendor"`);   // vendor общий: js/vendor
  for (const f of listJS(dir)) {
    let out = translateJS(fs.readFileSync(f, 'utf8'), tr, patches);
    const toVendor = path.relative(path.dirname(f), path.join(OUT, 'js/vendor')).split(path.sep).join('/');
    out = out.replace(/(['"])((?:\.\.?\/)+)vendor\//g, (m, q, rel) => { const abs = path.resolve(path.dirname(f), rel + 'vendor'); return abs === path.join(dir, 'vendor') ? q + toVendor + '/' : m; });
    fs.writeFileSync(f, out);
  }
  // карты
  fs.mkdirSync(path.join(OUT, 'assets/maps_' + L), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/maps')).filter(f => f.endsWith('.json'))) {
    const walkJ = o => typeof o === 'string' ? (/[А-Яа-яЁё]/.test(o) ? (tr(o) ?? o) : o) : Array.isArray(o) ? o.map(walkJ) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walkJ(v)])) : o;
    fs.writeFileSync(path.join(OUT, 'assets/maps_' + L, f), JSON.stringify(walkJ(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps', f), 'utf8')))));
  }
  // тексты index.html
  const H = {};
  for (const m of htmlSrc.matchAll(/>([^<>]*[А-Яа-яЁё][^<>]*)</g)) { const k = m[1].trim(), v = tr(k); if (v != null) H[k] = v; }
  for (const m of htmlSrc.matchAll(/(?:title|content|alt|placeholder)="([^"]*[А-Яа-яЁё][^"]*)"/g)) { const v = tr(m[1]); if (v != null) H[m[1]] = v; }
  fs.writeFileSync(path.join(dir, 'html.json'), JSON.stringify(H));
  let bad = 0; for (const f of listJS(dir)) { try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); } catch (e) { bad++; console.log(L, 'СИНТАКСИС', path.relative(OUT, f), String(e.stderr).split('\n').slice(0, 3).join(' | ')); } }
  console.log(`${L}: без перевода ${missing.size}, ошибок синтаксиса ${bad}`); if (missing.size) console.log([...missing].slice(0, 10).map(s => '   · ' + s.slice(0, 80)).join('\n'));
  total += missing.size + bad;
}
// список языков для boot.js
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').replace('<script type="module" src="boot.js"></script>', `<script>window.__LANGS=${JSON.stringify(['ru', ...LANGS])}</script>\n<script type="module" src="boot.js"></script>`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('языки:', ['ru', ...LANGS].join(', '), total ? '— ЕСТЬ ПРОБЛЕМЫ' : '— ок');
