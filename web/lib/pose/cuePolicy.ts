import { CUES } from "../../../shared/cues";
import { FAULTS, type FaultId } from "../../../shared/faults";
import type { RepReport } from "../../../shared/rep-report";
import type { Observation } from "./faults";
export type CueCheckpoint={cues:Partial<Record<FaultId,number>>;active?:FaultId;lastRep:number;exercise?:string};
export class CuePolicy {
  private cues: Partial<Record<FaultId,number>> = {};
  private active?: FaultId;
  private lastRep = 0;
  private exercise?: string;
  reset() { this.cues = {}; this.active = undefined; this.lastRep = 0; this.exercise = undefined; }
  checkpoint():CueCheckpoint{return {cues:{...this.cues},active:this.active,lastRep:this.lastRep,exercise:this.exercise};}
  restore(saved:CueCheckpoint){this.cues={...saved.cues};this.active=saved.active;this.lastRep=saved.lastRep;this.exercise=saved.exercise;}
  next({ report, observations, quiet=false }: { report: RepReport; observations: Observation[]; quiet?:boolean }) {
    if (this.exercise !== report.exercise || report.rep <= this.lastRep) this.reset();
    this.exercise = report.exercise; this.lastRep = report.rep;
    if (quiet || report.quality.visibility < 0.8 || !report.quality.view_ok) return null;
    const fault = [...report.faults].sort((a,b)=>FAULTS[a.id].priority-FAULTS[b.id].priority).find(f=>(this.cues[f.id] ?? 0)<2);
    if (fault) {
      const kind = this.cues[fault.id] ? "reminder" : "first";
      this.cues[fault.id] = (this.cues[fault.id] ?? 0)+1; this.active = fault.id;
      return { fault_id:fault.id,kind,text:CUES[fault.id][kind].find(text=>text.split(/\s+/).length<=14)! };
    }
    if (this.active && !report.faults.some(f=>f.id === this.active) && !observations.some(f=>f.id === this.active)) {
      const id=this.active; this.active=undefined;
      return { fault_id:id,kind:"fixed" as const,text:CUES[id].fixed[0] };
    }
    return null;
  }
}
