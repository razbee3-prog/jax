import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {Client,uuid7} from "langsmith";
import {SessionLedger} from "../web/lib/session/ledger";
import {RepReporter} from "../web/lib/pose/repReport";
import {landmarkSeries,LANDMARK_IDS} from "../web/lib/session/landmarks";
import type {Fixture} from "../web/lib/pose/types";
import {readSession} from "../web/lib/session/audit.server";
const base=process.env.JAX_BASE_URL,code=process.env.INVITE_CODE;
assert.ok(base && code && process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_PROJECT,"JAX_BASE_URL, INVITE_CODE and LangSmith configuration are required");
assert.ok(new URL(base).protocol==="https:" || new URL(base).hostname==="127.0.0.1","Use HTTPS outside localhost");
const invite=await fetch(base+"/api/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});assert.equal(invite.status,200,"Invite failed");
const cookie=invite.headers.getSetCookie().map(v=>v.split(";")[0]).join("; "),thread=uuid7();
const ledger=new SessionLedger(thread,(url,init)=>fetch(base+url,{...init,headers:{...init?.headers,Cookie:cookie}}));
ledger.emit("session.start",{scripted:true,device:"fixture",browser:"smoke-session"});
for(const [question,answer] of ["full body","10","No injuries","Yes"].entries())ledger.emit("onboarding.turn",{question,transcript:answer,extracted_slot:answer,scripted:true});
for(const [index,exercise] of ["rdl","push-press","curl","push-up"].entries()){
  if(index===0 || index===3)ledger.emit("setup.check",{model:"fixture",pass_time_ms:Date.now(),inference_hz:10,position_check:index===0});
  ledger.emit("set.start",{exercise});
  const fixture=JSON.parse(await readFile(new URL(`../evals/fixtures/${exercise}.json`,import.meta.url),"utf8")) as Fixture;
  const frames=fixture.frames.filter(f=>f.t<=fixture.frames[0].t+3000),reporter=new RepReporter();
  for(let rep=1;rep<=10;rep++){
    const {report}=reporter.build({...fixture,frames},rep,10,3000);
    ledger.emit("rep",{report,frame_width:fixture.width,frame_height:fixture.height,coordinate_space:"normalized-image",landmark_series:landmarkSeries(frames),landmark_ids:JSON.stringify(LANDMARK_IDS),sample_hz:10,scripted:true,resampling:"linear fixture replay"});
    ledger.emit("coach.turn",{event:{type:"rep",report,reports:[report]},decision:{speak:false,text:"",kind:"silence",fault_id:null,slots:null,guidance:null,summary:null,reason:"Fixture event"},latency_ms:0,source:"fallback",reason:"Fixture transport; no agent call",scripted:true});
    ledger.emit("utterance",{text:rep%2 ? "Nice work.":"",outcome:rep%2 ? "played":"dropped",reason:rep%2 ? "fixture playback":"silent decision",ttfa_ms:rep%2 ? 50:null,source:"local",scripted:true});
    await ledger.flush();
  }
  ledger.emit("set.end",{exercise,reps:10,duration_ms:30000,faults_seen:"[]",faults_fixed:"[]"});
}
ledger.emit("session.end",{reps:40,elapsed_ms:180000,kcal:12,weight_kg:68,met:3.5,completion:"complete",scripted:true});await ledger.flush();assert.ok(ledger.receipt,"session.end receipt missing");
const response=await fetch(base+"/api/session/audit",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify({thread_id:thread,...ledger.receipt,ledger:ledger.events}),signal:AbortSignal.timeout(85000)});assert.equal(response.status,200,"Audit unavailable");
const result=await response.json(),client=new Client(),readback=await readSession(client,thread),trace_url=await client.getRunUrl({runId:ledger.receipt.run_id,projectOpts:{projectName:process.env.LANGSMITH_PROJECT}});
assert.equal(readback.current.pass,true,"Independent LangSmith readback failed");assert.equal(readback.runs.filter(r=>r.name==="rep").length,40,"Missing fixture reps");
assert.ok(readback.runs.filter(r=>r.name==="rep").every(r=>Array.isArray(r.outputs?.landmark_series) && r.outputs.landmark_series.length>0 && typeof r.outputs.frame_width==="number" && r.outputs.frame_width>0 && typeof r.outputs.frame_height==="number" && r.outputs.frame_height>0),"Missing landmark replay data or native dimensions");
const output={...result,run_id:ledger.receipt.run_id,trace_url,readback:readback.current};
console.log(`Session trace audit: ${result.pass ? "PASS":"FAIL"} (${result.recorded}/${result.expected} recorded), thread_id=${thread}, session.end=${ledger.receipt.run_id}`);
console.log("LangSmith: "+trace_url);
if(result.missing?.length)console.log("Missing events: "+JSON.stringify(result.missing));
if(process.env.SMOKE_OUTPUT)await writeFile(process.env.SMOKE_OUTPUT,JSON.stringify(output,null,2));assert.equal(result.pass,true,"Trace completeness failed");
