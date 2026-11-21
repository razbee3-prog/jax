import { derive, sideVisibility } from "./angles";
import { OneEuroFilter } from "./filter";
import { RepCounter } from "./repCounter";
import type { Exercise, Frame, Side } from "./types";
export class PosePipeline {
  readonly counter: RepCounter;
  private filters = Array.from({ length: 33 }, () => [new OneEuroFilter(), new OneEuroFilter()]);
  private firstTime?: number;
  private lastTime = -Infinity;
  private lastVisible?: number;
  private visibility = { left: 0, right: 0 };
  side: Side = "left";
  baseline = 0;
  constructor(exercise: Exercise, readonly width: number, readonly height: number) { this.counter = new RepCounter(exercise); }
  process(frame: Frame) {
    if (frame.t <= this.lastTime) return null;
    if (this.lastVisible !== undefined && frame.t - this.lastVisible > 1500) {
      this.filters.forEach(pair => pair.forEach(filter => filter.reset()));
    }
    this.lastTime = frame.t;
    const left = sideVisibility(frame.landmarks, "left"), right = sideVisibility(frame.landmarks, "right");
    if (Math.max(left, right) >= 0.5) this.firstTime ??= frame.t;
    if (this.firstTime !== undefined && frame.t - this.firstTime <= 500) {
      this.visibility.left += sideVisibility(frame.landmarks, "left");
      this.visibility.right += sideVisibility(frame.landmarks, "right");
      this.side = this.visibility.right > this.visibility.left ? "right" : "left";
    }
    const points = frame.landmarks.map((p, i) => p.visibility < 0.5 ? p : { ...p, x: this.filters[i][0].filter(p.x, frame.t), y: this.filters[i][1].filter(p.y, frame.t) });
    const angles = derive(points, this.width, this.height, this.side);
    if (angles?.valid) this.lastVisible = frame.t;
    this.counter.update(angles, frame.t);
    if (this.counter.phase === "READY" && !this.baseline && angles) this.baseline = angles.torsoLength;
    return { points, angles, side: this.side, count: this.counter.count, phase: this.counter.phase };
  }
}
