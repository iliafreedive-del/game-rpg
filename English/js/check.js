// Проверка ответов: нормализация, сокращения, цифры, опечатки и сравнение сказанного вслух.

const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is', "what's": 'what is',
  "where's": 'where is', "who's": 'who is', "how's": 'how is', "there's": 'there is', "here's": 'here is',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
  "can't": 'can not', 'cannot': 'can not', "couldn't": 'could not', "won't": 'will not',
  "shouldn't": 'should not', "mustn't": 'must not', "haven't": 'have not', "hasn't": 'has not',
  "i'll": 'i will', "you'll": 'you will', "he'll": 'he will', "she'll": 'she will', "it'll": 'it will',
  "we'll": 'we will', "they'll": 'they will', "i've": 'i have', "you've": 'you have', "we've": 'we have',
  "they've": 'they have', "i'd": 'i would', "let's": 'let us',
};

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

export function normalize(s) {
  return s.toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:"«»()—–-]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map(w => CONTRACTIONS[w] || (/^\d+$/.test(w) && NUM[+w]) || w)
    .join(' ')
    // «7 o'clock» и «seven» засчитываем одинаково, если в эталоне есть o'clock
    .replace(/\bo'?clock\b/g, "o'clock")
    .trim();
}

export const words = s => normalize(s).split(' ').filter(Boolean);

// Слова для плиток: оригинальный регистр, без знаков препинания по краям.
export const tilesOf = s => s.split(/\s+/).map(w => w.replace(/^[«"(]+|[.,!?;:»")]+$/g, '')).filter(Boolean);

export function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Опечатка — одно слово отличается на одну букву, слово длинное и это не грамматика (works / work).
function typoOnly(a, b) {
  const x = a.split(' '), y = b.split(' ');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] === y[i]) continue;
    diff++;
    const [p, q] = [x[i], y[i]];
    const swap = p.length === q.length && [...p].sort().join('') === [...q].sort().join('') && lev(p, q) === 2;
    if (Math.min(p.length, q.length) < 5 || (lev(p, q) > 1 && !swap)) return false;
    if (p.startsWith(q) || q.startsWith(p)) return false;
  }
  return diff === 1;
}

// Возвращает {ok, typo}. variants — все верные ответы.
export function checkText(input, variants) {
  const a = normalize(input);
  if (!a) return { ok: false };
  for (const v of variants) if (normalize(v) === a) return { ok: true };
  for (const v of variants) if (typoOnly(a, normalize(v))) return { ok: true, typo: true };
  return { ok: false };
}

// Сказанное вслух: доля слов эталона, найденных по порядку (LCS), с поправкой на лишние слова.
export function speechScore(heard, target) {
  const h = words(heard), t = words(target);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(h.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++)
    for (let j = 1; j <= h.length; j++)
      dp[i][j] = t[i - 1] === h[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  // какие слова эталона распознаны
  const hit = new Array(t.length).fill(false);
  for (let i = t.length, j = h.length; i > 0 && j > 0;) {
    if (t[i - 1] === h[j - 1]) { hit[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  const lcs = dp[t.length][h.length];
  const score = t.length ? lcs / Math.max(t.length, h.length) : 0;
  return { score, hit, t };
}

export const speechOk = (score, n) => score >= (n <= 3 ? 0.99 : n <= 5 ? 0.79 : 0.74);
