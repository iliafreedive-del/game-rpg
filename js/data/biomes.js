// Depths biomes: every 5 floors the dungeon changes look, light, props and ambient particles.
export const BIOMES = [
  { id: 'crypt', name: 'Катакомбы', tint: null, light: null, fog: [4, 3, 8], props: ['bones', 'skulls', 'rubble', 'candles', 'barrel'], particles: null },
  { id: 'flooded', name: 'Затопленные склепы', tint: 'rgba(40,90,110,0.28)', light: [120, 200, 255], fog: [2, 8, 14], props: ['puddle', 'mushrooms', 'bones', 'stalagmite', 'puddle'], particles: { c: [140, 210, 255], rate: 10, vz: -1.5, g: 2, size: 2, life: 1.2 } },
  { id: 'ash', name: 'Пепельные шахты', tint: 'rgba(120,40,10,0.26)', light: [255, 110, 40], fog: [14, 4, 2], props: ['lavarock', 'stalagmite', 'rubble', 'lavarock', 'skulls'], particles: { c: [255, 140, 60], rate: 14, vz: 1.8, g: -0.4, size: 2.5, life: 1.6 } },
  { id: 'abyss', name: 'Сердце Бездны', tint: 'rgba(80,30,120,0.30)', light: [190, 110, 255], fog: [10, 3, 16], props: ['crystals', 'mushrooms', 'crystals', 'stalagmite', 'skulls'], particles: { c: [200, 140, 255], rate: 12, vz: 0.8, g: -0.2, size: 2.5, life: 1.8 } },
];
export const biomeOf = floor => floor <= 0 ? BIOMES[0] : BIOMES[Math.floor((floor - 1) / 5) % BIOMES.length];
