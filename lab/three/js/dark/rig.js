// Small procedural-animation toolkit shared by the hero and the walking mobs: 2-bone leg IK with real knees, a foot-plant gait cycle, easing.
// Convention (characters face +z): rotation.x > 0 swings a hanging limb BACKWARD, < 0 swings it forward; a knee bends with rotation.x > 0.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = x => { x = clamp(x); return x * x * x; };
export const lerp = (a, b, t) => a + (b - a) * t;

// Foot target (forward offset z and lift y relative to the hip joint's vertical) for gait phase p in [0,1): 60% stance (foot slides back on the ground), 40% swing.
export function footTarget(p, stride, lift, ST = 0.6) {
  p = ((p % 1) + 1) % 1;
  if (p < ST) { const k = p / ST; return { z: stride * (0.5 - k), y: 0, pitch: k > 0.8 ? (k - 0.8) / 0.2 * 0.55 : 0 }; }   // late stance: heel lifts, toe pushes off
  const k = (p - ST) / (1 - ST);
  return { z: stride * (-0.5 + smooth(k)), y: lift * Math.sin(Math.PI * k), pitch: 0.55 * (1 - smooth(k * 2.2)) - 0.3 * smooth((k - 0.7) / 0.3) };
}

/**
 * Two-bone leg IK in the sagittal plane.
 * hip/knee/foot: Object3D pivots (knee is a child of hip, foot a child of knee). H = hip height above the ground,
 * (dz, dy) = desired foot position relative to the point straight under the hip (dy >= 0 lifts the foot).
 * Returns total pitch so the caller can keep the foot flat: foot.rotation.x = -(hip.rotation.x + knee.rotation.x) + extra.
 */
export function legIK(hip, knee, foot, L1, L2, H, dz, dy, toe = 0) {
  const vy = -(H - dy);                                   // vector hip → foot, y component (negative = down)
  let D = Math.hypot(dz, vy);
  D = clamp(D, 0.12, L1 + L2 - 0.005);
  const phi = Math.atan2(dz, -vy);                          // angle of that vector from straight-down, forward positive
  const cosA = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1);
  const alpha = Math.acos(cosA);                            // thigh deviates from the line so the knee points forward
  const cosK = clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1);
  const beta = Math.PI - Math.acos(cosK);                   // knee flexion (0 = straight)
  hip.rotation.x = -(phi + alpha);
  knee.rotation.x = beta;
  foot.rotation.x = -(hip.rotation.x + knee.rotation.x) + toe;
}
