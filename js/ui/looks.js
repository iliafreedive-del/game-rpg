// Окно «Облик» (сборка 59, js/game/cosmetics.js): готовые облики, свои краски (ткань · кайма · броня), другая модель класса,
// призрак для героя и питомца. Только вид. Открывается из меню; герой перекрашивается сразу (окно полупрозрачное снизу).
import { G, bus } from '../game/ctx.js';
import { el, esc } from '../core/util.js';
import { HERO_LOOKS, DYES, HERO_MODELS, GHOST, DYE_PRICE, MODEL_PRICE } from '../data/cosmetics.js';
import * as CO from '../game/cosmetics.js';

const hex = c => '#' + (c ?? 0).toString(16).padStart(6, '0');
const BASE_COL = { a: 0x5a1aa0, b: 0xd6a548, c: 0x6a7086 };   // исходные краски текстуры (для кружков)
const CSS = `
.lk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin:6px 0 12px}
.lk-card{border-radius:10px;padding:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:5px;text-align:left;color:inherit;font:inherit}
.lk-card.on{border-color:#d6a548;box-shadow:inset 0 0 0 1px #d6a548}
.lk-card b{font-size:14px}.lk-sw{display:flex;gap:4px}.lk-sw i{width:18px;height:18px;border-radius:50%;border:1px solid #0008;display:inline-block}
.lk-st{font-size:12px;color:#a49a88}.lk-st.gold{color:#f0c050}.lk-st.ok{color:#9fe38e}
.lk-btns{display:flex;gap:5px;flex-wrap:wrap}.lk-btns .btn{padding:5px 9px;font-size:12px;min-height:30px}
.lk-dyes{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 10px;align-items:center}
.lk-dye{width:34px;height:34px;border-radius:50%;border:2px solid #0009;position:relative;padding:0;cursor:pointer}
.lk-dye.on{outline:3px solid #f0d08a;outline-offset:1px}.lk-dye.lock::after{content:'${DYE_PRICE}\\25C6';position:absolute;inset:auto -6px -8px auto;font:700 10px sans-serif;color:#f0c050;background:#000c;border-radius:6px;padding:0 3px}
.lk-lbl{font-size:12px;color:#a49a88;margin-top:2px}
.lk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 10px}
.ad-bar{position:relative;overflow:hidden}.ad-bar i{position:absolute;left:0;top:0;bottom:0;background:rgba(90,192,112,.35)}.ad-bar span{position:relative}
`;
let styled = false;

// кнопки «как получить»: осколки, реклама (прогресс недели), рубли (подключит лавка площадки)
function getButtons(box, key, get, title, onShards, redraw) {
  const r = el('div', 'lk-btns');
  if (get.shards) { const b = el('button', 'btn gold', `${get.shards}◆`); b.onclick = e => { e.stopPropagation(); onShards(); redraw(); }; r.appendChild(b); }
  if (get.ads) {
    const p = CO.adProgress(key, get), b = el('button', 'btn ad ad-bar', `<i style="width:${Math.round(p.n / get.ads * 100)}%"></i><span>${p.n}/${get.ads}</span>`);
    b.title = `Реклама за вознаграждение: ${get.ads} за ${get.days || 7} дн. Осталось ${p.left} дн.`;
    b.onclick = async e => { e.stopPropagation(); await CO.watchFor(key, get, title); redraw(); }; r.appendChild(b);
  }
  if (get.rub) { const b = el('button', 'btn', '₽'); b.onclick = e => { e.stopPropagation(); bus.emit('cosmeticBuy', { product: get.rub, key, title }); if (!CO.owns(key)) bus.emit('toast', { text: 'Покупка за рубли появится вместе с лавкой площадки', sub: 'Пока можно открыть за рекламу', kind: 'warn' }); }; r.appendChild(b); }
  box.appendChild(r);
}

export function renderLooks(b, redraw) {
  if (!styled) { styled = true; document.head.appendChild(el('style', '', CSS)); }
  const P = G.profile, cls = P.cls || 'warrior', w = CO.wearOf(P);
  b.appendChild(el('p', 'muted', `Только вид — сила не меняется. Осколки Бездны: <b class="c-gold">${P.shards || 0}◆</b>`));

  // ---- готовые облики
  b.appendChild(el('h3', '', 'Готовые облики'));
  const g = el('div', 'lk-grid');
  for (const [id, L] of Object.entries(HERO_LOOKS)) {
    const own = CO.lookOwned(id), on = w.look === id, c = L.look || {};
    const card = el('div', 'lk-card' + (on ? ' on' : ''), `<b>${esc(L.name)}</b><div class="lk-sw">${['a', 'b', 'c'].map(k => `<i style="background:${hex(c[k] ?? BASE_COL[k])}${c.glow && k === 'a' ? `;box-shadow:0 0 8px ${hex(c.glow)}` : ''}"></i>`).join('')}</div>`);
    if (own) {
      card.appendChild(el('div', 'lk-st' + (on ? ' ok' : ''), on ? '✔ Надет' : 'Нажмите, чтобы надеть'));
      card.onclick = () => { CO.wear({ look: id, dye: null }); bus.emit('sfx', 'click'); redraw(); };
    } else getButtons(card, 'look:' + id, L.get, L.name, () => CO.buyLook(id), redraw);
    g.appendChild(card);
  }
  b.appendChild(g);

  // ---- свои краски
  b.appendChild(el('h3', '', 'Свои краски'));
  b.appendChild(el('p', 'muted', `<small>Поверх облика: ткань, кайма и броня меняются по отдельности. Каждая новая краска — ${DYE_PRICE}◆ один раз.</small>`));
  for (const [part, name] of [['a', 'Ткань'], ['b', 'Кайма'], ['c', 'Броня']]) {
    b.appendChild(el('div', 'lk-lbl', name));
    const row = el('div', 'lk-dyes'), cur = w.dye && w.dye[part];
    for (const [id, [dn, col]] of Object.entries(DYES[part])) {
      const own = CO.dyeOwned(part, id), on = cur ? cur === id : col == null && !(HERO_LOOKS[w.look].look || {})[part];
      const d = el('button', 'lk-dye' + (on ? ' on' : '') + (own ? '' : ' lock')); d.style.background = hex(col ?? BASE_COL[part]); d.title = dn;
      d.onclick = () => { if (!own && !CO.buyDye(part, id)) return; CO.setDye(part, id); bus.emit('sfx', 'click'); redraw(); };
      row.appendChild(d);
    }
    b.appendChild(row);
  }
  if (w.dye) { const r = el('button', 'btn sm', 'Сбросить краски'); r.onclick = () => { CO.wear({ dye: null }); redraw(); }; b.appendChild(r); }

  // ---- другая модель класса
  const models = HERO_MODELS[cls] || {};
  if (Object.keys(models).length > 1) {
    b.appendChild(el('h3', '', 'Модель'));
    const row = el('div', 'lk-row'), cur = CO.heroModel(P) || Object.keys(models)[0];
    for (const [id, name] of Object.entries(models)) {
      const own = CO.modelOwned(cls, id), first = id === Object.keys(models)[0];
      const bt = el('button', 'btn' + (cur === id ? ' gold' : ''), `${esc(name)}${own ? '' : ` · ${MODEL_PRICE}◆`}`);
      bt.onclick = () => { if (!own && !CO.buyModel(cls, id)) return; CO.wear({ model: first ? null : id }); redraw(); };
      row.appendChild(bt);
    }
    b.appendChild(row);
  }

  // ---- призрак
  b.appendChild(el('h3', '', 'Призрак'));
  b.appendChild(el('p', 'muted', '<small>Полупрозрачное тело со светящимся краем. Сочетается с любым обликом и краской.</small>'));
  for (const [k, label, isOn, set] of [['hero', 'Герой', !!w.ghost, v => CO.wear({ ghost: v })], ['pet', 'Питомец', !!CO.cosmOf(P).petGhost, v => CO.setPetGhost(v)]]) {
    const key = 'ghost:' + k, own = CO.owns(key), row = el('div', 'lk-row');
    row.appendChild(el('b', '', label));
    if (own) { const t = el('button', 'btn' + (isOn ? ' gold' : ''), isOn ? '✔ Включён' : 'Включить'); t.onclick = () => { set(!isOn); redraw(); }; row.appendChild(t); }
    else getButtons(row, key, GHOST[k].get, GHOST[k].name, () => {}, redraw);
    b.appendChild(row);
  }
}
