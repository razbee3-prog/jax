import {uuid7} from "langsmith";
import {CoachDecisionSchema} from "../../shared/coach-decision";
import {CoachEventSchema,type CoachEvent} from "../../shared/coach-event";
import {SessionLedger} from "../../web/lib/session/ledger";

export type AppConfig={base:string;invite:string;send?:typeof fetch};
export type TraceReceipt={thread_id:string;run_id:string;pass:boolean;expected:number;recorded:number};
export function evaluationBase(value:string){
  const base=value.replace(/\/$/u,"");
  const url=new URL(base);
  if(url.protocol!=="https:" && !["127.0.0.1","localhost"].includes(url.hostname))throw new Error("Evaluation requires HTTPS outside localhost");
  return base;
}
export async function invitedApp(config:AppConfig){
  const send=config.send??fetch,base=evaluationBase(config.base);
  const invite=await send(base+"/api/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:config.invite}),signal:AbortSignal.timeout(20000)});
  if(invite.status!==200)throw new Error(`Evaluation invite HTTP ${invite.status}`);
  const cookie=invite.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
  if(!cookie)throw new Error("Evaluation invite returned no identity cookie");
  const authenticated:typeof fetch=(path,init)=>send(base+String(path),{...init,headers:{...init?.headers,Cookie:cookie}});
  return {session:()=>new AppTrace(authenticated)};
}

class AppTrace {
  readonly thread=uuid7();
  readonly ledger:SessionLedger;
  private closed?:Promise<TraceReceipt>;
  constructor(private send:typeof fetch){
    this.ledger=new SessionLedger(this.thread,send);
    this.ledger.emit("session.start",{scripted:true,source:"eval",purpose:"coach-decision-contract"});
  }
  async turn(event:CoachEvent){
    if(this.closed)throw new Error("Evaluation trace already closed");
    CoachEventSchema.parse(event);
    const start=performance.now();
    const response=await this.send("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id:this.thread,event_id:crypto.randomUUID(),event}),signal:AbortSignal.timeout(85000)});
    const latency_ms=performance.now()-start;
    if(!response.ok){
      this.ledger.emit("coach.turn",{event,event_type:event.type,decision:null,source:"fallback",reason:`Evaluation HTTP ${response.status}`,latency_ms,scripted:true});
      throw new Error(`Evaluation coach HTTP ${response.status}`);
    }
    const body=await response.json(),decision=CoachDecisionSchema.parse(body.decision);
    this.ledger.emit("coach.turn",{event,event_type:event.type,decision,source:"agent",reason:decision.reason,latency_ms,scripted:true});
    if(event.type==="onboarding_answer")this.ledger.emit("onboarding.turn",{question:event.question??"",transcript:event.transcript??"",extracted_slot:JSON.stringify(decision.slots),scripted:true,source:"eval"});
    return {decision,latency_ms};
  }
  close(){
    this.closed??=(async()=>{
      this.ledger.emit("session.end",{reps:0,completion:"evaluation",scripted:true,source:"eval"});
      await this.ledger.flush();
      const receipt=this.ledger.receipt;
      if(!receipt || this.ledger.acknowledged.size!==this.ledger.events.length)throw new Error("Evaluation trace telemetry was not acknowledged");
      const response=await this.send("/api/session/audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id:this.thread,...receipt,ledger:this.ledger.events}),signal:AbortSignal.timeout(85000)});
      if(!response.ok)throw new Error(`Evaluation trace audit HTTP ${response.status}`);
      const result=await response.json();
      if(result.pass!==true)throw new Error(`Evaluation trace audit FAIL (${result.recorded}/${result.expected})`);
      return {thread_id:this.thread,run_id:receipt.run_id,pass:true,expected:Number(result.expected),recorded:Number(result.recorded)};
    })();
    return this.closed;
  }
}
