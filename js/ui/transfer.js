// сборка 75: перенос сохранения кодом (js/game/save.js: transferCode / parseTransfer / applyTransfer) — кнопки в «Настройках» и на титуле.
// Зачем: игра открывается с разных площадок (GitHub Pages, архив на Cloudflare, Яндекс Игры) и на разных устройствах, у каждой своё
// хранилище браузера — герой с телефона на ноутбуке не виден. «Скопировать код» → «Вставить код» на другом устройстве.
import { transferCode, parseTransfer, applyTransfer } from '../game/save.js';
import { CLASSES } from '../data/items.js';
import { el } from '../core/util.js';

const who = t => Object.values(t.slots).map(p => `${p.name ? p.name + ' (' + (CLASSES[p.cls] || {}).name + ')' : (CLASSES[p.cls] || {}).name || p.cls}, ур. ${p.level}`).join('; ');

async function copyText(code) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(code); return true; } } catch { }
  try { const ta = document.createElement('textarea'); ta.value = code; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok) return true; } catch { }
  return false;
}

/** cur — текущий профиль (null на титуле: берутся сохранённые герои); say({ text, sub, kind }) — как показать ответ */
export function transferButtons(cur, say, opt = {}) {
  const box = el('div', 'row transfer');
  const cp = el('button', 'btn sm', '📋 Скопировать код'); cp.title = 'Код со всеми героями — вставьте его на другом устройстве';
  cp.onclick = async () => {
    const code = transferCode(cur && cur());
    if (!code || !parseTransfer(code).slots) { say({ text: 'Копировать нечего', sub: 'Сохранённых героев нет', kind: 'warn' }); return; }
    if (await copyText(code)) say({ text: 'Код переноса скопирован', sub: `${(code.length / 1024).toFixed(0)} КБ · вставьте его в «Настройки → Вставить код» на другом устройстве`, kind: 'good' });
    else prompt('Скопируйте код переноса:', code);   // буфер обмена недоступен (старый браузер, рамка площадки) — показать для ручного копирования
  };
  const ps = el('button', 'btn sm', 'Вставить код'); ps.title = 'Заменить героев на этом устройстве героями из кода';
  ps.onclick = () => {
    const s = prompt('Вставьте код переноса (начинается с UH1.):'); if (s == null) return;
    const t = parseTransfer(s);
    if (!t.slots) { say({ text: 'Код не подошёл', sub: t.why, kind: 'bad' }); return; }
    if (!confirm(`Заменить героев на этом устройстве героями из кода?\n\nИз кода: ${who(t)}.\n\nТекущие герои этих классов будут перезаписаны. Отменить нельзя.`)) return;
    const n = applyTransfer(t);
    if (!n) { say({ text: 'Не удалось записать', sub: 'Браузер не даёт сохранять (приватный режим или нет места)', kind: 'bad' }); return; }
    say({ text: `Перенесено героев: ${n}`, sub: 'Игра перезапустится', kind: 'good' });
    setTimeout(() => location.reload(), 700);
  };
  if (opt.copy !== false) box.append(cp); box.append(ps);
  return box;
}
