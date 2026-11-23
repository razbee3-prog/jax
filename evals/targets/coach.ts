import {HybridCoach} from "../../web/lib/coach/hybrid";
import {SerialCoach} from "../../web/lib/coach/serial";
import {SpeechQueue} from "../../web/lib/voice/speechQueue";
import type {CoachDecision} from "../../shared/coach-decision";
import type {CoachEvent} from "../../shared/coach-event";
import type {FaultId} from "../../shared/faults";
import type {CoachInput} from "../datasets/coach";
import type {EvaluatedTurn,PolicyLine} from "../evaluators/coach";
import {invitedApp,type AppConfig,type TraceReceipt} from "./app";

export type CoachOutput={turns:EvaluatedTurn[];traces:TraceReceipt[];latencies_ms:number[]};
export async function coachTarget(input:CoachInput,config:AppConfig):Promise<CoachOutput>{
  const app=await invitedApp(config),traces:TraceReceipt[]=[],sessions:ReturnType<typeof app.session>[]=[],latencies_ms:number[]=[];
  let session=app.session();sessions.push(session);
  const nextSession=async()=>{traces.push(await session.close());session=app.session();sessions.push(session);};
  const request=async(event:CoachEvent)=>{const result=await session.turn(event);latencies_ms.push(result.latency_ms);return result;};
  let clock=0,decision:CoachDecision,lines:PolicyLine[]=[],previousFaults:FaultId[]=[];
  const corrections:Partial<Record<FaultId,number>>={};
  const queue=new SpeechQueue(async(_line,_signal,beforeAudio)=>{beforeAudio();return {ttfa_ms:0,cache:"offline-policy-fixture"};},event=>lines.push({line:event.line,outcome:event.outcome}),()=>clock);
  let delivered!:()=>void;
  let primaryError:Error|undefined;
  const serial=new SerialCoach(async()=>decision,()=>delivered(),()=>clock);
  const hybrid=new HybridCoach(serial,line=>queue.enqueue(line),(id,at)=>queue.clearFault(id,at),()=>{},()=>clock);
  hybrid.start("contract-set");
  async function step(event:CoachEvent):Promise<EvaluatedTurn>{
    const response=await request(event);decision=response.decision;clock+=8000;lines=[];
    const prior_corrections={...corrections},previous_faults=[...previousFaults];
    if(event.type==="rep"){
      const complete=new Promise<void>(resolve=>{delivered=resolve;});
      hybrid.rep(event.report!,[]);await complete;
      for(let i=0;i<8;i++)await Promise.resolve();
      if(!queue.idle)throw new Error("Offline policy fixture did not settle at its declared cadence");
      for(const {line,outcome} of lines)if(outcome==="played" && line.priority==="correction" && line.faultId){const id=line.faultId as FaultId;corrections[id]=(corrections[id]??0)+1;}
      previousFaults=event.report!.faults.map(f=>f.id);
    }else if(event.type==="set_end" || event.type==="session_end")hybrid.end();
    return {event,decision,latency_ms:response.latency_ms,local:[...lines],prior_corrections,previous_faults};
  }
  try{
    if(input.seed_injury){
      await request({type:"onboarding_answer",question:"injuries",transcript:input.seed_injury,next_question:"Do you have dumbbells?"});
      await nextSession();
    }
    for(const event of input.history)await step(event);
    const turns=[await step(input.event)];
    for(const followup of input.followup??[]){if(followup.new_thread)await nextSession();turns.push(await step(followup.event));}
    return {turns,traces,latencies_ms};
  }catch(error){
    primaryError=error instanceof Error ? error:new Error(String(error));throw primaryError;
  }finally{
    hybrid.end();serial.close();queue.close();
    const failures:Error[]=[];
    for(const s of sessions){try{const receipt=await s.close();if(!traces.some(t=>t.thread_id===receipt.thread_id))traces.push(receipt);}catch(error){failures.push(error instanceof Error ? error:new Error(String(error)));}}
    if(failures.length){const errors=[...new Set([...(primaryError ? [primaryError]:[]),...failures])];throw new AggregateError(errors,errors.map(error=>error.message).join("; "));}
  }
}
