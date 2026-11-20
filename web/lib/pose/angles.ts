import type { Angles, Landmark, Side } from "./types";
export const SIDES = { left: [11, 13, 15, 23, 25, 27, 29, 31], right: [12, 14, 16, 24, 26, 28, 30, 32] } as const;
export function angle(a: Landmark, b: Landmark, c: Landmark) {
  const u = [a.x - b.x, a.y - b.y], v = [c.x - b.x, c.y - b.y];
  const length = Math.hypot(...u) * Math.hypot(...v);
  return length ? Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / length))) * 180 / Math.PI : NaN;
}
export function sideVisibility(points: Landmark[], side: Side) {
  return SIDES[side].reduce((sum, i) => sum + (points[i]?.visibility ?? 0), 0) / 8;
}
export function derive(points: Landmark[], width: number, height: number, side: Side): Angles | null {
  if (points.length !== 33 || width <= 0 || height <= 0) return null;
  const scaled = points.map(p => ({ ...p, x: p.x * width, y: p.y * height }));
  const [s, e, w, h, k, a, heel, toe] = SIDES[side].map(i => scaled[i]);
  const torsoLength = Math.hypot(s.x - h.x, s.y - h.y);
  if (torsoLength < 1) return null;
  const facing = Math.sign(toe.x - heel.x) || 1;
  return {
    hip: angle(s, h, k), knee: angle(h, k, a), elbow: angle(s, e, w),
    shoulderFlex: angle(h, s, e), bodyLine: angle(s, h, a),
    torsoLean: Math.atan2((s.x - h.x) * facing, h.y - s.y) * 180 / Math.PI,
    torsoLength, wristHeight: (s.y - w.y) / torsoLength, wristY: w.y, shoulderY: s.y,
    bodyHorizontal: Math.atan2(Math.abs(s.y - a.y), Math.abs(s.x - a.x)) * 180 / Math.PI,
    wristsBelowHips: w.y > h.y,
    viewOk: Math.hypot(scaled[11].x - scaled[12].x, scaled[11].y - scaled[12].y) / torsoLength < 0.25,
    valid: SIDES[side].every(i => points[i].visibility >= 0.5 && Number.isFinite(points[i].x) && Number.isFinite(points[i].y)),
  };
}
