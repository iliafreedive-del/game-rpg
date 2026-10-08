// Английский архив (сборка 52): копия игры, где каждая русская строка кода, index.html и карт заменена переводом из tools/i18n/en.json.
// Русский код не меняется. node tools/i18n/build_en.mjs [папка]  → папка (по умолчанию dist/en) с игрой на английском;
// архив: (cd dist/en && zip -qr ../dark-ascent-en.zip .). Новые строки: node tools/i18n/extract.mjs, перевести недостающие в en.json.
// Чего нет в en.json, остаётся по-русски — скрипт печатает список, а QA ищет кириллицу на экране (tools/qa/en_check.mjs).
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process';
import { listJS, scan } from './extract.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist/en'));
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/i18n/en.json'), 'utf8'));
const missing = new Set();
const tr = k => { if (Object.prototype.hasOwnProperty.call(EN, k)) return EN[k]; missing.add(k); return null; };
// точечные правки там, где русский текст разбирается кодом (регулярки), и формат чисел/дат
const PATCH = [
  [/\/\^Чемпион: \//g, '/^Champion: /'],
  [/toLocaleString\('ru-RU'\)/g, "toLocaleString('en-US')"],
  [/toLocaleDateString\('ru-RU'/g, "toLocaleDateString('en-US'"],
];

const escLit = (s, q) => s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

function translateJS(src) {
  const nodes = scan(src).sort((a, b) => a.start - b.start || b.end - a.end);
  // в диапазоне [s, e) заменить узлы верхнего уровня; вложенные (строки внутри ${…}) — рекурсивно
  function render(s, e) {
    let out = '', pos = s;
    for (const n of nodes) {
      if (n.start < pos || n.start < s || n.end > e) continue;
      out += src.slice(pos, n.start); out += node(n); pos = n.end;
    }
    return out + src.slice(pos, e);
  }
  function node(n) {
    const t = tr(n.key);
    if (n.kind === 'lit') { if (t == null) return src.slice(n.start, n.end); const q = n.quote === '`' ? "'" : n.quote; return q + escLit(t, q) + q; }
    const exprs = n.exprs.map(([a, b]) => render(a, b));
    if (t == null) {   // нет перевода: шаблон как был, но строки внутри ${…} всё равно переводятся
      let o = '`'; n.quasis.forEach(([a, b], i) => { o += src.slice(a, b); if (i < exprs.length) o += '${' + exprs[i] + '}'; }); return o + '`';
    }
    return '`' + t.split(/(\{\d+\})/).map(p => { const m = /^\{(\d+)\}$/.exec(p); return m && exprs[+m[1]] != null ? '${' + exprs[+m[1]] + '}' : escTpl(p); }).join('') + '`';
  }
  let out = render(0, src.length);
  for (const [re, to] of PATCH) out = out.replace(re, to);
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
for (const f of ['_headers', 'index.html', 'manifest.webmanifest', 'css', 'js', 'assets']) execSync(`cp -r "${path.join(ROOT, f)}" "${OUT}/"`);
let nFiles = 0;
for (const f of listJS(path.join(OUT, 'js'))) { const src = fs.readFileSync(f, 'utf8'); const out = translateJS(src); if (out !== src) { fs.writeFileSync(f, out); nFiles++; } }
// index.html: текст между тегами и атрибуты
let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').replace('<html lang="ru">', '<html lang="en">');
html = html.replace(/>([^<>]*[А-Яа-яЁё][^<>]*)</g, (m, t) => { const k = t.trim(), v = tr(k); return v == null ? m : '>' + t.replace(k, v) + '<'; });
html = html.replace(/(title|content|alt|placeholder)="([^"]*[А-Яа-яЁё][^"]*)"/g, (m, a, t) => { const v = tr(t); return v == null ? m : `${a}="${v.replace(/"/g, '&quot;')}"`; });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const f of fs.readdirSync(path.join(OUT, 'assets/maps')).filter(f => f.endsWith('.json'))) {
  const p = path.join(OUT, 'assets/maps', f); const walkJ = o => typeof o === 'string' ? (/[А-Яа-яЁё]/.test(o) ? (tr(o) ?? o) : o) : Array.isArray(o) ? o.map(walkJ) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walkJ(v)])) : o;
  fs.writeFileSync(p, JSON.stringify(walkJ(JSON.parse(fs.readFileSync(p, 'utf8')))));
}
const man = path.join(OUT, 'manifest.webmanifest'); const mj = JSON.parse(fs.readFileSync(man, 'utf8'));
for (const k of Object.keys(mj)) if (typeof mj[k] === 'string' && /[А-Яа-яЁё]/.test(mj[k])) mj[k] = tr(mj[k]) ?? mj[k]; mj.lang = 'en'; fs.writeFileSync(man, JSON.stringify(mj, null, 1));
// проверка синтаксиса каждого переведённого файла
let bad = 0; for (const f of listJS(path.join(OUT, 'js'))) { try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); } catch (e) { bad++; console.log('СИНТАКСИС', path.relative(OUT, f), String(e.stderr).split('\n').slice(0, 4).join(' | ')); } }
console.log('файлов переведено', nFiles, 'ошибок синтаксиса', bad, 'без перевода', missing.size);
if (missing.size) console.log([...missing].slice(0, 30).map(s => '  · ' + s.slice(0, 90)).join('\n'));
