// Освобождение видеопамяти (сборка 60, С20): одна функция для актёров, зверьков, земли, предметов и огней зоны.
// Освобождает: скелеты (каждый SkinnedMesh держит текстуру костей), геометрии, InstancedMesh, текстуры из opts.textures.
// Не трогает: материалы (шейдер остаётся собранным — без рывка при возвращении в зону, сборка 46) и геометрии,
// помеченные shared() — общие для многих копий (шкуры Meshy, кеш предметов, сетка земли деревни).
const SHARED = new WeakSet();
export const shared = g => { if (g) SHARED.add(g); return g; };
export function disposeObject(root, opts = {}) {
  if (!root) return;
  const skel = new Set(), geo = new Set();
  root.traverse(o => {
    if (o.skeleton) skel.add(o.skeleton);
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry && typeof o.geometry.dispose === 'function' && !SHARED.has(o.geometry)) geo.add(o.geometry);
  });
  root.removeFromParent();
  for (const s of skel) s.dispose();
  for (const g of geo) g.dispose();
  for (const t of opts.textures || []) if (t) t.dispose();
}
