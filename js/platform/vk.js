// VK Игры (ВКонтакте + Одноклассники), сборка 52: адаптер VK Bridge с тем же интерфейсом, что YandexProvider (platform.js).
// Включается, когда игра открыта внутри VK (в адресе есть параметры запуска vk_app_id/vk_platform) или с ?vk=1.
// Есть: пауза и звук по ViewHide/ViewRestore, реклама (reward и interstitial через NativeAds), сохранения в VK Storage.
// Нет: покупки за голоса — для них нужен свой HTTPS-сервер (callback get_item / order_status_change), поэтому каталог пуст
// и лавка за рубли в VK не показывается. Таблиц рекордов и отзывов тоже нет.
import { bus } from '../game/ctx.js';

export function onVK() {
  const q = new URLSearchParams(location.search); return q.has('vk_app_id') || q.has('vk_platform') || q.has('vk');
}

// VK Storage: значение до 4096 байт на ключ, до 1000 ключей. Сохранение — JSON → deflate (если браузер умеет) → base64,
// режется на куски по 4000 символов: save_0…save_N, затем save_meta { n, z, ts }. Пишутся только изменившиеся куски, meta — последней,
// поэтому оборванная запись не портит прошлое сохранение целиком (старая meta указывает на старое число кусков).
const CHUNK = 4000, MAX_CHUNKS = 400;
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const canZ = typeof CompressionStream !== 'undefined';
async function pipe(u8, T) { const r = new Response(new Blob([u8]).stream().pipeThrough(T)); return new Uint8Array(await r.arrayBuffer()); }
async function pack(obj) { const u8 = new TextEncoder().encode(JSON.stringify(obj)); return canZ ? { z: 1, s: b64(await pipe(u8, new CompressionStream('deflate-raw'))) } : { z: 0, s: b64(u8) }; }
async function unpack(s, z) { const u8 = unb64(s); return JSON.parse(new TextDecoder().decode(z ? await pipe(u8, new DecompressionStream('deflate-raw')) : u8)); }

export class VKProvider {
  constructor() { this.name = 'vk'; this.bridge = null; this.written = []; this.saving = false; this.pending = null; }
  async init() {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/vk-bridge.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    this.bridge = window.vkBridge;
    // вне VK мост не отвечает — через 4 с считаем, что VK нет (initPlatform переключится на демо)
    await Promise.race([this.bridge.send('VKWebAppInit'), new Promise((_, rej) => setTimeout(() => rej(new Error('VKWebAppInit timeout')), 4000))]);
    // требование модерации VK: при сворачивании игра на паузе и без звука
    this.bridge.subscribe(e => { const t = e && e.detail && e.detail.type; if (t === 'VKWebAppViewHide') bus.emit('platformPause', true); else if (t === 'VKWebAppViewRestore') bus.emit('platformPause', false); });
    return true;
  }
  sup(m) { try { return this.bridge.supports ? this.bridge.supports(m) : true; } catch { return true; } }
  ready() { } gameplayStart() { } gameplayStop() { }
  lang() { return 'ru'; }
  async ad(format) {
    try {
      const c = await this.bridge.send('VKWebAppCheckNativeAds', { ad_format: format }); if (!c || !c.result) return false;
      const r = await this.bridge.send('VKWebAppShowNativeAds', { ad_format: format }); return !!(r && r.result);
    } catch (e) { console.warn('vk ad', format, e); return false; }
  }
  showRewarded() { return this.ad('reward'); }   // награда — только если VK ответил result: true (видео досмотрено)
  showInterstitial() { return this.ad('interstitial'); }
  async purchase() { return { ok: false }; }
  async consume() { return true; }
  async getPurchases() { return []; }
  catalogPrice() { return null; }
  hasProduct() { return false; }
  async requestReview() { return false; }
  async setLeaderboardScore() { return false; } async getLeaderboard() { return null; }
  async flags() { return {}; } async canShortcut() { return false; } async shortcut() { return false; }
  async get(keys) { const r = await this.bridge.send('VKWebAppStorageGet', { keys }); const o = {}; for (const k of (r && r.keys) || []) o[k.key] = k.value; return o; }
  async cloudLoad() {
    try {
      const m = (await this.get(['save_meta'])).save_meta; if (!m) return null;
      const meta = JSON.parse(m); const keys = Array.from({ length: meta.n }, (_, i) => 'save_' + i);
      const got = await this.get(keys); const parts = keys.map(k => got[k] || '');
      if (parts.some(p => !p)) return null;
      this.written = parts.slice();
      return await unpack(parts.join(''), meta.z);
    } catch (e) { console.warn('vk load', e); return null; }
  }
  // сохранения идут раз в 15 с (game.js); если прошлое ещё пишется — запоминаем только последнее
  async cloudSave(obj) {
    if (this.saving) { this.pending = obj; return true; }
    this.saving = true;
    try {
      const { z, s } = await pack(obj); const n = Math.ceil(s.length / CHUNK);
      if (n > MAX_CHUNKS) { console.warn('vk save too big', s.length); return false; }
      for (let i = 0; i < n; i++) { const v = s.slice(i * CHUNK, (i + 1) * CHUNK); if (this.written[i] === v) continue; await this.bridge.send('VKWebAppStorageSet', { key: 'save_' + i, value: v }); this.written[i] = v; }
      await this.bridge.send('VKWebAppStorageSet', { key: 'save_meta', value: JSON.stringify({ n, z, ts: Date.now() }) });
      this.written.length = n; return true;
    } catch (e) { console.warn('vk save', e); return false; }
    finally { this.saving = false; if (this.pending) { const p = this.pending; this.pending = null; this.cloudSave(p); } }
  }
  // социальные механики VK (кнопки в меню — по желанию): пригласить друзей, добавить в избранное
  async invite() { try { await this.bridge.send('VKWebAppShowInviteBox', {}); return true; } catch { return false; } }
  async favorite() { try { const r = await this.bridge.send('VKWebAppAddToFavorites'); return !!(r && r.result); } catch { return false; } }
}
