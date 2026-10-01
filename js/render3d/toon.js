// Stylised materials: soft 3-band toon ramp + rim light + self-lit vertex flag + wind sway + inverted-hull outline.
// All variants are MeshToonMaterial / MeshBasicMaterial patched in onBeforeCompile, so three.js lights & fog keep working.
import * as THREE from '../vendor/three.module.min.js';

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
 */
export function toon(color = 0xffffff, o = {}) {
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: ramp(), vertexColors: !!o.vc, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, opacity: o.opacity ?? 1,
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
  };
  m.customProgramCacheKey = () => 'toon' + (sw ? '-sway' : '') + (o.fade ? '-fade' : '');
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
