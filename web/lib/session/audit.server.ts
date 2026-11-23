import {Client} from "langsmith";
import {traceable} from "langsmith/traceable";
import {ledgerItem,runName,type LedgerItem} from "./events";
export type AuditRun={id?:string;name?:string;error?:string|null;extra?:{metadata?:Record<string,unknown>};outputs?:Record<string,unknown>|null};
export function compareLedger(thread_id:string,ledger:LedgerItem[],runs:AuditRun[]){
  const missing=ledger.filter(e=>!runs.some(r=>!r.error && r.name===runName(e.type) && (r.extra?.metadata?.event_id??r.id)===e.event_id));
  return {thread_id,pass:ledger.length>0 && missing.length===0,expected:ledger.length,recorded:ledger.length-missing.length,missing};
}
export type AuditResult=ReturnType<typeof compareLedger>;
function expectedLedger(ledger:LedgerItem[],runs:AuditRun[]){
  const manifest=ledgerItem.array().safeParse(runs.find(r=>r.name==="session.end" && ledger.some(e=>e.type==="session.end" && e.event_id===(r.extra?.metadata?.event_id??r.id)))?.outputs?.manifest);
  const ids=new Set(ledger.map(e=>e.event_id));return manifest.success ? [...ledger,...manifest.data.filter(e=>!ids.has(e.event_id))]:ledger;
}
export async function threadRuns(client:Client,thread:string){
  const runs:AuditRun[]=[];
  for await(const run of client.listRuns({projectName:process.env.LANGSMITH_PROJECT,isRoot:true,filter:`and(eq(metadata_key, "thread_id"), eq(metadata_value, "${thread}"))`}))runs.push(run);
  return runs;
}
export async function pollAudit(client:Client,thread:string,ledger:LedgerItem[],timeout=60000){
  const deadline=Date.now()+timeout;let result=compareLedger(thread,ledger,[]);
  do{let timer:ReturnType<typeof setTimeout>|undefined;try{const runs=await Promise.race([threadRuns(client,thread),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error("Audit deadline")),Math.max(0,deadline-Date.now()));})]);result=compareLedger(thread,expectedLedger(ledger,runs),runs);}catch{}finally{clearTimeout(timer);}
    if(result.pass || Date.now()>=deadline)return result;
    await new Promise(resolve=>setTimeout(resolve,Math.min(2000,Math.max(0,deadline-Date.now()))));
  }while(Date.now()<=deadline);
  return result;
}
export async function readSession(client:Client,thread:string){
  const runs=await threadRuns(client,thread),end=runs.find(r=>r.name==="session.end" && !r.error);
  const parsed=ledgerItem.array().min(1).safeParse(end?.outputs?.manifest);
  const saved=runs.find(r=>r.name==="trace.audit" && !r.error)?.outputs;
  const result=parsed.success ? compareLedger(thread,parsed.data,runs):{...compareLedger(thread,[],runs),reason:end ? "Session has no ledger manifest":"Session has no session.end"};
  return {runs,end,result:saved && typeof saved.pass==="boolean" && Array.isArray(saved.missing) ? saved as AuditResult:result,current:result};
}
export async function finishAudit(thread:string,run_id:string,ledger:LedgerItem[]){
  const client=new Client({timeout_ms:5000,callerOptions:{maxRetries:0}});await client.awaitPendingTraceBatches();
  const result=await pollAudit(client,thread,ledger);
  try{const project=await client.readProject({projectName:process.env.LANGSMITH_PROJECT});
    await client.createFeedback({runId:run_id,traceId:run_id,sessionId:project.id,key:"trace_complete",score:result.pass ? 1:0,comment:JSON.stringify(result),feedbackSourceType:"app",sourceInfo:{thread_id:thread}});
    await traceable(async()=>result,{name:"trace.audit",client,tracingEnabled:true,project_name:process.env.LANGSMITH_PROJECT,metadata:{thread_id:thread,session_end:run_id}})();
  }finally{await client.awaitPendingTraceBatches();}
  if(!result.pass && process.env.ALERT_WEBHOOK_URL){
    const response=await fetch(process.env.ALERT_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"trace.incomplete",session_end:run_id,...result}),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error("Alert delivery failed");
  }
  return result;
}
