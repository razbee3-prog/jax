import type {CoachEvent} from "../../../shared/coach-event";
import type {CoachDecision} from "../../../shared/coach-decision";
export type CoachResult={decision:CoachDecision|null;source:"agent"|"fallback";latency_ms:number;reason:string;event:CoachEvent};
type Job={event:CoachEvent;resolve:(result:CoachResult)=>void;receive?:(result:CoachResult)=>void;finish:(decision:CoachDecision|null,reason:string)=>void;settled:boolean;started?:number;timer?:ReturnType<typeof setTimeout>};
export class SerialCoach {
  private jobs:Job[]=[];
  private busy=false;
  private timedOut=false;
  private closed=false;
  constructor(private send:(event:CoachEvent)=>Promise<CoachDecision>,private log:(result:CoachResult)=>void,private now=()=>performance.now()){}
  request(event:CoachEvent,receive?:(result:CoachResult)=>void){
    return new Promise<CoachResult>(resolve=>{
      if(this.closed){resolve({event,decision:null,source:"fallback",latency_ms:0,reason:"session closed"});return;}
      const pending=this.jobs.at(-1);
      if(event.type==="rep" && pending?.event.type==="rep" && !pending.settled && event.set_id===pending.event.set_id){
        pending.event={...event,reports:[...pending.event.reports!,...event.reports!].slice(-10)};
        const previous=pending.resolve;pending.resolve=result=>{previous(result);resolve(result);};pending.receive=receive;
      }else{
        const start=this.now();
        const job:Job={event,resolve,receive,settled:false,finish:(decision,reason)=>{
          if(job.settled)return;job.settled=true;clearTimeout(job.timer);
          const result:CoachResult={event:job.event,decision,source:decision ? "agent":"fallback",latency_ms:this.now()-(job.started??start),reason};
          this.log(result);if(!this.closed)job.receive?.(result);job.resolve(result);
        }};
        if(this.busy && this.timedOut && event.type!=="rep")job.finish(null,"previous turn still in flight");else this.jobs.push(job);
      }
      this.pump();
    });
  }
  private pump(){
    if(this.busy || this.closed)return;
    let job=this.jobs.shift();while(job?.settled)job=this.jobs.shift();if(!job)return;
    const current=job;this.busy=true;this.timedOut=false;current.started=this.now();
    current.timer=setTimeout(()=>{this.timedOut=true;current.finish(null,"four-second deadline");const controls=this.jobs.filter(job=>job.event.type!=="rep");this.jobs=this.jobs.filter(job=>job.event.type==="rep");for(const pending of controls)pending.finish(null,"previous turn still in flight");},4000);
    void Promise.resolve().then(()=>this.send(current.event)).then(decision=>current.finish(decision,"completed"),()=>current.finish(null,"coach request failed")).finally(()=>{this.busy=false;this.timedOut=false;this.pump();});
  }
  close(){this.closed=true;for(const job of this.jobs.splice(0))job.finish(null,"session closed");}
}
