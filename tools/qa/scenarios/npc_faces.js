// Портреты NPC для диалогов (сборка 47): node tools/qa/run.mjs tools/qa/scenarios/npc_faces.js > out; из строки FACES{...} — JPEG в assets/sprites/face_<id>.jpg
const gm = await import('/js/game/game.js'); if (window.__G.zoneId !== 'town') { await gm.loadZone('town'); }
await sleep(2500); await step(10); await sleep(800);
const G = window.__G, R = window.__R3; const THREE = await import('/js/vendor/three.module.min.js');
const out = {};
for (const n of G.npcs) {
  const a = R.actors.get(n); if (!a) { print('no actor', n.id); continue; }
  const ry = a.root.rotation.y; a.root.rotation.y = 0.35; a.root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(a.root); const h = box.max.y - box.min.y;
  const p = a.root.position, yaw = 0, fx = Math.sin(yaw), fz = Math.cos(yaw);
  const W = 192, H = 240, cam = new THREE.PerspectiveCamera(30, W / H, 0.6, 20);
  const hy = box.min.y + Math.min(h, 2.05) * 0.78;
  cam.position.set(p.x + (n.id === 'trainer' ? -0.75 : 0.35), hy + 0.45, p.z + 2.0); cam.lookAt(p.x, hy + 0.08, p.z);
  const vis = R.scene.children.map(o => [o, o.visible]); for (const o of R.scene.children) o.visible = o === a.root || o.isLight || (o.children && o.children.some(c => c.isLight)); const bg = R.scene.background, fog = R.scene.fog; R.scene.background = new THREE.Color(0x2a2030); R.scene.fog = null;
  const ols = []; a.root.traverse(o => { if (o.userData && o.userData.isOutline && o.visible) { ols.push(o); o.visible = false; } });
  const rt = new THREE.WebGLRenderTarget(W, H); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const r = R.renderer; const old = r.getRenderTarget(); r.setRenderTarget(rt); r.render(R.scene, cam); r.setRenderTarget(old); for (const [o, v] of vis) o.visible = v; R.scene.background = bg; a.root.rotation.y = ry; for (const o of ols) o.visible = true; R.scene.fog = fog;
  const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const im = x.createImageData(W, H);
  for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  x.putImageData(im, 0, 0); out[n.id] = c.toDataURL('image/jpeg', 0.86); print('face', n.id, n.model, h.toFixed(2), yaw.toFixed(2));
}
localStorage.setItem('__faces', JSON.stringify(out)); window.__faces = out;
return 'FACES' + JSON.stringify(out);
