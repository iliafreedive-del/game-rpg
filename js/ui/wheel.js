// «Колесо Фортуны» in the village: free spin every 8 hours + a spin for an ad every hour.
import { G, bus } from '../game/ctx.js';
import { el } from '../core/util.js';
import { adButton, adLeft } from './adbtn.js';
import * as CS from '../game/castle.js';
import { makeItem } from '../game/items.js';
import { autoEquip } from '../game/character.js';

const PRIZES = [
  { t: '💰 300', c: '#c8902a', w: 22, give: P => { P.gold += 150 + P.level * 30; return `+${150 + P.level * 30} золота`; } },
  { t: '◆ 2', c: '#7a3ad0', w: 14, give: P => { P.shards = (P.shards || 0) + 2; return '+2 осколка Бездны'; } },
  { t: '⚡ 5', c: '#c84a1a', w: 14, give: () => { CS.addTorches(5); return '+5 энергии'; } },
  { t: '❤ 3', c: '#b02a2a', w: 16, give: P => { P.potions.hp += 3; return '+3 зелья здоровья'; } },
  { t: '💰 1000', c: '#e8b030', w: 7, give: P => { P.gold += 600 + P.level * 80; return `+${600 + P.level * 80} золота`; } },
  { t: '◆ 6', c: '#9a4ae8', w: 5, give: P => { P.shards = (P.shards || 0) + 6; return '+6 осколков Бездны'; } },
  { t: '📜 2', c: '#5a6a3a', w: 14, give: P => { P.scrolls += 2; return '+2 свитка возврата'; } },
  { t: '★ вещь', c: '#3a6ec8', w: 8, give: P => { const it = makeItem({ slot: ['weapon', 'head', 'chest', 'amulet'][Math.floor(Math.random() * 4)], ilvl: P.level + 1, rarity: Math.random() < 0.25 ? 2 : 1, cls: P.cls }); delete it.req; autoEquip(it); return 'Вещь: ' + it.name; }   /* сборка 47: обычно зелёная */ },
];
const FREE_MS = 8 * 3600e3;
export const wheelReady = () => { const P = G.profile; if (P.wheelFree > Date.now()) P.wheelFree = Date.now();   /* С15: часы переведены назад */ return !P.wheelFree || Date.now() - P.wheelFree >= FREE_MS; };

export function openWheel(modal, closeModal) {
  let spinning = false, angle = 0;
  modal('Колесо Фортуны', 'sm reward', b => {
    const P = G.profile;
    const wrap = el('div', 'wh-wrap'); const cv = document.createElement('canvas'); cv.width = cv.height = 560; cv.className = 'wh-wheel';
    const x = cv.getContext('2d'), n = PRIZES.length, R = 270;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + Math.PI * 2 / n;
      x.fillStyle = PRIZES[i].c; x.beginPath(); x.moveTo(280, 280); x.arc(280, 280, R, a0, a1); x.closePath(); x.fill();
      x.strokeStyle = '#1a1008'; x.lineWidth = 4; x.stroke();
      x.save(); x.translate(280, 280); x.rotate((a0 + a1) / 2); x.fillStyle = '#fff'; x.font = 'bold 34px Georgia'; x.textAlign = 'right'; x.shadowColor = '#000'; x.shadowBlur = 6; x.fillText(PRIZES[i].t, R - 22, 12); x.restore();
    }
    x.lineWidth = 12; x.strokeStyle = '#d8a84a'; x.beginPath(); x.arc(280, 280, R, 0, 7); x.stroke();
    x.fillStyle = '#2a1a08'; x.beginPath(); x.arc(280, 280, 46, 0, 7); x.fill(); x.strokeStyle = '#ffd24a'; x.lineWidth = 6; x.stroke();
    wrap.append(cv, el('div', 'wh-pointer', '▼')); b.appendChild(wrap);
    const res = el('div', 'wh-res', 'Крутите — выигрыш сразу ваш!'); b.appendChild(res);
    const spin = (after) => {
      if (spinning) return; spinning = true;
      let r = Math.random() * PRIZES.reduce((a, p) => a + p.w, 0), idx = 0; for (; idx < n; idx++) { r -= PRIZES[idx].w; if (r <= 0) break; } idx = Math.min(idx, n - 1);
      const target = 360 * 6 + (360 - idx * 360 / n); angle = Math.ceil(angle / 360) * 360 + target;
      cv.style.transition = 'transform 3.2s cubic-bezier(.15,.85,.25,1)'; cv.style.transform = `rotate(${angle}deg)`;
      bus.emit('sfx', 'click');
      setTimeout(() => { const txt = PRIZES[idx].give(G.profile); res.innerHTML = `<b class="goldc">🎉 ${txt}</b>`; bus.emit('sfx', 'rareDrop'); bus.emit('hud'); bus.emit('save'); spinning = false; if (after) after(); }, 3300);
    };
    const row = el('div', 'row'); row.style.justifyContent = 'center';
    const free = el('button', 'btn gold', wheelReady() ? 'Крутить бесплатно' : 'Бесплатно — позже');
    free.disabled = !wheelReady();
    if (!wheelReady()) { const l = FREE_MS - (Date.now() - P.wheelFree); free.textContent = `Бесплатно через ${Math.floor(l / 3600e3)} ч ${Math.floor(l % 3600e3 / 60e3)} мин`; }
    free.onclick = () => { if (!wheelReady()) return; P.wheelFree = Date.now(); free.disabled = true; free.textContent = 'Следующая бесплатно через 8 ч'; spin(); };
    row.append(free, adButton('▶ Крутить за рекламу', 'wheel', 60 * 60e3, () => spin()));
    b.appendChild(row);
    b.appendChild(el('p', 'muted', '<small>Бесплатно — раз в 8 часов, за рекламу — раз в час.</small>'));
  });
}
