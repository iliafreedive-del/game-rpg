// Вывеска с надписью: холст-текстура (canvas) на доске в рамке. Без document (проверка моделей в node) — только доска.
// lines — строки сверху вниз; первая крупнее. Возвращает Group (лицом в +z), центр — середина доски.
export function sign(kit, def, lines, w, h, o = {}) {
  const { THREE, merge, bbox } = kit, g = new THREE.Group();
  g.add(new THREE.Mesh(merge([bbox(w + 0.12, h + 0.12, 0.08, 0.02, o.frame ?? 0x4a3018, [0, 0, -0.05], 0, { top: o.frameL ?? 0x8a6a40, tex: 'wood' })]), kit.propMat(def)));
  if (typeof document === 'undefined') return g;
  const S = 128, c = document.createElement('canvas'); c.width = Math.round(S * w / h * 1.6); c.height = Math.round(S * 1.6); const x = c.getContext('2d');
  x.fillStyle = o.bg ?? '#3a1e12'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = o.border ?? '#d6a548'; x.lineWidth = 7; x.strokeRect(7, 7, c.width - 14, c.height - 14);
  x.fillStyle = o.ink ?? '#ffd98a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#000'; x.shadowBlur = 6;
  const n = lines.length, big = c.height * (n > 1 ? 0.42 : 0.56), small = c.height * 0.24;
  lines.forEach((t, i) => { const fs = i === 0 ? big : small; x.font = `bold ${fs}px Georgia, serif`; let k = 1; while (x.measureText(t).width * k > c.width * 0.9) k *= 0.95; x.font = `bold ${fs * k}px Georgia, serif`; x.fillText(t, c.width / 2, n > 1 ? c.height * (i === 0 ? 0.4 : 0.76) : c.height * 0.54); });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.userData.noOutline = true; m.position.z = 0.002; g.add(m);
  return g;
}
