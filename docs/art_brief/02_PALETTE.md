# 02. Палитра и числа стиля (выдержка из кода игры)

Цвета — hex. Это точные значения, которыми игра красит модели.

```js
export const PAL = {
  abyss: 0xb48cff, abyssD: 0x6b3fd0,          // Бездна: главный акцент (рунные знаки, глаза, портал, магия)
  brass: 0xd6a548, brassD: 0x8a6428,          // латунь: окантовка, пряжки, подсвечники
  bone: 0xe8dcc0, boneD: 0xa89a7c,            // кость: рога, черепа, шипы
  fire: 0xff9a3c,                             // огонь факелов: второй акцент
  teal: 0x4af0cc,                             // бирюзовое свечение склепа (саркофаги, кристаллы), только torch-вид
};

export const HERO = {
  height: 2.0, headHeight: 0.5, ratio: 4,       // рост 2.0 м, голова 0.5 м → 1:4 (рога и гребень не считаются)
  speed: 4.2, stanceFraction: 0.42, attackTime: 0.5, hitAt: 0.42,
  steel: 0x5a6486, steelL: 0x9eaacc, steelD: 0x2e3656, dark: 0x1c2036,   // светлее окружения: герой — самый светлый силуэт
  cape: 0x6a3fd0, capeHem: 0x24134e,
  visor: 0xe9dcff, blade: 0xaab4cc, shield: 0x2c2650, shieldL: 0x5a46a0,
  rim: 0.9, rimColor: 0xc8a8ff,
  scale: 1.1,                                    // героя рисуем на 10 % крупнее (Torchlight: герой крупнее окружения); коллизии не меняются
};

export const MOB = {
  bone: 0xe4d8ba, boneD: 0x9a8c70, rust: 0x8a5a3c, iron: 0x59627a, dark: 0x0d0a16, eye: 0xc9a8ff,
  skin: 0x6d7b72, skinL: 0xaebca6, robe: 0x2c1f5c, robeL: 0x5b44b0, ghoulEye: 0xffd45a,
  rim: 0.7, rimColor: { skel: 0xffe2b8, ghoul: 0xd8ffb0, mage: 0xc9aaff },
  heights: { skel: 2.0, ghoul: 1.7, mage: 2.5 },   // ≈ м, с рогами/шлемом
};

export const FOLIAGE = {
  leafHue: 0.29, leafTipHue: 0.24, pineHue: 0.36, pineTipHue: 0.27,
  core: 0x12301c, coreTop: 0x1f4a26, bark: 0x3a2416, barkL: 0x8a5a34,
};
```

Камера: поворот 45°, наклон ≈37° над горизонтом (0.64 рад), дистанция 30 м, угол обзора 30°. Персонажи видны сверху-сбоку, примерно как на скриншотах.
Освещение: тёплое солнце сверху-слева + холодное бирюзовое небо; тени трёхступенчатые (тон-шейдинг), обводка только у персонажей и оружия.
