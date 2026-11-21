import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { parseEnv } from "node:util";
import { Client as SmithClient, uuid7 } from "langsmith";
import { traceable } from "langsmith/traceable";
import { agentClient, parseDecision, percentile, repRunConfig } from "./lib/agent.mjs";
import { RepReportSchema } from "../shared/rep-report";

const local=await readFile(`${homedir()}/jax-secrets/.env`,"utf8").then(parseEnv);
for(const [key,value] of Object.entries(local))process.env[key] ??= value;
const label=process.argv.find(a=>a.startsWith("--label="))?.split("=")[1] ?? `selected-${local.JAX_AGENT_PROFILE ?? "baseline"}`;
assert.match(label,/^[a-z0-9-]+$/);
const project=process.env.LANGSMITH_PROJECT!;
assert.ok(process.env.LANGSMITH_API_KEY,"LANGSMITH_API_KEY is required");
const smith=new SmithClient(),threadId=uuid7(),userA=`smoke-a-${uuid7()}`,userB=`smoke-b-${uuid7()}`;
const tracingProject=await smith.readProject({projectName:project});
const client=agentClient(userA),other=agentClient(userB);
const evidence={label,project,thread_id:threadId,model:"claude-haiku-5-5",memory:{} as Record<string,unknown>,turns:[] as Record<string,unknown>[],trace:{} as Record<string,unknown>,p50:0,p95:0};
const directory=`${homedir()}/jax-evidence/m1`;
await mkdir(directory,{recursive:true});
async function turn(c: ReturnType<typeof agentClient>,id:string,event:Record<string,unknown>,eventId:string) {
  const start=performance.now();
  const state=await c.runs.wait(id,"jax-coach",{...repRunConfig(event.type),input:{messages:[{role:"user",content:JSON.stringify(event)}]},
    metadata:{thread_id:id,event_type:String(event.type),event_id:eventId,source:"smoke",smoke_label:label}});
  const elapsed=(performance.now()-start)/1000;
  if(state && typeof state === "object" && "__error__" in state)throw new Error(JSON.stringify(state.__error__));
  const decision=parseDecision(state);
  return {elapsed,decision};
}
async function onboarding(c:ReturnType<typeof agentClient>,transcript:string,question:string) {
  const id=uuid7();await c.threads.create({threadId:id,metadata:{thread_id:id,source:"smoke"}});
  return {...await turn(c,id,{type:"onboarding_answer",question,transcript,date:new Date().toISOString().slice(0,10)},`${id}:onboarding`),thread_id:id};
}
try {
  console.log(`Model: claude-haiku-5-5; configuration: ${label}`);
  const first=await onboarding(client,"Full body for 15 minutes. I have dumbbells. My active injury is right runner's knee (patellofemoral pain). Please remember it.","injuries");
  const recall="What active injuries did I previously report? Return remembered injuries in slots.injuries, or [] if none. Do not guess.";
  const same=await onboarding(client,recall,"injury_recall"),different=await onboarding(other,recall,"injury_recall");
  evidence.memory={first,same_user_new_thread:same,different_user:different,pass:false};
  assert.match(same.decision.slots?.injuries.join(" ") ?? "",/knee/i,"Same user's new session must recall knee injury");
  assert.deepEqual(different.decision.slots?.injuries,[],"Different user must have no remembered injuries");
  evidence.memory={first,same_user_new_thread:same,different_user:different,pass:true};
  console.log("Memory: PASS (same user recalled injury in a new thread; different user has no injuries).");
  await client.threads.create({threadId,metadata:{thread_id:threadId,source:"smoke"}});
  const exercises=["rdl","push-press","curl","push-up"] as const;
  const latencies:number[]=[];
  for(let i=0;i<50;i++) {
    const report=RepReportSchema.parse({exercise:exercises[Math.floor(i/10)%4],rep:i%10+1,target:10,
      ms:{total:2000,lowering:1200,lifting:800,since_last_rep:2000},metrics:{},faults:[],
      quality:{visibility:0.95,fps:30,view_ok:true},keyframes:[]});
    const eventId=`${threadId}:rep:${i+1}`;
    const result=await turn(client,threadId,{type:"rep",set:Math.floor(i/10)+1,report},eventId);
    latencies.push(result.elapsed);evidence.turns.push({event_id:eventId,...result});
    assert.ok(!result.decision.speak || result.decision.text.trim().split(/\s+/).length<=14,"In-set speech must be <=14 words");
    assert.equal(result.decision.fault_id,null,"No fault is eligible in a clean report");
    if((i+1)%10===0)console.log(`Rep turns parsed: ${i+1}/50`);
  }
  evidence.p50=percentile(latencies,0.5);evidence.p95=percentile(latencies,0.95);
  console.log(`Latency (seconds, end-to-end, nearest-rank): p50=${evidence.p50.toFixed(3)} p95=${evidence.p95.toFixed(3)} n=50`);
  await traceable(async()=>({rep_turns:50,ok:true}),{name:"smoke.app.traceable",client:smith,project_name:project,
    metadata:{thread_id:threadId,source:"app",smoke_label:label}})();
  await smith.awaitPendingTraceBatches();
  let roots: {id?:string;name?:string;error?:string|null;trace_id?:string;metadata?:Record<string,unknown>}[]=[];
  for(let attempt=0;attempt<10;attempt++) {
    roots=[];
    for await(const run of smith.runs.query({project_ids:[tracingProject.id],is_root:true,selects:["ID","NAME","ERROR","METADATA","TRACE_ID"],filter:`and(eq(metadata_key, "thread_id"), eq(metadata_value, "${threadId}"))`}))roots.push(run);
    const ids=new Set(roots.map(r=>r.metadata?.event_id));
    if(evidence.turns.every(t=>ids.has(t.event_id)) && roots.some(r=>r.name==="smoke.app.traceable"))break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  const ids=new Set(roots.map(r=>r.metadata?.event_id));
  const missing=evidence.turns.filter(t=>!ids.has(t.event_id));
  let repTools=0;
  for await(const run of smith.runs.query({project_ids:[tracingProject.id],selects:["ID"],filter:`and(eq(run_type, "tool"), eq(metadata_key, "thread_id"), eq(metadata_value, "${threadId}"))`})) { assert.ok(run.id); repTools++; }
  const view=roots.find(r=>r.name==="smoke.app.traceable");
  const runUrl=view?.id && view.trace_id ? (await smith.runs.getURL(view.id,{project_id:tracingProject.id,trace_id:view.trace_id})).url : undefined;
  evidence.trace={project_id:tracingProject.id,root_count:roots.length,rep_tool_runs:repTools,missing_event_ids:missing.map(t=>t.event_id),runs:roots.map(r=>({id:r.id,name:r.name,error:r.error,thread_id:r.metadata?.thread_id,event_id:r.metadata?.event_id})),run_url:runUrl};
  assert.equal(missing.length,0,"Agent turns and local trace must share a project/thread");
  assert.equal(roots.length,51,"Thread must contain exactly 50 agent turns and one app trace");
  assert.ok(roots.some(r=>r.name==="smoke.app.traceable"),"App trace must appear in the same thread");
  assert.ok(roots.every(r=>!r.error),"Thread runs must not contain errors");
  assert.equal(repTools,0,"Rep turns must not make tool calls");
  console.log("Rep tool calls: 0 (LangSmith API verified).");
  console.log(`Trace thread: PASS (${roots.length} root runs, 50 agent rep turns + local traceable run); thread_id=${threadId}`);
  console.log(`p95 gate <= 1.800 seconds: ${evidence.p95<=1.8 ? "PASS" : "FAIL"}`);
  if(evidence.p95>1.8)process.exitCode=1;
} catch(error) {
  process.exitCode=1;
  let message=error instanceof Error ? error.message : String(error);
  for(const key of ["ANTHROPIC_API_KEY","LANGSMITH_API_KEY","MDA_INGRESS_SECRET"])if(process.env[key])message=message.replaceAll(process.env[key]!,"[REDACTED]");
  console.error(message);evidence.trace.error=message;
} finally {
  await writeFile(`${directory}/${label}.json`,JSON.stringify(evidence,null,2)+"\n");
  console.log(`Evidence: ${directory}/${label}.json`);
}
