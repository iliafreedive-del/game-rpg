// Interface: dialogue with tappable words, your notes, journal pages (the deciphering), Echo trainer, HUD.
import { WORDS, PAGES, FN, tokenize, guessMatches, norm } from './words.js';
import { S, W, save, isConf, seen, pageDone, pageReady, addXP, xpFor, rank, srs, progress } from './state.js';
import { speak, sfx, voiceList, canSpeak } from './speech.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const ui = { busy: false, onChange: null };
const changed = () => { save(); hud(); ui.onChange && ui.onChange(); };

// ---------------------------------------------------------------- word marks
function gloss(id) {
  const w = S.words[id];
  if (S.mode === 'en') return '';
  if (w && (w.conf || w.peek)) return `<span class="gl ${w.conf ? 'c' : 'p'}">${esc(WORDS[id].ru)}</span>`;
  if (w && w.note) return `<span class="gl n">${esc(w.note)}</span>`;
  return '<span class="gl e">·</span>';
}
export function tokensHTML(text) {
  return tokenize(text).map(t => {
    if (t.t === 'sep') return `<span class="sp">${esc(t.raw)}</span>`;
    if (t.id) { const w = S.words[t.id]; const st = w && w.conf ? 'conf' : w && w.peek ? 'peek' : w && w.note ? 'note' : 'new'; return `<span class="tk ${st}" data-w="${t.id}"><span class="en">${esc(t.raw)}</span>${gloss(t.id)}</span>`; }
    if (t.fn) return `<span class="tk fn" data-fn="${t.fn}"><span class="en">${esc(t.raw)}</span>${S.mode === 'en' ? '' : '<span class="gl e">&nbsp;</span>'}</span>`;
    return `<span class="tk nm"><span class="en">${esc(t.raw)}</span>${S.mode === 'en' ? '' : '<span class="gl e">&nbsp;</span>'}</span>`;
  }).join('');
}
// count words of a line as met, remember the line for contexts
let newWords = 0;
export function meet(en, ru) {
  const ids = tokenize(en).filter(t => t.id).map(t => t.id);
  for (const id of ids) {
    const w = W(id); if (!w.seen) { newWords++; addXP(1); S.stats.met++; }
    w.seen++;
  }
  if (!S.lines.some(l => l[0] === en)) { S.lines.push([en, ru || '']); if (S.lines.length > 500) S.lines.shift(); }
  checkPages();
}
const readyShown = new Set();
function checkPages() {
  for (const p of PAGES) if (pageReady(p) && !readyShown.has(p.id) && !(S.pages[p.id] && S.pages[p.id].told)) {
    readyShown.add(p.id); (S.pages[p.id] ||= {}).told = true;
    toast(`📖 Страница «${p.title}» готова — расшифруй её в журнале`, 'page');
  }
}
function bindTokens(root) {
  root.querySelectorAll('.tk[data-w], .tk[data-fn]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); wordCard(el.dataset.w, el.dataset.fn, el); }));
}
export function refreshTokens() {
  document.querySelectorAll('[data-text]').forEach(el => { el.innerHTML = tokensHTML(el.dataset.text); bindTokens(el); });
}

// ---------------------------------------------------------------- word card (tap any word)
function contexts(id, n = 3) {
  const out = [];
  for (let i = S.lines.length - 1; i >= 0 && out.length < n; i--) if (tokenize(S.lines[i][0]).some(t => t.id === id)) out.push(S.lines[i]);
  return out;
}
export function wordCard(id, fn, anchor) {
  sfx('tap'); const box = $('card'); box.classList.remove('hidden');
  if (fn) {
    box.innerHTML = `<div class="cw"><b>${esc(fn)}</b> <button class="ib" id="cSay">🔊</button></div><div class="cfn">Служебное слово: ${esc(FN[fn])}</div><div class="crow"><button class="btn" id="cClose">Понятно</button></div>`;
    $('cSay').onclick = () => speak(fn); $('cClose').onclick = closeCard; speak(fn); return;
  }
  const w = W(id), D = WORDS[id]; const page = PAGES.find(p => p.id === D.page);
  const ctx = contexts(id).map(l => `<div class="ctx" data-text="${esc(l[0])}"></div>`).join('');
  let body;
  if (w.conf) body = `<div class="cconf">✔ Расшифровано: <b>${esc(D.ru)}</b> <span class="pic">${D.pic}</span></div>${w.note && !guessMatches(id, w.note) ? `<div class="cnote">твоя догадка была: «${esc(w.note)}»</div>` : ''}`;
  else body = `<label class="clab">Как ты думаешь, что это значит?</label>
    <div class="crow"><input id="cIn" maxlength="28" placeholder="твоя догадка по-русски" value="${esc(w.note)}" autocomplete="off"><button class="btn" id="cSave">Записать</button></div>
    ${w.peek ? `<div class="cpeek">🕯️ Подсмотрено: <b>${esc(D.ru)}</b></div>` : `<button class="btn ghost" id="cPeek">🕯️ Подсмотреть перевод (свечей: ${S.hints})</button>`}
    <div class="chint">Страница журнала «${page ? esc(page.title) : '?'}» — ${pageDone(D.page) ? 'расшифрована' : pageReady(page) ? 'уже можно расшифровать' : `встречено слов: ${page.words.filter(x => seen(x) > 0).length} из 4`}</div>`;
  box.innerHTML = `<div class="cw"><b>${esc(id === 'i' ? 'I' : id)}</b> <button class="ib" id="cSay">🔊</button><span class="cseen">встречалось ${w.seen} раз</span><button class="ib x" id="cClose">✕</button></div>
    ${body}${ctx ? `<div class="ctxs"><div class="clab">Где ты его видел:</div>${ctx}</div>` : ''}`;
  bindTokensSafe(box);
  $('cSay').onclick = () => speak(id === 'i' ? 'I' : id); $('cClose').onclick = closeCard;
  const inp = $('cIn');
  if (inp) {
    const saveNote = () => { const v = inp.value.trim(); const had = !!w.note; w.note = v; if (v && !had) addXP(2); sfx('note'); changed(); refreshTokens(); closeCard(); };
    $('cSave').onclick = saveNote; inp.onkeydown = e => { if (e.key === 'Enter') saveNote(); e.stopPropagation(); };
    if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => inp.focus(), 30);
  }
  const pk = $('cPeek'); if (pk) pk.onclick = () => { if (S.hints < 1) { toast('Свечей нет. Они даются за новый ранг и находки.'); return; } S.hints--; w.peek = true; changed(); refreshTokens(); wordCard(id); };
  speak(id === 'i' ? 'I' : id);
}
function bindTokensSafe(box) { box.querySelectorAll('[data-text]').forEach(el => { el.innerHTML = tokensHTML(el.dataset.text); el.querySelectorAll('.tk[data-w]').forEach(t => t.addEventListener('click', e => { e.stopPropagation(); wordCard(t.dataset.w); })); }); }
export function closeCard() { $('card').classList.add('hidden'); }

// ---------------------------------------------------------------- dialogue
let next = null;
const SPK = {};
export const speakers = o => Object.assign(SPK, o);
function showDlg(html, cls) { const d = $('dlg'); d.className = 'dlg ' + (cls || ''); d.innerHTML = html; d.classList.remove('hidden'); ui.busy = true; }
export function endDialog() { $('dlg').classList.add('hidden'); closeCard(); ui.busy = false; if (newWords) { toast(`+${newWords} ${newWords === 1 ? 'новое слово' : newWords < 5 ? 'новых слова' : 'новых слов'} в памяти`); newWords = 0; } changed(); }
function waitNext(btnLabel = 'Далее ▶') {
  return new Promise(res => {
    const b = $('dNext'); b.textContent = btnLabel; next = () => { next = null; res(); }; b.onclick = () => next && next();
  });
}
addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && next && !$('dlg').classList.contains('hidden') && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); next(); } });

export async function say(who, en, ru, gest) {
  const s = SPK[who] || { name: who, icon: '🗣️' };
  meet(en, ru);
  showDlg(`<div class="dh"><span class="di">${s.icon}</span><b>${esc(s.name)}</b>${gest ? `<span class="gest" title="жест">${gest}</span>` : ''}</div>
    <div class="dt" data-text="${esc(en)}"></div>${S.mode === 'ru' && ru ? `<div class="dru">${esc(ru)}</div>` : ''}
    <div class="db"><button class="ib" id="dSay" title="Озвучить">🔊</button><span class="dtip">нажми на слово, чтобы записать догадку</span><button class="btn" id="dNext"></button></div>`, s.cls);
  refreshTokens(); $('dSay').onclick = () => speak(en);
  if (S.autoVoice) speak(en);
  await waitNext();
}
export async function sign(en, ru, title = 'Надпись') {
  meet(en, ru);
  showDlg(`<div class="dh"><span class="di">📜</span><b>${esc(title)}</b></div><div class="dt carved" data-text="${esc(en)}"></div>${S.mode === 'ru' && ru ? `<div class="dru">${esc(ru)}</div>` : ''}
    <div class="db"><button class="ib" id="dSay">🔊</button><span class="dtip"></span><button class="btn" id="dNext"></button></div>`, 'stone');
  refreshTokens(); $('dSay').onclick = () => speak(en); if (S.autoVoice) speak(en);
  await waitNext();
}
export async function narrate(ru, btn = 'Далее ▶') {
  showDlg(`<div class="dn">${ru}</div><div class="db"><span></span><span class="dtip"></span><button class="btn" id="dNext"></button></div>`, 'narr');
  await waitNext(btn);
}
// options: [{label, value, cls}]
export function choose(options, title) {
  return new Promise(res => {
    const d = $('dlg'); d.classList.remove('hidden'); ui.busy = true;
    const prev = d.querySelector('.db'); if (prev) prev.remove();
    const box = document.createElement('div'); box.className = 'dchoices';
    if (title) box.innerHTML = `<div class="dctitle">${title}</div>`;
    for (const o of options) { const b = document.createElement('button'); b.className = 'btn ch ' + (o.cls || ''); b.innerHTML = o.label; b.onclick = () => { sfx('tap'); box.remove(); res(o.value); }; box.appendChild(b); }
    if (!d.querySelector('.dh') && !d.querySelector('.dn')) d.innerHTML = '';
    d.appendChild(box);
  });
}
// build an English answer from word chips. accept: array of normalized answers. returns the answer or null
export function compose(question, chips, accept, who) {
  return new Promise(res => {
    const s = SPK[who] || { name: who || '', icon: '🗣️' };
    const picked = [];
    const pool = shuffle(chips).map((c, i) => ({ c, i, used: false }));
    showDlg(`<div class="dh"><span class="di">${s.icon}</span><b>${esc(s.name)}</b><span class="gest">💭</span></div><div class="dt" data-text="${esc(question)}"></div>
      <div class="cmpl">Собери ответ из слов:</div><div class="cans" id="cAns"></div><div class="cpool" id="cPool"></div>
      <div class="db"><button class="ib" id="dSay">🔊</button><button class="btn ghost" id="cBack">Уйти</button><button class="btn" id="cSay2">Сказать ▶</button></div>`, 'compose');
    refreshTokens(); $('dSay').onclick = () => speak(question);
    const draw = () => {
      $('cAns').innerHTML = picked.length ? picked.map((p, k) => `<button class="chip on" data-k="${k}">${chipHTML(p.c)}</button>`).join('') : '<span class="cph">…</span>';
      $('cPool').innerHTML = pool.map((p, k) => `<button class="chip ${p.used ? 'used' : ''}" data-p="${k}">${chipHTML(p.c)}</button>`).join('');
      $('cAns').querySelectorAll('.chip').forEach(b => b.onclick = () => { const p = picked.splice(+b.dataset.k, 1)[0]; p.used = false; sfx('tap'); draw(); });
      $('cPool').querySelectorAll('.chip').forEach(b => b.onclick = () => { const p = pool[+b.dataset.p]; if (p.used) return; p.used = true; picked.push(p); sfx('tap'); speak(p.c, 1); draw(); });
    };
    draw();
    $('cBack').onclick = () => res(null);
    $('cSay2').onclick = () => { if (!picked.length) return; const ans = picked.map(p => p.c).join(' '); speak(ans); res(ans); };
  });
}
function chipHTML(c) {
  const id = c.toLowerCase(); const w = S.words[id];
  const g = S.mode === 'en' ? '' : w && (w.conf || w.peek) ? WORDS[id].ru : w && w.note ? w.note : '';
  return `<span class="en">${esc(c)}</span>${g ? `<small>${esc(g)}</small>` : ''}`;
}
export const answerIs = (ans, accept) => { const a = norm(ans); return accept.some(x => norm(x) === a); };

// ---------------------------------------------------------------- HUD, toasts, goal
export function toast(text, kind) {
  const box = $('toasts'); while (box.children.length > 2) box.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = text; box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
}
export function setGoal(en, ru) { S.goal = en ? [en, ru || ''] : null; hud(); }
export function hud() {
  $('rank').textContent = rank(); $('lvl').textContent = S.lvl; $('xpbar').style.width = Math.min(100, S.xp / xpFor(S.lvl) * 100) + '%';
  $('hints').textContent = S.hints;
  const pr = progress(); $('prog').textContent = `${pr.conf}/${pr.all}`;
  const ready = PAGES.filter(p => pageReady(p)).length; const dj = $('dotJ'); dj.textContent = ready; dj.classList.toggle('hidden', !ready);
  const due = echoPool().filter(id => S.words[id].due <= Date.now()).length; const de = $('dotE'); de.textContent = due; de.classList.toggle('hidden', !due || !S.flags.echo);
  $('bEcho').classList.toggle('hidden', !S.flags.echo);
  const g = $('goal'); if (ui.goalFn) S.goal = ui.goalFn();
  if (S.goal) { g.classList.remove('hidden'); g.innerHTML = `<span class="gk">Цель</span><span class="gt" data-text="${esc(S.goal[0])}"></span>${S.mode === 'ru' && S.goal[1] ? `<span class="gr">${esc(S.goal[1])}</span>` : ''}`; g.querySelectorAll('[data-text]').forEach(el => { el.innerHTML = tokensHTML(el.dataset.text); bindTokens(el); }); }
  else g.classList.add('hidden');
  const inv = $('inv'); const IT = ui.items || {};
  inv.innerHTML = Object.entries(S.inv).map(([k, n]) => IT[k] ? `<span class="it" title="${esc(IT[k].en)}">${IT[k].pic}${n > 1 ? `<b>×${n}</b>` : ''}</span>` : '').join('');
}

// ---------------------------------------------------------------- journal
export function openJournal(tab = 'pages') {
  closeCard(); const o = $('over'); o.classList.remove('hidden'); ui.over = true;
  const pr = progress();
  o.innerHTML = `<div class="ovh"><b>📖 Журнал странника</b><span class="ovs">расшифровано слов ${pr.conf} из ${pr.all} · страниц ${pr.pages} из ${pr.pagesAll}</span><button class="ib x" id="oClose">✕</button></div>
    <div class="tabs"><button class="tab ${tab === 'pages' ? 'on' : ''}" data-t="pages">Страницы</button><button class="tab ${tab === 'dict' ? 'on' : ''}" data-t="dict">Словарь</button><button class="tab ${tab === 'help' ? 'on' : ''}" data-t="help">Как играть</button></div><div class="ovb" id="oBody"></div>`;
  $('oClose').onclick = closeOver; o.querySelectorAll('.tab').forEach(b => b.onclick = () => openJournal(b.dataset.t));
  const B = $('oBody');
  if (tab === 'pages') {
    let html = '';
    for (const ch of [1, 2, 3]) {
      html += `<div class="chh">${['', 'Глава I · Деревня Стиллфорд', 'Глава II · Глубина', 'Глава III · Безмолвный король'][ch]}</div><div class="pgrid">`;
      for (const p of PAGES.filter(p => p.ch === ch)) {
        const done = pageDone(p.id), ready = pageReady(p), met = p.words.filter(w => seen(w) > 0).length;
        if (done) html += `<div class="pg done" data-p="${p.id}"><div class="pt">${esc(p.title)} ✔</div>${p.words.map(w => `<div class="pw"><span class="pic">${WORDS[w].pic}</span><b>${w === 'i' ? 'I' : w}</b><span>${esc(WORDS[w].ru)}</span></div>`).join('')}</div>`;
        else if (ready) html += `<button class="pg ready" data-p="${p.id}"><div class="pt">${esc(p.title)}</div><div class="pics">${shuffle(p.words).map(w => WORDS[w].pic).join(' ')}</div><div class="pst">✨ Можно расшифровать!</div></button>`;
        else html += `<div class="pg lock"><div class="pt">${met ? esc(p.title) : '???'}</div><div class="pics">${p.words.map(w => seen(w) ? WORDS[w].pic : '▢').join(' ')}</div><div class="pst">встречено ${met} из 4 слов</div></div>`;
      }
      html += '</div>';
    }
    B.innerHTML = html; B.querySelectorAll('.pg.ready').forEach(b => b.onclick = () => openPuzzle(b.dataset.p));
  } else if (tab === 'dict') {
    const ids = Object.keys(WORDS).filter(id => seen(id) > 0).sort((a, b) => (isConf(b) - isConf(a)) || seen(b) - seen(a));
    B.innerHTML = ids.length ? `<div class="dict">${ids.map(id => { const w = S.words[id]; return `<button class="dw ${w.conf ? 'c' : w.note ? 'n' : ''}" data-w="${id}"><b>${id === 'i' ? 'I' : id}</b><span>${w.conf || w.peek ? esc(WORDS[id].ru) : w.note ? '«' + esc(w.note) + '»' : '…'}</span><i>×${w.seen}</i></button>`; }).join('')}</div>` : '<p class="muted">Ты ещё не слышал ни одного слова. Поговори с кем-нибудь.</p>';
    B.querySelectorAll('.dw').forEach(b => b.onclick = () => wordCard(b.dataset.w));
  } else B.innerHTML = HELP;
}
const HELP = `<div class="help"><p>Здесь все говорят только по-английски. Твоя задача — понять их язык, как это делает настоящий путешественник: по жестам, ситуациям и повторениям.</p>
<p><b>1. Слушай и смотри.</b> Каждая реплика — это слова, которые ты встречаешь в живом контексте. Каждое слово повторяется много раз в разных фразах.</p>
<p><b>2. Записывай догадки.</b> Нажми на любое слово и напиши по-русски, что оно, по-твоему, значит. Твоя заметка будет подписана под словом везде, где оно встретится.</p>
<p><b>3. Расшифровывай страницы журнала.</b> Когда ты встретил все 4 слова страницы, на ней проявляются рисунки. Сопоставь каждое слово с рисунком. Если все четыре верны — слова открываются, и дальше ты видишь пару «английское · русское». Угаданные заранее слова дают бонус.</p>
<p><b>4. Действуй.</b> Люди просят о помощи: принести, найти, ответить. Если понял неправильно — тебе скажут об этом, тоже по-английски.</p>
<p><b>5. Эхо-камень</b> повторяет выученные слова в обе стороны: английский → русский и русский → английский. Чем чаще ты возвращаешься, тем крепче память.</p>
<p><b>Режимы текста</b> (⚙): «Только английский» — без подсказок; «Пары слов» — под словом твоя заметка или перевод; «С переводом» — ещё и вся фраза по-русски.</p>
<p><b>Управление:</b> нажми на землю, чтобы идти, или на человека/предмет, чтобы подойти и поговорить. На компьютере — WASD/стрелки и E/пробел.</p></div>`;
export function closeOver() { $('over').classList.add('hidden'); ui.over = false; closeCard(); changed(); }

// the deciphering: match 4 words with 4 drawings
function openPuzzle(pid) {
  const p = PAGES.find(p => p.id === pid); const st = (S.pages[pid] ||= {}); st.tries ||= 0;
  const slots = shuffle(p.words).map(w => ({ ans: w, put: null, lock: false }));
  const chips = shuffle(p.words); let sel = null;
  const B = $('oBody');
  const draw = (msg) => {
    B.innerHTML = `<div class="pz"><div class="pzh">Страница «${esc(p.title)}»<span class="muted"> · подбери к каждому рисунку слово</span></div>
      <div class="slots">${slots.map((s, k) => `<button class="slot ${s.put ? 'f' : ''} ${s.lock ? 'lock' : ''}" data-k="${k}"><span class="pic">${WORDS[s.ans].pic}</span><span class="sw">${s.put ? chipHTML(s.put === 'i' ? 'I' : s.put) : '?'}</span></button>`).join('')}</div>
      <div class="cpool">${chips.map(c => { const used = slots.some(s => s.put === c); return `<button class="chip ${used ? 'used' : ''} ${sel === c ? 'sel' : ''}" data-c="${c}">${chipHTML(c === 'i' ? 'I' : c)}</button>`; }).join('')}</div>
      <div class="pzmsg">${msg || 'Нажми на слово, потом на рисунок. Нажми на слово в рисунке, чтобы убрать.'}</div>
      <div class="crow"><button class="btn ghost" id="pzBack">← Назад</button><button class="btn ghost" id="pzHint">🕯️ Подсказка (${S.hints})</button><button class="btn" id="pzCheck" ${slots.every(s => s.put) ? '' : 'disabled'}>Проверить</button></div></div>`;
    B.querySelectorAll('.chip').forEach(b => b.onclick = () => { const c = b.dataset.c; speak(c === 'i' ? 'I' : c); if (slots.some(s => s.put === c)) return; sel = sel === c ? null : c; sfx('tap'); draw(); });
    B.querySelectorAll('.slot').forEach(b => b.onclick = () => {
      const s = slots[+b.dataset.k]; if (s.lock) return;
      if (sel) { const other = slots.find(x => x.put === sel); if (other) other.put = null; s.put = sel; sel = null; sfx('tap'); }
      else if (s.put) s.put = null;
      draw();
    });
    $('pzBack').onclick = () => openJournal('pages');
    $('pzHint').onclick = () => {
      if (S.hints < 1) { draw('Свечей нет. Они даются за новый ранг и находки.'); return; }
      const s = slots.find(s => !s.lock && s.put !== s.ans); if (!s) return;
      S.hints--; const other = slots.find(x => x.put === s.ans); if (other) other.put = null; s.put = s.ans; s.lock = true; save(); hud(); draw('Свеча осветила одно слово.');
    };
    $('pzCheck').onclick = () => {
      const ok = slots.filter(s => s.put === s.ans).length; st.tries++;
      if (ok === 4) return solved();
      sfx('bad'); save();
      draw(st.tries >= 2 ? `Не сходится. Верно: ${ok} из 4. Вспомни, где ты встречал эти слова.` : 'Что-то не сходится… Перечитай, где встречались эти слова (нажми на слово в словаре).');
    };
  };
  const solved = () => {
    st.done = true; sfx('page'); let bonus = 0; const lucky = [];
    for (const w of p.words) { const x = W(w); x.conf = true; x.due = Date.now() + 60000; if (x.note && guessMatches(w, x.note)) { bonus += 10; lucky.push(w); S.stats.guessed++; } }
    addXP(25 + bonus + (st.tries === 0 ? 10 : 0));
    B.innerHTML = `<div class="pz solved"><div class="pzh">✨ Страница «${esc(p.title)}» расшифрована!</div>
      <div class="slots">${p.words.map(w => `<div class="slot f ok"><span class="pic">${WORDS[w].pic}</span><span class="sw"><b>${w === 'i' ? 'I' : w}</b> · ${esc(WORDS[w].ru)}</span>${lucky.includes(w) ? '<span class="lucky">угадал!</span>' : ''}</div>`).join('')}</div>
      <div class="pzmsg">+${25 + bonus + (st.tries === 0 ? 10 : 0)} опыта${bonus ? ` · твоё чутьё угадало ${lucky.length} ${lucky.length === 1 ? 'слово' : 'слова'}` : ''}${st.tries === 0 ? ' · с первой попытки!' : ''}. Теперь эти слова подписаны переводом везде.</div>
      <div class="crow"><button class="btn" id="pzOk">К журналу</button></div></div>`;
    $('pzOk').onclick = () => openJournal('pages'); changed(); refreshTokens();
  };
  draw();
}

// ---------------------------------------------------------------- Echo trainer (spaced repetition, both directions)
const echoPool = () => Object.keys(WORDS).filter(id => S.words[id] && S.words[id].seen && (S.words[id].conf || S.words[id].peek));
export function openEcho() {
  closeCard(); const o = $('over'); o.classList.remove('hidden'); ui.over = true;
  const pool = echoPool();
  o.innerHTML = `<div class="ovh"><b>🔁 Эхо-камень</b><span class="ovs">повторение расшифрованных слов</span><button class="ib x" id="oClose">✕</button></div><div class="ovb" id="oBody"></div>`;
  $('oClose').onclick = closeOver;
  if (pool.length < 4) { $('oBody').innerHTML = '<p class="muted">Камень молчит. Расшифруй хотя бы одну страницу журнала — тогда он сможет повторять с тобой слова.</p>'; return; }
  const now = Date.now();
  const order = [...pool].sort((a, b) => (S.words[a].due > now) - (S.words[b].due > now) || S.words[a].lvl - S.words[b].lvl || Math.random() - 0.5);
  const deck = order.slice(0, Math.min(8, pool.length)); let k = 0, ok = 0;
  const B = $('oBody');
  const ask = () => {
    if (k >= deck.length) {
      addXP(ok * 4); S.stats.echo++; changed(); sfx(ok >= deck.length - 1 ? 'page' : 'ok');
      B.innerHTML = `<div class="ech"><div class="eq">Эхо стихло</div><div class="pzmsg">Верно ${ok} из ${deck.length} · +${ok * 4} опыта</div><div class="crow"><button class="btn ghost" id="eOut">Закрыть</button><button class="btn" id="eAgain">Ещё круг</button></div></div>`;
      $('eOut').onclick = closeOver; $('eAgain').onclick = openEcho; return;
    }
    const id = deck[k], D = WORDS[id], en = id === 'i' ? 'I' : id;
    const lvl = S.words[id].lvl; const ctxLine = contexts(id, 6).find(l => l[0].split(' ').length > 2);
    const type = lvl < 1 ? 'en2ru' : lvl < 2 ? (Math.random() < 0.5 ? 'ru2en' : 'ctx') : ['en2ru', 'ru2en', 'type', 'ctx', 'type'][Math.floor(Math.random() * 5)];
    const others = shuffle(pool.filter(x => x !== id)).slice(0, 3);
    let q = '', opts = null, typeIn = false;
    if (type === 'en2ru') { q = `<div class="eh">Что значит</div><div class="ew">${en} <button class="ib" id="eSay">🔊</button></div>`; opts = shuffle([id, ...others]).map(x => ({ v: x, l: WORDS[x].ru })); }
    else if (type === 'ru2en') { q = `<div class="eh">Как сказать по-английски</div><div class="ew ru">${esc(D.ru)} <span class="pic">${D.pic}</span></div>`; opts = shuffle([id, ...others]).map(x => ({ v: x, l: x === 'i' ? 'I' : x })); }
    else if (type === 'ctx' && ctxLine) { const blank = ctxLine[0].replace(new RegExp(`\\b(${[id, ...D.forms].join('|')})\\b`, 'i'), '_____'); q = `<div class="eh">Какое слово пропущено?</div><div class="ectx">${esc(blank)}</div>${ctxLine[1] ? `<div class="eru">${esc(ctxLine[1])}</div>` : ''}`; opts = shuffle([id, ...others]).map(x => ({ v: x, l: x === 'i' ? 'I' : x })); }
    else { typeIn = true; q = `<div class="eh">Напиши по-английски</div><div class="ew ru">${esc(D.ru)} <span class="pic">${D.pic}</span></div>`; }
    B.innerHTML = `<div class="ech"><div class="eprog">${k + 1} / ${deck.length}</div>${q}
      ${typeIn ? `<div class="crow"><input id="eIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="english word"><button class="btn" id="eGo">Ответ</button></div>` : `<div class="eopts">${opts.map(o => `<button class="btn ch" data-v="${o.v}">${esc(o.l)}</button>`).join('')}</div>`}
      <div class="pzmsg" id="eMsg"></div></div>`;
    if ($('eSay')) { $('eSay').onclick = () => speak(en); speak(en); }
    const done = (good, picked) => {
      srs(id, good); if (good) ok++;
      sfx(good ? 'ok' : 'bad'); speak(en);
      $('eMsg').innerHTML = good ? `✔ <b>${en}</b> — ${esc(D.ru)}` : `✗ Правильно: <b>${en}</b> — ${esc(D.ru)}${picked ? '' : ''}`;
      B.querySelectorAll('.eopts .btn').forEach(b => { b.disabled = true; if (b.dataset.v === id) b.classList.add('right'); else if (b.dataset.v === picked) b.classList.add('wrong'); });
      const nb = document.createElement('button'); nb.className = 'btn'; nb.textContent = 'Дальше ▶'; nb.onclick = () => { k++; ask(); }; $('eMsg').after(nb); nb.focus();
    };
    if (typeIn) { const inp = $('eIn'); const go = () => { const v = norm(inp.value); if (!v) return; inp.disabled = true; $('eGo').disabled = true; done(v === id || D.forms.includes(v), null); }; $('eGo').onclick = go; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); }; setTimeout(() => inp.focus(), 50); }
    else B.querySelectorAll('.eopts .btn').forEach(b => b.onclick = () => done(b.dataset.v === id, b.dataset.v));
  };
  ask();
}

// ---------------------------------------------------------------- settings
export function openSettings(onReset) {
  closeCard(); const o = $('over'); o.classList.remove('hidden'); ui.over = true;
  const vs = canSpeak() ? voiceList() : [];
  o.innerHTML = `<div class="ovh"><b>⚙ Настройки</b><span class="ovs"></span><button class="ib x" id="oClose">✕</button></div><div class="ovb"><div class="set">
    <div class="sh">Как показывать текст</div>
    ${[['en', 'Только английский', 'без подсказок — как настоящий исследователь'], ['pairs', 'Пары слов', 'под каждым словом твоя догадка или перевод'], ['ru', 'С русским переводом', 'пары слов и вся фраза по-русски']].map(([v, t, d]) => `<label class="opt"><input type="radio" name="mode" value="${v}" ${S.mode === v ? 'checked' : ''}><b>${t}</b><span>${d}</span></label>`).join('')}
    <div class="sh">Голос</div>
    <label class="opt"><input type="checkbox" id="sAuto" ${S.autoVoice ? 'checked' : ''}><b>Читать реплики вслух</b><span>каждая фраза озвучивается сама</span></label>
    ${vs.length ? `<select id="sVoice"><option value="">Лучший голос автоматически</option>${vs.map(v => `<option ${S.voice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : '<p class="muted">Озвучка недоступна в этом браузере.</p>'}
    <div class="sh">Прогресс</div><p class="muted">Ранг: ${rank()} · встречено слов ${progress().met} · угадано заранее ${S.stats.guessed}</p>
    <button class="btn ghost danger" id="sReset">Начать игру заново</button>
    <p class="muted small">Это отдельная игра. Английский курс — по своей ссылке, прогресс у них не пересекается.</p></div></div>`;
  $('oClose').onclick = closeOver;
  o.querySelectorAll('input[name=mode]').forEach(r => r.onchange = () => { S.mode = r.value; changed(); refreshTokens(); });
  $('sAuto').onchange = e => { S.autoVoice = e.target.checked; save(); };
  if ($('sVoice')) $('sVoice').onchange = e => { S.voice = e.target.value; save(); speak('Hello, stranger!'); };
  $('sReset').onclick = () => { if (confirm('Стереть весь прогресс игры и начать сначала?')) onReset(); };
}
