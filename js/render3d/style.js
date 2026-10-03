// Dark Ascent · единый модуль стиля. Решения закреплены в docs/ART_BIBLE.md; числа живут ТОЛЬКО здесь.
// Фирменный стиль: «кость, латунь и бездна» (общая палитра) + два набора окружения: 'torch' (основной, утверждён) и 'dark' (холодный, сравнение).
// Цвета заданы hex, цвета вершин в геометрии рисуются из этих значений; рисованные фактуры поверх — js/render3d/textures.js.

// ---------- бренд-палитра (общая для всех видов) ----------
export const PAL = {
  abyss: 0xb48cff, abyssD: 0x6b3fd0,          // Бездна: главный акцент (рунные знаки, глаза, портал, магия)
  brass: 0xd6a548, brassD: 0x8a6428,          // латунь: окантовка, пряжки, подсвечники
  bone: 0xe8dcc0, boneD: 0xa89a7c,            // кость: рога, черепа, шипы
  fire: 0xff9a3c,                             // огонь факелов: второй акцент
  teal: 0x4af0cc,                             // бирюзовое свечение склепа (саркофаги, кристаллы), только torch-вид
};

// ---------- герой: материалы брони и пропорции ----------
export const HERO = {
  height: 2.0, headHeight: 0.5, ratio: 4,       // рост 2.0 м, голова 0.5 м → 1:4 (рога и гребень не считаются)
  speed: 4.2, stanceFraction: 0.42, attackTime: 0.5, hitAt: 0.42,
  steel: 0x5a6486, steelL: 0x9eaacc, steelD: 0x2e3656, dark: 0x1c2036,   // светлее окружения: герой — самый светлый силуэт
  cape: 0x6a3fd0, capeHem: 0x24134e,
  visor: 0xe9dcff, blade: 0xaab4cc, shield: 0x2c2650, shieldL: 0x5a46a0,
  rim: 0.9, rimColor: 0xc8a8ff,
  scale: 1.1,                                    // героя рисуем на 10 % крупнее (Torchlight: герой крупнее окружения); коллизии не меняются
};

// ---------- нежить Палача Бездны ----------
export const MOB = {
  bone: 0xe4d8ba, boneD: 0x9a8c70, rust: 0x8a5a3c, iron: 0x59627a, dark: 0x0d0a16, eye: 0xc9a8ff,
  skin: 0x6d7b72, skinL: 0xaebca6, robe: 0x2c1f5c, robeL: 0x5b44b0, ghoulEye: 0xffd45a,
  rim: 0.7, rimColor: { skel: 0xffe2b8, ghoul: 0xd8ffb0, mage: 0xc9aaff },
  heights: { skel: 2.0, ghoul: 1.7, mage: 2.5 },   // ≈ м, с рогами/шлемом
};

// ---------- обводка (inverted hull) и подсветка краёв ----------
export const OUTLINE = { hero: 0.028, mob: 0.026, stone: 0.035, prop: 0.03, small: 0.022, heroColor: 0x07050f };   // цвет обводки мира берётся из LOOKS[look].ol
export const RIM = { prop: 0.4, crystal: 0.6, tree: 0.5, trim: 0.25, treeColor: 0xe8ffb0, pineColor: 0xd8ffc8, crystalColor: 0xbfffee, trimColor: 0xffe2a0, torchColor: 0xffd890 };

// ---------- окружение: камни, земля, туман, трава ----------
export const LOOKS = {
  dark: { base: 0x30364c, top: 0x8089a6, slabB: 0x2c3248, slabT: 0x6a7390, capB: 0x3a4058, capT: 0x959db8, lintB: 0x363c54, lintT: 0x8a93b0, hue: 0.62, sat: 0.1, lk: 1, ol: 0x07050f,
    gA: 0x232a3b, gB: 0x2f3a4a, gM: 0x1f3a3a, gS: 0x3a3f55, rim: 0xa9b4ff, mist: [0x4a4f8c, 0x3c3a78, 0x2c2c66], mistK: 1, grass: [0x10282c, 0x4e8f8c, 0x8c78c8, [0.8, 0.85, 1]] },
  torch: { base: 0x3e3a30, top: 0x9a8c68, slabB: 0x40361f, slabT: 0x9c8450, capB: 0x4a4636, capT: 0xa89a74, lintB: 0x443e30, lintT: 0xa49670, hue: 0.11, sat: 0.3, lk: 1.0, ol: 0x1c0f08,
    gA: 0x2c2a1c, gB: 0x3a3422, gM: 0x1e4034, gS: 0x3a2e1a, rim: 0xffe2a8, mist: [0x3f7a70, 0x2f6a62, 0x275a56], mistK: 0.8, grass: [0x143a26, 0x5aa65a, 0xb8b45a, [0.9, 0.95, 0.9]] },
};
// листва torch-вида: HSL, гранёные листовые пластины (светлее к верхушке)
export const FOLIAGE = {
  leafHue: 0.29, leafTipHue: 0.24, pineHue: 0.36, pineTipHue: 0.27,
  core: 0x12301c, coreTop: 0x1f4a26, bark: 0x3a2416, barkL: 0x8a5a34,
};

// ---------- свет и туман ----------
export const LIGHT = {
  torch: {
    clear: 0x1d3836, fog: { color: 0x1d3836, near: 38, far: 95 },
    hemi: { sky: 0x8fb0a4, ground: 0x4a3826, i: 1.1 },
    key: { color: 0xffd8a0, i: 1.7, offset: [9, 12, 3] },          // «луна» с тёплым оттенком, со стороны камеры
    warm: { color: 0xff9a4a, i: 26, dist: 15, decay: 1.5 },        // ЕДИНСТВЕННЫЙ тёплый источник: перепрыгивает к ближайшему факелу
    violet: { color: 0x9a62ff, i: 9, dist: 9, decay: 1.6, y: 2.0 }, // ЕДИНСТВЕННЫЙ фиолетовый: у врат
  },
  dark: {
    clear: 0x12102a, fog: { color: 0x12102a, near: 22, far: 50 },
    hemi: { sky: 0x6a86c8, ground: 0x121a34, i: 1.2 },
    key: { color: 0x9fb2ff, i: 1.5, offset: [9, 12, 3] },
    warm: { color: 0xff9a4a, i: 18, dist: 11, decay: 1.5 },
    violet: { color: 0x9a62ff, i: 9, dist: 9, decay: 1.6, y: 2.0 },
  },
  // деревня на закате: тёплое небо у горизонта, зелёная трава, фонари и порталы дают пятна света (см. ART_BIBLE, раздел 5)
  village: {
    clear: 0x35524e, fog: { color: 0x35524e, near: 42, far: 105 },
    hemi: { sky: 0xa6c2b8, ground: 0x4e3a26, i: 1.15 },
    key: { color: 0xffd09a, i: 1.9, offset: [9, 12, 3] },
    warm: { color: 0xff9a4a, i: 20, dist: 14, decay: 1.5 },
    violet: { color: 0x9a62ff, i: 12, dist: 11, decay: 1.6, y: 2.0 },
  },
  // деревня с тенями и постобработкой (основной пресет игры): солнце слева сверху от экрана, тени падают вправо-вниз,
  // холодное бирюзовое небо (заполняющий свет) против тёплого золотого солнца, как на референсах
  village3: {
    clear: 0x2c4a48, fog: { color: 0x4a6a64, near: 22, far: 78 },   // дальняя дымка гуще (сборка 12: «атмосферный туман»), у земли — пласты atmo.js
    hemi: { sky: 0xa8d0d4, ground: 0x8a6a48, i: 1.6 },
    key: { color: 0xffd49a, i: 3.0, offset: [-11, 24, 20] },     // экран: сверху слева, чуть со стороны камеры
    warm: { color: 0xff9a4a, i: 7.5, dist: 12, decay: 1.9 },
    violet: { color: 0x9a62ff, i: 14, dist: 11, decay: 1.6, y: 2.0 },
  },
  // походы: Фьорды — холодный яркий день над снегом; Старый Лес — солнечный, как деревня
  wildFjord: {
    clear: 0x9db8d0, fog: { color: 0xb0c8dc, near: 34, far: 96 },
    hemi: { sky: 0xcfe4f6, ground: 0xdde8f2, i: 1.55 },
    key: { color: 0xfff0dc, i: 2.7, offset: [-11, 24, 20] },
    warm: { color: 0xff9a4a, i: 13, dist: 14, decay: 1.8 },
    violet: { color: 0x9a62ff, i: 14, dist: 11, decay: 1.6, y: 2.0 },
  },
  wildForest: {
    clear: 0x2c4a40, fog: { color: 0x3a5a4c, near: 32, far: 90 },
    hemi: { sky: 0xa8d0c0, ground: 0x6a5a38, i: 1.6 },
    key: { color: 0xffe0a8, i: 3.0, offset: [-11, 24, 20] },
    warm: { color: 0xff9a4a, i: 8, dist: 12, decay: 1.9 },
    violet: { color: 0x9a62ff, i: 10, dist: 10, decay: 1.6, y: 2.0 },
  },
  // подземелья (катакомбы, глубины): холодная синева вместо неба, тёплые факелы — пул ближайших точечных огней;
  // луна сверху даёт тени колонн и стен. Биомы глубин подкрашивают заливку и туман (biome)
  crypt: {
    clear: 0x0a0e18, fog: { color: 0x141a2a, near: 30, far: 80 },
    hemi: { sky: 0x86a4d0, ground: 0x4a3c30, i: 2.5 },
    key: { color: 0x9ab4ff, i: 1.1, offset: [-11, 24, 20] },
    point: { i: 22, dist: 12, decay: 1.6 }, exposure: 1.5,
    hero: { color: 0xffe2b8, i: 7.2, dist: 10, decay: 1.5, y: 2.8 },   // мягкий свет вокруг героя: он не теряется в темноте
    biome: { flooded: { sky: 0x4a90a8, fog: 0x08181e }, ash: { sky: 0xa0583a, fog: 0x1a0a06 }, abyss: { sky: 0x7a5ab8, fog: 0x120a20 } },
  },
  // цитадель Ордена и арена: светло и читаемо (тёплый камень, золото)
  castle: {
    clear: 0x141218, fog: { color: 0x2a2630, near: 34, far: 90 },
    hemi: { sky: 0xb0b8d0, ground: 0x5a4a38, i: 1.5 },
    key: { color: 0xffe0b0, i: 2.0, offset: [-11, 24, 20] },
    point: { i: 12, dist: 10, decay: 1.7 },
  },
  slashColor: 0xc9a8ff,
};

// ---------- камера ----------
export const CAMERA = {
  fov: 30, near: 0.5, far: 160,
  yaw: Math.PI / 4,                                  // 45°, как в 2D-версии игры
  torch: { pitch: 0.64, dist: 30, aim: 1.0 },        // pitch ≈ 37° над горизонтом; герой выше центра кадра, снизу запас обзора
  dark: { pitch: 0.74, dist: 15, aim: 2.6 },
  village: { pitch: 0.64, dist: 30, aim: 1.0 },       // как torch-вид
  portrait: { maxScale: 1.5, refAspect: 0.85 },      // на вертикальном экране дистанция растёт, чтобы ширина обзора не падала
  follow: { lead: 0.25, smooth: 5, targetY: 0.8 },
  shake: { decay: 2.5, amp: 0.4 }, hitStop: 0.06,
};

// ---------- тени (одна shadow map направленного света вокруг цели камеры) ----------
export const SHADOW = {
  half: 19, ahead: 3.0,           // полуразмер ортокамеры тени, м; сдвиг центра от цели камеры вглубь кадра (туда видно дальше)
  bias: -0.0006, normalBias: 0.03, radius: 3, intensity: 0.8,   // intensity: доля света, которую забирает тень (мягкие цветные тени)
  grassDark: 0.58, groundAO: 0.62, // яркость травы в тени; затенение у земли (низ предметов и персонажей) — запечённый «AO по высоте»
};
// ---------- постобработка (js/render3d/post.js) ----------
export const POST = {
  exposure: 1.25, contrast: 1.0, saturation: 1.06,
  shadowTint: 0x9fc4cc,          // тени уходят в холодную бирюзу
  highTint: 0xfff0d4,            // света — в тёплое золото
  vignette: 0.42, grain: 0.006,
  bloom: { threshold: 1.25, knee: 0.3, strength: 0.32 },   // слабее и только для действительно ярких огней: доспехи и шляпы не «горят» у фонарей
};

// ---------- качество и ветер ----------
// shadow — размер shadow map (0 — без теней), post — постобработка (bloom, цветокоррекция, виньетка), msaa — сглаживание цели постобработки
export const QUALITY = {
  low: { name: 'Низкое', pr: 1, shadow: 0, post: false, msaa: 0, bloom: 0, decor: 0.35, light: 0.8, points: 3 },   // light: без кривой тонов свет чуть слабее
  med: { name: 'Среднее', pr: 1.5, shadow: 1024, post: true, msaa: 0, bloom: 3, decor: 0.7, points: 4 },
  high: { name: 'Высокое', pr: 2, shadow: 2048, post: true, msaa: 4, bloom: 4, decor: 1, points: 6 },   // points — настоящих огней в подземелье
};
export const GRASS_K = { low: 0.3, med: 0.6, high: 1 };
// трава деревни (пучки по 5 травинок): низ сливается с рисованной землёй, кончики — сочный жёлто-зелёный, редкие сухие
export const GRASS = { base: 0x2c4a1a, tip: 0x9ccc48, dry: 0xd6c46a };
export const WIND = [{ name: 'Штиль', s: 0.35 }, { name: 'Ветер', s: 1 }, { name: 'Буря', s: 2.1 }];

// ---------- лимиты нагрузки (High, 1280×720, деревня; draw calls — весь кадр: тени + сцена + постобработка). См. ART_BIBLE, раздел 9 ----------
export const BUDGET = {
  drawCalls: { limit: 260, high: 162, low: 74, phone: 121, before: 254 },        // before — до теней/постобработки/скининга
  triangles: { limit: 350000, shadowLimit: 100000, high: 348000, highShadow: 77000, low: 210000, phone: 256000 },
  texturesBytes: 0, textureVRAM: 18e6, externalAssets: 0, realLights: 3, shadowMaps: 1,   // фактуры генерируются на canvas; свет: солнце + 2 точечных
};

// ---------- какой вид включён ----------
export const lookName = () => (typeof window !== 'undefined' && window.LOOK) || new URLSearchParams(location.search).get('look') || 'dark';
