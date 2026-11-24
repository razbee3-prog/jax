import type {TraceData,LedgerItem,TraceEvent} from "./events";
export type LedgerCheckpoint={events:LedgerItem[];acknowledged:string[];pending:TraceEvent[];receipt:{run_id:string;receipt:string}|null};
export class SessionLedger {
  readonly events:LedgerItem[]=[];
  readonly acknowledged=new Set<string>();
  receipt:{run_id:string;receipt:string}|null=null;
  private pending:{thread_id:string;event_id:string;type:string;data:TraceData}[]=[];
  private unacknowledged=new Map<string,{thread_id:string;event_id:string;type:string;data:TraceData}>();
  private chain:Promise<void>=Promise.resolve();
  private changed=()=>{};
  subscribe(changed:()=>void){this.changed=changed;return()=>{this.changed=()=>{};};}
  constructor(readonly thread_id:string,private send:typeof fetch=(...args)=>fetch(...args),saved?:LedgerCheckpoint){if(saved){this.events.push(...saved.events);for(const id of saved.acknowledged)this.acknowledged.add(id);for(const event of saved.pending)this.unacknowledged.set(event.event_id,event);this.receipt=saved.receipt;}}
  checkpoint():LedgerCheckpoint{return {events:this.events.map(e=>({...e})),acknowledged:[...this.acknowledged],pending:[...this.unacknowledged.values()] as TraceEvent[],receipt:this.receipt};}
  emit(type:string,data:TraceData={}){
    const event_id=crypto.randomUUID();this.events.push({event_id,type:type as LedgerItem["type"]});
    const event={thread_id:this.thread_id,event_id,type,data:type==="session.end" ? {...data,manifest:this.events.map(e=>({...e}))}:data};this.pending.push(event);this.unacknowledged.set(event_id,event);this.changed();
  }
  private batches(){
    const batches:typeof this.pending[]=[];let batch:typeof this.pending=[];
    for(const event of this.pending.splice(0)){if(batch.length && (batch.length>=100 || new TextEncoder().encode(JSON.stringify({events:[...batch,event]})).length>48000)){batches.push(batch);batch=[];}batch.push(event);}
    if(batch.length)batches.push(batch);return batches;
  }
  flush(){
    this.chain=this.chain.then(async()=>{this.pending=[...this.unacknowledged.values()];for(const events of this.batches()){try{const response=await this.send("/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({events}),signal:AbortSignal.timeout(20000)});if(!response.ok)continue;const result=await response.json();for(const id of result.acknowledged??[])if(events.some(e=>e.event_id===id)){this.acknowledged.add(id);this.unacknowledged.delete(id);}if(result.run_id && result.receipt)this.receipt={run_id:result.run_id,receipt:result.receipt};this.changed();}catch{}}});
    return this.chain;
  }
  beacon(send:(url:string,data:Blob)=>boolean){
    const pending=this.pending.slice();this.pending=[...this.unacknowledged.values()];for(const events of this.batches())send("/api/telemetry",new Blob([JSON.stringify({events})],{type:"application/json"}));this.pending=pending;
  }
}
