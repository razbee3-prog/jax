import {Client} from "langsmith";
import {writeFile} from "node:fs/promises";
import {ledgerItem} from "../web/lib/session/events";
import {compareLedger,type AuditRun} from "../web/lib/session/audit.server";
if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)throw new Error("LangSmith configuration required");
const client=new Client({timeout_ms:10000,callerOptions:{maxRetries:0}}),sessions=new Map<string,AuditRun[]>();
for await(const run of client.listRuns({projectName:process.env.LANGSMITH_PROJECT,startTime:new Date(Date.now()-86400000),isRoot:true})){
  const thread=run.extra?.metadata?.thread_id;if(typeof thread!=="string" || run.extra?.metadata?.source==="voice-lab")continue;
  if(!sessions.has(thread))sessions.set(thread,[]);sessions.get(thread)!.push(run);
}
const results=[...sessions].map(([thread,runs])=>{const end=runs.find(r=>r.name==="session.end" && !r.error),ledger=ledgerItem.array().min(1).safeParse(end?.outputs?.manifest);return ledger.success ? compareLedger(thread,ledger.data,runs):{thread_id:thread,pass:false,reason:end ? "Missing ledger manifest":"Missing session.end"};});
for(const result of results)console.log(`${result.pass ? "PASS":"FAIL"} ${result.thread_id} ${"reason" in result ? result.reason:JSON.stringify(result.missing)}`);
console.log(`Daily trace sweep: ${results.length} sessions, ${results.filter(r=>!r.pass).length} flagged.`);
if(process.env.SWEEP_OUTPUT)await writeFile(process.env.SWEEP_OUTPUT,JSON.stringify(results,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
