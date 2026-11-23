import {CUES} from "../../../shared/cues";
import {FAULTS,type FaultId} from "../../../shared/faults";
import type {RepReport} from "../../../shared/rep-report";
import type {CoachDecision} from "../../../shared/coach-decision";
import type {Observation} from "../pose/faults";
import {CuePolicy} from "../pose/cuePolicy";
import type {SpeechLine} from "./governor";
import {SerialCoach,type CoachResult} from "./serial";
export type CueSource="local"|"agent"|"fallback";
type Guidance=NonNullable<CoachDecision["guidance"]>;
export class HybridCoach {
  private policy=new CuePolicy();
  private setId="";
  private active=new Set<FaultId>();
  private eligible=new Set<FaultId>();
  private epochs=new Map<FaultId,number>();
  private guidance?:Guidance;
  private quietStamp="";
  private outage=false;
  constructor(readonly serial:SerialCoach,private enqueue:(line:SpeechLine)=>void,private clearFault:(id:string,at:number)=>void,private log:(data:{rep:number;source:CueSource;latency_ms:number;reason:string})=>void,private now=()=>performance.now()){}
  start(setId:string){this.setId=setId;this.policy.reset();this.active.clear();this.eligible.clear();this.epochs.clear();this.guidance=undefined;}
  end(){this.setId="";this.guidance=undefined;}
  contact(result:CoachResult){this.outage=result.source==="fallback";if(this.outage)this.guidance=undefined;}
  private stamp(){return [...this.active].sort().map(id=>`${id}:${this.epochs.get(id)??0}`).join("|");}
  rep(report:RepReport,observations:Observation[]){
    const at=this.now(),set=this.setId;if(!set)return;
    const previousGuidance=this.guidance;
    const active=new Set(observations.map(o=>o.id));for(const f of report.faults)active.add(f.id);
    for(const id of this.active)if(!active.has(id)){this.epochs.set(id,(this.epochs.get(id)??0)+1);this.clearFault(id,at);if(this.guidance?.fault_id===id)this.guidance=undefined;}
    this.active=active;
    const stamp=this.stamp();if(this.guidance?.action==="quiet" && this.quietStamp!==stamp)this.guidance=undefined;
    const safe=report.faults.filter(f=>f.validation==="validated" && f.tier==="A" && FAULTS[f.id].tier==="A" && FAULTS[f.id].exercise===report.exercise);
    for(const f of safe)this.eligible.add(f.id);
    const guidance=this.outage ? undefined:this.guidance;
    const focus=guidance?.fault_id;
    const selected=focus && safe.some(f=>f.id===focus) ? safe.filter(f=>f.id===focus):safe;
    const cue=this.policy.next({report:{...report,faults:selected},observations,quiet:guidance?.action==="quiet"});
    let source:CueSource=this.outage ? "fallback":"local";
    if(cue){
      const shape=cue.kind==="fixed" ? previousGuidance:guidance;
      const matching=shape?.fault_id===cue.fault_id && ((shape.action==="reminder" && cue.kind==="reminder") || (shape.action==="ack" && cue.kind==="fixed"));
      if(!this.outage && shape && (matching || guidance?.fault_id===cue.fault_id))source="agent";
      this.enqueue({id:crypto.randomUUID(),text:matching ? shape!.text:cue.text,faultId:cue.fault_id,priority:cue.kind==="fixed" ? "fixed":"correction",inSet:true,repAt:at,cachedOnly:true,source});
    }else{
      if(guidance?.action==="quiet")source="agent";
      this.enqueue({id:crypto.randomUUID(),text:"",priority:"pace",inSet:true,repAt:at,speak:false,source});
    }
    const milestone=report.rep===5 ? "Five. Halfway.":report.rep===8 ? "Two more.":report.rep===10 ? "Ten. That's the set.":null;
    if(milestone)this.enqueue({id:crypto.randomUUID(),text:milestone,priority:"milestone",fixed:true,inSet:true,repAt:at,cachedOnly:true,source:this.outage ? "fallback":"local"});
    this.log({rep:report.rep,source,latency_ms:this.now()-at,reason:cue ? cue.kind:guidance?.action==="quiet" ? "agent requested quiet":"local silence"});
    const epochs=new Map(this.epochs);
    void this.serial.request({type:"rep",set_id:set,exercise:report.exercise,report,reports:[report]},result=>{
      this.contact(result);if(result.source!=="agent" || this.setId!==set)return;
      const g=result.decision?.guidance;if(!g || result.decision?.speak)return;
      if(g.action==="quiet"){if(g.fault_id===null && !g.text && this.stamp()===stamp){this.guidance=g;this.quietStamp=stamp;}return;}
      const id=g.fault_id;
      if(!id || !this.eligible.has(id) || !this.active.has(id) || (this.epochs.get(id)??0)!==(epochs.get(id)??0) || FAULTS[id].tier!=="A")return;
      if(g.action==="focus"){if(!g.text)this.guidance=g;return;}
      const bank=g.action==="ack" ? CUES[id].fixed:CUES[id].reminder;
      if(g.text.trim().split(/\s+/).length<=14 && bank.includes(g.text))this.guidance=g;
    });
  }
}
