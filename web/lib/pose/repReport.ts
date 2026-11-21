import { speechStatus, type Evidence, type FaultId } from "../../../shared/faults";
import { RepReportSchema, type RepWindow } from "../../../shared/rep-report";
import { analyzeRep } from "./faults";

export class RepReporter {
  private streaks: Partial<Record<FaultId,number>> = {};
  private previousRep = 0;
  private exercise?: string;
  constructor(private readonly evidence: Evidence = {}) {}
  reset() { this.streaks = {}; this.previousRep = 0; this.exercise = undefined; }
  build(window: RepWindow, rep: number, target = 10, sinceLastRep = 0) {
    if (!Number.isInteger(rep) || rep < 1 || !Number.isInteger(target) || target < 1 || !Number.isFinite(sinceLastRep) || sinceLastRep < 0) throw new Error("Invalid rep report parameters");
    const analysis = analyzeRep(window);
    if (this.exercise !== window.exercise || rep !== this.previousRep+1) this.streaks = {};
    this.exercise = window.exercise; this.previousRep = rep;
    const good = analysis.quality.visibility >= 0.8 && analysis.quality.view_ok;
    const current = new Set(analysis.observations.map(f=>f.id));
    for (const id of Object.keys(this.streaks) as FaultId[]) if (!good || !current.has(id)) delete this.streaks[id];
    const faults = analysis.observations.flatMap(f=>{
      const streak = good ? (this.streaks[f.id] ?? 0)+1 : 0;
      this.streaks[f.id] = streak;
      const validation = speechStatus(f.id,this.evidence[f.id]);
      return good && validation === "validated" && (f.tier === "A" || streak >= 2) ? [{ id:f.id,value:f.value,threshold:f.threshold,tier:f.tier,streak,validation }] : [];
    });
    const report = RepReportSchema.parse({ exercise:window.exercise,rep,target,ms:{...analysis.ms,since_last_rep:sinceLastRep},metrics:analysis.metrics,faults,quality:analysis.quality,keyframes:analysis.keyframes });
    return { report, observations:analysis.observations };
  }
}
