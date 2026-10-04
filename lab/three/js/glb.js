// Minimal GLB reader for static, untextured-skeleton meshes (POSITION/NORMAL/TEXCOORD_0 + indices + one baseColor JPEG/PNG).
// three.js's GLTFLoader is not vendored; this covers what our exported characters need without another dependency.
import * as THREE from '../vendor/three.module.min.js';

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

export async function loadGLB(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB: ' + url);
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binOff = 20 + jsonLen + 8;
  const view = i => { const v = json.bufferViews[i]; return { off: binOff + (v.byteOffset || 0), len: v.byteLength }; };
  const acc = i => {
    const a = json.accessors[i], v = view(a.bufferView), n = SIZE[a.type];
    return new COMP[a.componentType](buf.slice(v.off + (a.byteOffset || 0), v.off + (a.byteOffset || 0) + a.count * n * COMP[a.componentType].BYTES_PER_ELEMENT));
  };
  const geos = json.meshes[0].primitives.map(p => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(acc(p.attributes.POSITION), 3));
    if (p.attributes.NORMAL !== undefined) g.setAttribute('normal', new THREE.BufferAttribute(acc(p.attributes.NORMAL), 3));
    if (p.attributes.TEXCOORD_0 !== undefined) g.setAttribute('uv', new THREE.BufferAttribute(acc(p.attributes.TEXCOORD_0), 2));
    if (p.indices !== undefined) g.setIndex(new THREE.BufferAttribute(acc(p.indices), 1));
    return g;
  });
  let map = null;
  const img = json.images && json.images[0];
  if (img) {
    const v = view(img.bufferView);
    const bmp = await createImageBitmap(new Blob([new Uint8Array(buf, v.off, v.len)], { type: img.mimeType }), { imageOrientation: 'none' });
    map = new THREE.Texture(bmp); map.colorSpace = THREE.SRGBColorSpace; map.flipY = false; map.anisotropy = 4; map.needsUpdate = true;
  }
  return { geometry: geos[0], map, json };
}
