export type Exercise = "rdl" | "push-press" | "curl" | "push-up";
export type Landmark = { x: number; y: number; z?: number; visibility: number };
export type Frame = { t: number; landmarks: Landmark[] };
export type Fixture = { version: 1; exercise: Exercise; width: number; height: number; expected: number; source: string; frames: Frame[] };
export type Side = "left" | "right";
export type Angles = { hip: number; knee: number; elbow: number; shoulderFlex: number; bodyLine: number; torsoLean: number; torsoLength: number; wristHeight: number; wristY: number; shoulderY: number; bodyHorizontal: number; wristsBelowHips: boolean; viewOk: boolean; valid: boolean };
