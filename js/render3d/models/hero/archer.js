// Герой-лучник «Следопыт Ордена»: капюшон с пером, кожаная куртка со шнуровкой, наплечники из дублёной кожи, колчан со стрелами за спиной,
// рыже-красный плащ (не сливается с зеленью леса). Лук — в левой руке (оружие, а не часть модели), клип cast = натянуть тетиву. Тело и риг — общие с воином (_hero.js).
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
  for (let i = 0; i < 5; i++) { const a = i * 1.26, x = 0.2 + Math.cos(a) * 0.03, z = -0.36 + Math.sin(a) * 0.03; L.push(tube([[x - 0.02, 0.82, z], [x + 0.06, 1.05, z - 0.1]], 0.012, 0.012, 0xd8c8a0, { top: 0xf0e4c0 }, 4), part(new THREE.ConeGeometry(0.03, 0.12, 3), 0xc03a2a, [x + 0.07, 1.08, z - 0.11], [-0.5, 0, -0.5], [1, 1, 0.3]));}
  L.push(bbox(0.07, 0.8, 0.03, 0.01, LEATHER, [0.0, 0.4, 0.26], [-0.1, 0, 0.62], { top: LEATHER_L, tex: 'leather' }));
  return L;
}
function head({ kit, STEEL, STEEL_L, DARK, BR }) {
  const { THREE, part, bbox, lathe, tube } = kit, L = [];
  L.push(lathe([[0.0, 0.54], [0.15, 0.5], [0.25, 0.38], [0.28, 0.18], [0.26, 0.0], [0.3, -0.06]], 0x8a4a26, [0, 0, -0.03], 0, [1, 1, 1.08], { top: 0xe0a050, tex: 'cloth' }, 14));   // капюшон
  L.push(bbox(0.34, 0.2, 0.1, 0.03, 0x07050f, [0, 0.2, 0.2]), part(new THREE.BoxGeometry(0.07, 0.03, 0.02), 0xc8ffd0, [0.075, 0.22, 0.255], 0, 1, { emit: true }), part(new THREE.BoxGeometry(0.07, 0.03, 0.02), 0xc8ffd0, [-0.075, 0.22, 0.255], 0, 1, { emit: true }));
  L.push(bbox(0.32, 0.14, 0.1, 0.03, 0x5a2a1a, [0, 0.08, 0.2], [0.1, 0, 0], { top: 0xc07040, tex: 'cloth' }));                                   // повязка на лице
  L.push(tube([[0.2, 0.36, 0.0], [0.34, 0.5, -0.06], [0.4, 0.66, -0.2], [0.34, 0.74, -0.34]], 0.035, 0.005, 0xffc828, { top: 0xfff2a0 }, 5));          // перо (яркое: читается в любом лесу)
  return L;
}
export default { id: 'archer', kind: 'hero', outline: 'hero', build(kit) { return heroModel(kit, { steel: 0x6a4a2a, steelL: 0xc89a58, steelD: 0x3a2814, dark: 0x5a2a1a, tex: 'leather', rimColor: 0xffe0a0, cape: 0x9a3a22, capeHem: 0x4a1a10, capeLen: 0.95, height: 2.35, cast: 'bow', torso, head }); } };
