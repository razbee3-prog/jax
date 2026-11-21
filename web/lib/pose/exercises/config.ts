import type { Angles, Exercise } from "../types";
export const EXERCISES: Record<Exercise, { label: string; near: (a: Angles) => boolean; far: (a: Angles) => boolean; complete: (a: Angles) => boolean; gate: (a: Angles) => boolean; progress: (a: Angles) => number }> = {
  rdl: { label: "Romanian deadlift", near: a => a.hip >= 160, far: a => a.hip <= 125 && a.torsoLean >= 35, complete: a => a.hip >= 160, gate: a => a.wristsBelowHips, progress: a => -a.hip },
  "push-press": { label: "Push press", near: a => a.wristHeight <= 0.35 && a.elbow <= 100, far: a => a.wristHeight >= 0.8 && a.elbow >= 150, complete: a => a.wristHeight <= 0.35, gate: a => Math.abs(a.torsoLean) <= 25, progress: a => a.wristHeight },
  curl: { label: "Bicep curl", near: a => a.elbow >= 150, far: a => a.elbow <= 80, complete: a => a.elbow >= 140, gate: a => Math.abs(a.torsoLean) <= 25, progress: a => -a.elbow },
  "push-up": { label: "Push-up", near: a => a.elbow >= 155, far: a => a.elbow <= 100, complete: a => a.elbow >= 150, gate: a => a.bodyHorizontal <= 35, progress: a => -a.elbow },
};
