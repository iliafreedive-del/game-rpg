// Кузнец Горан: коренастый, фартук, закатанные рукава, молот в правой руке (Meshy, сборка 56); без шкуры — процедурный житель.
// Клип forge — удар по наковальне (renderer3d.js гоняет его по кругу, пока герой не подошёл). Как бьют кузнецы: молот держат
// у конца рукояти, локоть поднимают до плеча, молот уходит вверх-назад, вниз идёт всей рукой с доворотом кисти, боёк ложится
// на поковку плашмя и отскакивает — отскок начинает следующий замах. Левая рука держит клещи с поковкой на наковальне.
import { villager } from './_villager.js';
import { skinnedNpc } from './_skinned.js';
// ключи: доля цикла → [плечо, локоть, кисть, наклон корпуса] (повороты вокруг X, как у рига героя _hero.js)
const KEYS = [[0, [-1.1, -0.9, 2.2, 0.1]], [0.42, [-1.5, -1.7, 2.3, -0.05]], [0.54, [-1.0, -0.5, 2.52, 0.18]], [0.64, [-1.15, -0.75, 2.35, 0.14]], [1, [-1.1, -0.9, 2.2, 0.1]]];
export const FORGE_HIT = 0.54;   // момент удара в цикле (искры и звон — renderer3d.js)
const ease = t => t * t * (3 - 2 * t);
function keyAt(k, light) {
  let i = 0; while (i < KEYS.length - 2 && k >= KEYS[i + 1][0]) i++;
  const [k0, a] = KEYS[i], [k1, b] = KEYS[i + 1], t = i === 1 ? ((k - k0) / (k1 - k0)) ** 2 : ease((k - k0) / (k1 - k0));   // вниз — с разгоном
  return a.map((v, j) => { const x = v + (b[j] - v) * t, r = KEYS[0][1][j]; return light && j < 2 ? r + (x - r) * 0.45 : x; });   // лёгкий удар — замах вдвое ниже
}
export default { id: 'npc_smith', kind: 'npc', outline: 'mob', build: kit => skinnedNpc(kit, 'npc_smith',
  () => villager(kit, { cloth: 0x7a4a2a, clothTop: 0xa86a3a, sleeve: 0x8a5a38, apron: 0x2a2018, hair: 0x2a1a10, beard: 0x3a2418, girth: 1.3, height: 1.78, skin: 0xc58e66 }),
  { clips: { forge: { loop: true } }, anims: m => ({
    forge: a => {
      const B = m.bones; m.anims.idle({ ...a, t: a.t * 0.5 });
      const [ar, el, hd, lean] = keyAt(a.k ?? 0, a.combo % 4 === 3);
      B.armR.rotation.set(ar, 0, 0.1); B.elR.rotation.x = el; B.handR.rotation.x = hd; B.torso.rotation.x += lean; B.head.rotation.x += 0.18 - lean * 0.5;
      B.armL.rotation.set(-0.75, 0, 0.18); B.elL.rotation.x = -0.95;   // клещи с поковкой — на наковальне
    },
  }) }) };
