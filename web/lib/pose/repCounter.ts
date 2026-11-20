import { EXERCISES } from "./exercises/config";
import type { Angles, Exercise } from "./types";
export type Phase = "IDLE" | "READY" | "DOWN_PHASE" | "TURNAROUND" | "UP_PHASE";
export class RepCounter {
  count = 0;
  phase: Phase = "IDLE";
  private heldSince?: number;
  private lastTime = -Infinity;
  private lastVisible?: number;
  private startTime = 0;
  private upTime = 0;
  private peak = -Infinity;
  private startWrist = 0;
  private startShoulder = 0;
  private baseline = 0;
  private excursion = 0;
  private totalFrames = 0;
  private visibleFrames = 0;
  private gatePassed = true;
  constructor(readonly exercise: Exercise) {}
  private idle() { this.phase = "IDLE"; this.heldSince = undefined; }
  update(a: Angles | null, time: number) {
    if (!Number.isFinite(time) || time <= this.lastTime) return this.count;
    this.lastTime = time;
    if (this.lastVisible !== undefined && time - this.lastVisible > 1500) this.idle();
    const valid = a?.valid && Object.values(a).every(v => typeof v !== "number" || Number.isFinite(v));
    if (this.phase !== "IDLE" && this.phase !== "READY") { this.totalFrames++; if (valid) this.visibleFrames++; }
    if (!valid || !a) { this.heldSince = undefined; return this.count; }
    this.lastVisible = time;
    const config = EXERCISES[this.exercise];
    if (this.phase === "IDLE") {
      if (config.near(a) && config.gate(a)) {
        this.heldSince ??= time;
        if (time - this.heldSince >= 500) { this.phase = "READY"; this.baseline ||= a.torsoLength; }
      } else this.heldSince = undefined;
      return this.count;
    }
    if (this.phase === "READY") {
      if (!config.gate(a)) { this.idle(); return this.count; }
      this.startWrist = a.wristY; this.startShoulder = a.shoulderY;
      if (!config.near(a)) {
        this.phase = "DOWN_PHASE"; this.startTime = time; this.totalFrames = 1; this.visibleFrames = 1;
        this.gatePassed = true; this.excursion = 0; this.peak = config.progress(a);
      }
      return this.count;
    }
    this.gatePassed &&= config.gate(a);
    this.excursion = Math.max(this.excursion, this.exercise === "curl" ? (this.startWrist - a.wristY) / this.baseline : (a.shoulderY - this.startShoulder) / this.baseline);
    if (time - this.startTime > 10000) { this.idle(); return this.count; }
    if (this.phase === "DOWN_PHASE" && config.far(a) && time - this.startTime >= 250) {
      this.phase = "TURNAROUND"; this.peak = config.progress(a);
    } else if (this.phase === "TURNAROUND") {
      const progress = config.progress(a);
      if (progress < this.peak) { this.phase = "UP_PHASE"; this.upTime = time; }
      else this.peak = progress;
    }
    if (this.phase === "UP_PHASE" && config.complete(a)) {
      const duration = time - this.startTime;
      const travelOk = this.exercise === "curl" ? this.excursion >= 0.4 : this.exercise === "push-up" ? this.excursion >= 0.15 : true;
      if (time - this.upTime >= 250 && duration >= 700 && duration <= 10000 && this.visibleFrames / this.totalFrames >= 0.8 && this.gatePassed && travelOk) this.count++;
      this.idle();
    } else if (this.phase === "DOWN_PHASE" && config.near(a)) this.idle();
    return this.count;
  }
}
