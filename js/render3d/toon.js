// Stylised materials: soft 3-band toon ramp + rim light + self-lit vertex flag + wind sway + inverted-hull outline.
// All variants are MeshToonMaterial / MeshBasicMaterial patched in onBeforeCompile, so three.js lights & fog keep working.
import * as THREE from '../vendor/three.module.min.js';
import { matArray, MAT_SCALE, MAT_AMP } from './textures.js';

// global uniforms shared by every patched shader
export const U = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(0.85, 0.52) },   // world-space wind direction (x, z)
  uWindStr: { value: 1 },
  uCam: { value: new THREE.Vector3() },      // camera position  } used to dither away whatever
  uFocus: { value: new THREE.Vector3() },    // hero chest       } stands between them
};

let _ramp = null;
export function ramp() {
  if (_ramp) return _ramp;
  // shadow · mid · lit — linear filtering gives a short soft step instead of a hard cel edge
  const v = [92, 92, 150, 228, 255, 255];
  const d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => d.set([x, x, x, 255], i * 4));
  _ramp = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  _ramp.minFilter = _ramp.magFilter = THREE.LinearFilter;
  _ramp.needsUpdate = true;
  return _ramp;
}

const SWAY_PARS = /* glsl */`
uniform float uTime; uniform vec2 uWind; uniform float uWindStr;
uniform float uSwayBase; uniform float uSwayAmt; uniform float uFlutter;
`;
// bends everything above uSwayBase quadratically with height; phase comes from the instance's world position
const SWAY = /* glsl */`
{
#ifdef USE_INSTANCING
  mat4 swM = modelMatrix * instanceMatrix;
#else
  mat4 swM = modelMatrix;
#endif
  vec3 root = swM[3].xyz;
  vec3 lw = normalize(transpose(mat3(swM)) * vec3(uWind.x, 0.0, uWind.y));
  float h = max(transformed.y - uSwayBase, 0.0);
  float k = h * h * uSwayAmt * uWindStr;
  float gust = 0.55 + 0.45 * sin(uTime * 0.55 + root.x * 0.09 + root.z * 0.06);
  float s = gust * 0.75 + sin(uTime * 1.6 + root.x * 0.47 + root.z * 0.31) * 0.45 * gust;
  transformed += lw * s * k;
  float fl = sin(uTime * 5.3 + dot(transformed, vec3(3.1, 2.3, 2.7))) * uFlutter * uWindStr * (0.6 + gust);
  transformed += normal * fl * step(0.0001, h);
}
`;

// screen-door fade (no sorting, no transparency pass): trees/bushes between camera and hero dissolve
const FADE_VS = 'varying vec3 vFadeW;\n';
const FADE_V = /* glsl */`
#ifdef USE_INSTANCING
  vFadeW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vFadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;
const FADE_FS = 'varying vec3 vFadeW; uniform vec3 uCam; uniform vec3 uFocus;\n';
const FADE_F = /* glsl */`
{
  vec3 ab = uFocus - uCam;
  float tt = clamp(dot(vFadeW - uCam, ab) / dot(ab, ab), 0.0, 1.0);
  float dd = length(vFadeW - (uCam + ab * tt));
  float f = (1.0 - smoothstep(1.1, 2.3, dd)) * (1.0 - smoothstep(0.9, 0.97, tt));
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (ign < f * 0.8) discard;
}
`;
// «AO по высоте»: низ предметов и персонажей темнеет у земли (контактное затенение без SSAO)
const AO_V = /* glsl */`
#ifdef USE_INSTANCING
  vAOY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;
#else
  vAOY = (modelMatrix * vec4(transformed, 1.0)).y;
#endif
`;
const addAO = (sh, k, h) => {
  sh.vertexShader = 'varying float vAOY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + AO_V);
  sh.fragmentShader = 'varying float vAOY;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
    `outgoingLight *= mix(${k.toFixed(3)}, 1.0, smoothstep(0.0, ${h.toFixed(3)}, vAOY));\n#include <opaque_fragment>`);
};
// рисованные фактуры: triplanar в пространстве модели (персонажи и instanced-предметы: фактура не «плывёт» при движении).
// id из атрибута aTex выбирает текстуру; градиенты UV считаются до ветвления, выборка — textureGrad (мипмапы без швов)
let TEXU = null;
const texUniforms = () => TEXU || (TEXU = { tMats: { value: matArray() } });
const arr = a => `float[${a.length}](${a.map(v => v.toFixed(2)).join(',')})`;
const TEX_PARS = `const float MSC[${MAT_SCALE.length}] = ${arr(MAT_SCALE)};\nconst float MAMP[${MAT_AMP.length}] = ${arr(MAT_AMP)};\n`;
const TEX_F = /* glsl */`
if (vTexId > 0.5) {
  vec3 an = abs(normalize(vTN)); vec3 tw = pow(an, vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
  float id = floor(vTexId + 0.5);
  float L = id < 2.5 ? 0.0 : id - 2.0;
  bool vert = id == 1.0 || id == 8.0;   // волокна вдоль Y
  float sc = MSC[int(L)];
  vec2 ux = (vert ? vTP.yz : vTP.zy) * sc, uy = vTP.xz * sc, uz = (vert ? vTP.yx : vTP.xy) * sc;
  vec2 dxX = dFdx(ux), dyX = dFdy(ux), dxY = dFdx(uy), dyY = dFdy(uy), dxZ = dFdx(uz), dyZ = dFdy(uz);
  vec3 m = textureGrad(tMats, vec3(ux, L), dxX, dyX).rgb * tw.x + textureGrad(tMats, vec3(uy, L), dxY, dyY).rgb * tw.y + textureGrad(tMats, vec3(uz, L), dxZ, dyZ).rgb * tw.z;
  vec3 f = clamp(1.0 + (m - 0.5) * MAMP[int(L)], 0.25, 1.8);
  // второй слой — износ: дерево, камень, штукатурка и брусчатка грязнее и темнее у земли; на камне сверху мох
  if (id < 3.5 || id == 5.0 || id == 11.0) {
    float nzs = 0.5 + 0.5 * sin(vTP.x * 1.9 + sin(vTP.z * 2.3 + vTP.y * 1.3) * 2.1 + vTP.y * 3.1);
    float low = 1.0 - smoothstep(0.0, 1.15, vTP.y);
    f *= mix(vec3(1.0), vec3(0.58, 0.52, 0.44), low * (0.45 + 0.55 * nzs) * 0.8);
    if (id == 3.0 || id == 11.0) f *= mix(vec3(1.0), vec3(0.62, 0.98, 0.5), smoothstep(0.55, 0.95, an.y) * smoothstep(0.3, 0.8, nzs) * 0.65);
  }
  diffuseColor.rgb *= f;
}
`;
// world: фактура в мировых координатах (стены подземелья — кладка не повторяется блок к блоку)
const TEX_WORLD = `
#ifdef USE_INSTANCING
  mat4 txM = modelMatrix * instanceMatrix;
#else
  mat4 txM = modelMatrix;
#endif
  vTP = (txM * vec4(position, 1.0)).xyz; vTN = mat3(txM) * normal;`;
const addTex = (sh, world) => {
  Object.assign(sh.uniforms, texUniforms());
  sh.vertexShader = 'attribute float aTex; varying float vTexId; varying vec3 vTP; varying vec3 vTN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTexId = aTex; ' + (world ? TEX_WORLD : 'vTP = position; vTN = normal;'));
  sh.fragmentShader = 'uniform highp sampler2DArray tMats; varying float vTexId; varying vec3 vTP; varying vec3 vTN;\n' + TEX_PARS +
    sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + TEX_F);
};
const addFade = sh => {
  sh.vertexShader = FADE_VS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + FADE_V);
  sh.fragmentShader = FADE_FS + sh.fragmentShader.replace('void main() {', 'void main() {\n' + FADE_F);
};

const RIM = /* glsl */`
{
  vec3 vd = normalize(vViewPosition);
  float r = 1.0 - saturate(dot(normal, vd));
  r = smoothstep(0.55, 0.92, r) * (0.35 + 0.65 * saturate(normal.y + 0.6));
  outgoingLight += uRimColor * r * uRim;
#if defined(USE_COLOR_ALPHA)
  outgoingLight = mix(vColor.rgb * uGlow, outgoingLight, vColor.a);
#endif
  outgoingLight = mix(outgoingLight, uFlashColor, uFlash);
}
`;

/**
 * toon(color, opts)
 *  vc       – use vertex colours (RGBA, see geo.js)
 *  rim      – rim light strength (0..1)
 *  sway     – { base, amt, flutter } wind bending
 *  fade     – dither away when standing between camera and hero
 *  side     – THREE side
 *  ao, aoH  – darken to `ao` at ground level, fading out by height aoH (m)
 */
export function toon(color = 0xffffff, o = {}) {
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: ramp(), vertexColors: !!o.vc, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, opacity: o.opacity ?? 1,
    map: o.map ?? null, alphaTest: o.alphaTest ?? 0,
  });
  const sw = o.sway;
  m.userData.flash = { value: 0 };
  m.userData.flashColor = { value: new THREE.Color(1, 1, 1) };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, {
      uFlash: m.userData.flash, uFlashColor: m.userData.flashColor,
      uRim: { value: o.rim ?? 0.35 }, uRimColor: { value: new THREE.Color(o.rimColor ?? 0xfff0d0) },
      uGlow: { value: o.glow ?? 1.25 },
    });
    if (sw) {
      Object.assign(sh.uniforms, { uSwayBase: { value: sw.base ?? 0 }, uSwayAmt: { value: sw.amt ?? 0.02 }, uFlutter: { value: sw.flutter ?? 0 } });
      sh.vertexShader = SWAY_PARS + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY);
    }
    sh.fragmentShader = 'uniform float uFlash; uniform vec3 uFlashColor; uniform float uRim; uniform vec3 uRimColor; uniform float uGlow;\n' +
      sh.fragmentShader.replace('#include <opaque_fragment>', RIM + '#include <opaque_fragment>');
    if (o.fade) addFade(sh);
    if (o.ao) addAO(sh, o.ao, o.aoH ?? 0.8);
    if (o.tex) addTex(sh, o.texWorld);
  };
  m.customProgramCacheKey = () => 'toon' + (sw ? '-sway' : '') + (o.fade ? '-fade' : '') + (o.ao ? '-ao' + o.ao + '-' + (o.aoH ?? 0.8) : '') + (o.tex ? (o.texWorld ? '-texw' : '-tex') : '');
  return m;
}

// Inverted hull outline. Same sway as the body so the contour follows the wind.
export function outline(o = {}) {
  const m = new THREE.MeshBasicMaterial({ color: o.color ?? 0x1b1424, side: THREE.BackSide });
  const sw = o.sway;
  m.userData.width = { value: o.width ?? 0.02 };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, { uOutline: m.userData.width });
    let code = '';
    if (sw) {
      Object.assign(sh.uniforms, { uSwayBase: { value: sw.base ?? 0 }, uSwayAmt: { value: sw.amt ?? 0.02 }, uFlutter: { value: sw.flutter ?? 0 } });
      sh.vertexShader = SWAY_PARS + sh.vertexShader;
      code += SWAY;
    }
    code += 'transformed += normalize(normal) * uOutline;\n';
    sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + code);
    if (o.fade) addFade(sh);
  };
  m.customProgramCacheKey = () => 'outline' + (sw ? '-sway' : '') + (o.fade ? '-fade' : '');
  return m;
}

// Adds an outline twin to every mesh under `root` (skips meshes flagged userData.noOutline).
export function addOutlines(root, mat) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.noOutline && !o.userData.isOutline) list.push(o); });
  for (const o of list) {
    const ol = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, mat, o.count) : new THREE.Mesh(o.geometry, mat);
    if (o.isInstancedMesh) { ol.instanceMatrix = o.instanceMatrix; ol.count = o.count; ol.frustumCulled = o.frustumCulled; }
    ol.userData.isOutline = true;
    o.add(ol);
  }
  return list.length;
}
