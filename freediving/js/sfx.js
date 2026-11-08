// Звуки (WebAudio), голос (speechSynthesis), вибрация. Всё безопасно отключается, если браузер не умеет.
let ac = null;
export function beep(freq = 660, dur = 0.12, vol = 0.18) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur + 0.02);
  } catch { /* без звука */ }
}
export function unlockAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch { } }
export function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('ru'));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { }
}
export function vibrate(p) { try { const s = JSON.parse(localStorage.getItem('freedive-school-v1') || '{}'); if (s.vibro === false) return; navigator.vibrate && navigator.vibrate(p); } catch { } }
let lock = null;
export async function keepAwake(on) {
  try {
    if (on && !lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => (lock = null)); }
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}
