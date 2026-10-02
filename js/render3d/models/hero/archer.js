// Герой-лучник «Вороний страж»: тёмный капюшон и маска ворона с клювом, воротник и накидка из вороньих перьев, кожаная куртка со шнуровкой,
// колчан со стрелами за спиной (плаща нет: он по ветру торчал из спины, как меч). Лук — в левой руке (оружие, а не часть модели), клип cast = натянуть тетиву. Тело и риг — общие с воином (_hero.js).
import { heroModel } from './_hero.js';
function torso({ kit, STEEL, STEEL_L, STEEL_D, DARK, LEATHER, LEATHER_L, BR, BR_D, TOP }) {
  const { THREE, part, bbox, lathe, tube } = kit, L = [];
  L.push(lathe([[0.2, -0.34], [0.27, -0.32], [0.26, -0.05], [0.2, 0.05]], DARK, [0, 0, 0], 0, 1, { top: 0xb8603a, tex: 'cloth' }, 12));                       // тун    ика
  L.push(lathe([[0.235, 0], [0.245, 0.03], [0.245, 0.09], [0.235, 0.12]], LEATHER, [0, 0, 0], 0, 1, { top: LEATHER_L, tex: 'leather' }, 12), bbox(0.12, 0.1, 0.05, 0.015, BR_D, [0, 0.06, 0.24], 0, { top: BR }));
  for (const sx of [-1, 1]) L.push(bbox(0.13, 0.16, 0.09, 0.025, LEATHER, [sx * 0.24, 0.0, 0.14], [0, sx * 0.4, 0], { top: LEATHER_L, tex: 'leather' }));   // подсумки
  L.push(bbox(0.2, 0.3, 0.05, 0.015, 0x5a2a1a, [0, -0.2, 0.26], [0.08, 0, 0], { top: 0xc07040, tex: 'cloth' }));
  L.push(lathe([[0.2, 0.1], [0.265, 0.2], [0.3, 0.38], [0.3, 0.5], [0.26, 0.62], [0.17, 0.7]], STEEL, [0, 0, 0], 0, [1.05, 1, 0.8], TOP(STEEL_L), 14));      // куртка
  L.push(bbox(0.07, 0.52, 0.03, 0.01, 0x1a1208, [0, 0.4, 0.248], [-0.1, 0, 0]));                                                                          // шнуровка
  for (let i = 0; i < 6; i++) L.push(bbox(0.14, 0.018, 0.02, 0.005, LEATHER_L, [0, 0.2 + i * 0.085, 0.262], [-0.1, 0, i % 2 ? 0.5 : -0.5]));
  L.push(part(new THREE.TorusGeometry(0.2, 0.075, 6, 14), 0x5a4a30, [0, 0.66, 0.0], [Math.PI / 2, 0, 0], [1.1, 1, 0.9], { top: 0xa89868, tex: 'cloth' }));   // меховой воротник
  for (const sx of [-1, 1]) L.push(part(new THREE.SphereGeometry(0.2, 10, 7, 0, 6.283, 0, 1.5708), STEEL_D, [sx * 0.46, 0.56, 0], [0, 0, -sx * 0.3], [1, 0.8, 1.05], TOP(STEEL)), part(new THREE.TorusGeometry(0.2, 0.018, 4, 14), BR_D, [sx * 0.46, 0.56, 0], [Math.PI / 2, 0, 0], [1, 1.05, 1]));
  // колчан со стрелами за спиной и перевязь
  L.push(part(new THREE.CylinderGeometry(0.095, 0.08, 0.7, 9), 0x4a2c18, [0.14, 0.45, -0.3], [0.25, 0, -0.35], 1, { top: 0x8a5a32, tex: 'leather' }), part(new THREE.TorusGeometry(0.09, 0.015, 4, 10), BR_D, [0.14, 0.72, -0.3], [Math.PI / 2 + 0.25, 0, -0.35]));
  for (let i = 0; i < 5; i++) { const a = i * 1.26, x = 0.2 + Math.cos(a) * 0.03, z = -0.36 + Math.sin(a) * 0.03; L.push(tube([[x - 0.02, 0.8, z], [x + 0.03, 0.96, z - 0.05]], 0.012, 0.012, 0xd8c8a0, { top: 0xf0e4c0 }, 4), part(new THREE.ConeGeometry(0.035, 0.1, 3), 0xe8dcc0, [x + 0.035, 0.99, z - 0.055], [-0.4, 0, -0.3], [1, 1, 0.3]), part(new THREE.ConeGeometry(0.04, 0.12, 3), 0xc03a2a, [x + 0.01, 0.86, z - 0.02], [Math.PI, 0, 0], [1, 1, 0.3]));}
  L.push(bbox(0.07, 0.8, 0.03, 0.01, LEATHER, [0.0, 0.4, 0.26], [-0.1, 0, 0.62], { top: LEATHER_L, tex: 'leather' }));
  // накидка из вороньих перьев: два яруса перьев по плечам и спине; чёрные, с сине-фиолетовым отливом сверху
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.283 + ring * 0.22, R = 0.36 + ring * 0.1, y = 0.7 - ring * 0.16, back = Math.sin(a) < 0.5 ? 1 : 0.4;   // спереди перьев меньше
    L.push(part(new THREE.ConeGeometry(0.075, 0.34 * back + 0.06, 4), 0x14101a, [Math.cos(a) * R, y - 0.12, Math.sin(a) * R * 0.85], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5 + Math.PI], [1, 1, 0.35], { top: 0x4a4068 }));
  }
  for (const [x, y] of [[-0.12, 0.2], [0, 0.12], [0.12, 0.2]]) L.push(part(new THREE.ConeGeometry(0.08, 0.5, 4), 0x14101a, [x, y, -0.33], [-0.25, 0, Math.PI], [1, 1, 0.3], { top: 0x4a4068 }));   // перья-«хвост» вдоль спины
  return L;
}
function head({ kit, STEEL, STEEL_L, DARK, BR }) {
  const { THREE, part, bbox, lathe, tube } = kit, L = [];
  // капюшон — тёмный, как вороново крыло
  L.push(lathe([[0.0, 0.54], [0.15, 0.5], [0.25, 0.38], [0.28, 0.18], [0.26, 0.0], [0.3, -0.06]], 0x1c1824, [0, 0, -0.03], 0, [1, 1, 1.08], { top: 0x4a4260, tex: 'cloth' }, 14));
  // маска ворона: гладкий чёрный череп с глазными кольцами и длинным клювом (верхняя челюсть чуть загнута вниз)
  L.push(part(new THREE.SphereGeometry(0.2, 12, 9), 0x120f16, [0, 0.2, 0.1], 0, [1.0, 1.1, 1.12], { top: 0x3a3446, tex: 'bone' }));
  L.push(part(new THREE.ConeGeometry(0.105, 0.62, 6), 0x1a1718, [0, 0.16, 0.45], [Math.PI / 2 + 0.16, 0, 0], [1, 1, 0.8], { top: 0x6a6258, tex: 'bone' }));      // верхний клюв
  L.push(part(new THREE.ConeGeometry(0.075, 0.4, 5), 0x14110f, [0, 0.07, 0.36], [Math.PI / 2 - 0.12, 0, 0], [1, 1, 0.7], { top: 0x4a443e }));                   // нижний клюв
  L.push(part(new THREE.BoxGeometry(0.02, 0.02, 0.4), 0x050407, [0, 0.14, 0.45]));                                                                              // щель между челюстями
  for (const sx of [-1, 1]) {
    L.push(part(new THREE.TorusGeometry(0.058, 0.016, 5, 10), 0x07050a, [sx * 0.105, 0.27, 0.235], [0, sx * 0.4, 0]), part(new THREE.SphereGeometry(0.036, 7, 6), 0xffd24a, [sx * 0.105, 0.27, 0.235], 0, 1, { emit: true }));   // янтарные глаза
  }
  // хохолок и перья затылка
  for (let i = 0; i < 6; i++) { const t = i / 5 - 0.5; L.push(part(new THREE.ConeGeometry(0.05, 0.3 + (i % 2) * 0.1, 4), 0x14101a, [t * 0.3, 0.46, -0.08 - Math.abs(t) * 0.1], [-0.8, 0, t * 1.4], [1, 1, 0.35], { top: 0x4a4068 })); }
  // воротник из перьев вокруг шеи
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; L.push(part(new THREE.ConeGeometry(0.06, 0.24, 4), 0x14101a, [Math.cos(a) * 0.27, -0.02, Math.sin(a) * 0.25], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9 + Math.PI], [1, 1, 0.35], { top: 0x4a4068 })); }
  return L;
}
export default { id: 'archer', kind: 'hero', outline: 'hero', build(kit) { return heroModel(kit, { steel: 0x6a4a2a, steelL: 0xc89a58, steelD: 0x3a2814, dark: 0x5a2a1a, tex: 'leather', rimColor: 0xffe0a0, noCape: true, height: 2.35, cast: 'bow', torso, head }); } };
