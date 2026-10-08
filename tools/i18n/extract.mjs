// Английская версия (сборка 52): все русские строки из js/**/*.js, index.html и assets/maps/*.json → tools/i18n/strings.json
// Ключ — точный русский текст (у шаблонов `…${x}…` выражения заменены на {0}, {1}…). Перевод лежит в tools/i18n/en.json,
// английский архив собирает tools/i18n/build_en.mjs (подставляет перевод прямо в копию кода; русский код не меняется).
import fs from 'fs'; import path from 'path';
import * as acorn from '/opt/node-tools/node_modules/acorn/dist/acorn.mjs';
import * as walk from '/opt/node-tools/node_modules/acorn-walk/dist/walk.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CY = /[А-Яа-яЁё]/;
export function listJS(dir = path.join(ROOT, 'js')) { const out = []; for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== 'vendor') out.push(...listJS(p)); } else if (f.name.endsWith('.js')) out.push(p); } return out; }
// строки файла: [{ start, end, kind: 'lit'|'tpl', key, quote }]
export function scan(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); const found = [];
  walk.full(ast, n => {
    if (n.type === 'Literal' && typeof n.value === 'string' && CY.test(n.value)) found.push({ start: n.start, end: n.end, kind: 'lit', key: n.value, quote: src[n.start] });
    if (n.type === 'TemplateLiteral' && n.quasis.some(q => CY.test(q.value.cooked || ''))) found.push({ start: n.start, end: n.end, kind: 'tpl', key: n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i}}` : '')).join(''), quasis: n.quasis.map(q => [q.start, q.end]), exprs: n.expressions.map(e => [e.start, e.end]) });
  });
  return found;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const keys = new Map();
  const add = (k, where) => { if (!keys.has(k)) keys.set(k, where); };
  for (const f of listJS()) { const src = fs.readFileSync(f, 'utf8'); for (const s of scan(src)) add(s.key, path.relative(ROOT, f)); }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/>([^<>]*[А-Яа-яЁё][^<>]*)</g)) add(m[1].trim(), 'index.html');
  for (const m of html.matchAll(/(?:title|content|alt|placeholder)="([^"]*[А-Яа-яЁё][^"]*)"/g)) add(m[1], 'index.html');
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/maps')).filter(f => f.endsWith('.json'))) { const walkJ = o => { if (typeof o === 'string') { if (CY.test(o)) add(o, 'assets/maps/' + f); } else if (o && typeof o === 'object') Object.values(o).forEach(walkJ); }; walkJ(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps', f), 'utf8'))); }
  const out = [...keys].map(([k, w]) => ({ k, w }));
  fs.writeFileSync(path.join(ROOT, 'tools/i18n/strings.json'), JSON.stringify(out, null, 1));
  console.log('строк', out.length, 'символов', out.reduce((a, s) => a + s.k.length, 0));
}
