export class OneEuroFilter {
  private previous?: { time: number; raw: number; filtered: number; derivative: number };
  constructor(readonly minCutoff = 1, readonly beta = 0.01, readonly derivativeCutoff = 1) {}
  reset() { this.previous = undefined; }
  filter(value: number, timeMs: number) {
    const prev = this.previous;
    if (!prev) { this.previous = { time: timeMs, raw: value, filtered: value, derivative: 0 }; return value; }
    const dt = (timeMs - prev.time) / 1000;
    if (dt <= 0 || !Number.isFinite(value)) return prev.filtered;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    const derivative = alpha(this.derivativeCutoff) * ((value - prev.raw) / dt) + (1 - alpha(this.derivativeCutoff)) * prev.derivative;
    const a = alpha(this.minCutoff + this.beta * Math.abs(derivative));
    const filtered = a * value + (1 - a) * prev.filtered;
    this.previous = { time: timeMs, raw: value, filtered, derivative };
    return filtered;
  }
}
