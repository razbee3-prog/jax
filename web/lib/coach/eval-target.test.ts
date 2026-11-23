import {describe,it,expect,vi} from "vitest";
import {invitedApp} from "../../../evals/targets/app";
import {coachTarget} from "../../../evals/targets/coach";
import {buildCoachRows} from "../../../evals/datasets/coach";
import {aggregateHard} from "../../../evals/evaluators/coach";
import {eventSchema,type TraceEvent} from "../session/events";

function transport(coachStatus=200,acknowledge=true,auditStatus=200,quietHistory=false){
  const events:TraceEvent[]=[],requests:{url:string;cookie:string|null}[]=[];
  const send:typeof fetch=vi.fn(async(input,init)=>{
    const url=String(input),body=JSON.parse(String(init?.body??"{}"));requests.push({url,cookie:new Headers(init?.headers).get("cookie")});
    if(url.endsWith("/api/invite"))return Response.json({ok:true},{headers:{"Set-Cookie":"jax_user=fixture; HttpOnly; Path=/"}});
    if(url.endsWith("/api/coach")){
      if(coachStatus!==200)return Response.json({error:"Evaluation error"},{status:coachStatus});
      const fault=quietHistory ? undefined:body.event.report?.faults[0];
      return Response.json({decision:{speak:false,text:"",kind:"silence",fault_id:null,slots:null,reason:"Policy fixture",guidance:fault ? {action:"focus",fault_id:fault.id,text:""}:{action:"quiet",fault_id:null,text:""},summary:null},latency_ms:5});
    }
    if(url.endsWith("/api/telemetry")){
      for(const event of body.events)events.push(eventSchema.parse(event));
      const end=events.find(e=>e.type==="session.end");
      return Response.json({acknowledged:acknowledge ? body.events.map((e:TraceEvent)=>e.event_id):[],...(end ? {run_id:end.event_id,receipt:"fixture-receipt"}:{})});
    }
    if(url.endsWith("/api/session/audit"))return auditStatus===200 ? Response.json({pass:true,expected:events.length,recorded:events.length,missing:[]}):Response.json({error:"Fixture audit outage"},{status:auditStatus});
    throw new Error("Unexpected test endpoint");
  });
  return {send,events,requests};
}
describe("M8 production-path target",()=>{
  it("rejects third-cue fixtures unless two corrections actually played in history",async()=>{
    const row=buildCoachRows().find(r=>r.inputs.id==="rdl_knee_squat-third")!;
    const input={...row.inputs,required_prior_corrections:{rdl_knee_squat:2}};
    for(const history of [input.history,[]]){
      const mock=transport(200,true,200,true);
      await expect(coachTarget({...input,history},{base:"http://127.0.0.1",invite:"fixture",send:mock.send})).rejects.toThrow("Invalid evaluation fixture");
    }
    const mock=transport(),result=await coachTarget(input,{base:"http://127.0.0.1",invite:"fixture",send:mock.send});
    expect(result.turns[0].prior_corrections.rdl_knee_squat).toBe(2);
  });
  it("uses the invite identity, app route, real hybrid replay and an audited ledger",async()=>{
    const mock=transport(),row=buildCoachRows().find(r=>r.inputs.id==="rdl_knee_squat-fixed")!;
    const result=await coachTarget(row.inputs,{base:"http://127.0.0.1:3000",invite:"fixture",send:mock.send});
    expect(result.turns[0].local[0].line).toMatchObject({rep:2,exercise:"rdl",priority:"fixed"});
    expect(Object.values(aggregateHard(result.turns,[row.outputs])).every(v=>v===1)).toBe(true);
    expect(result.traces).toHaveLength(1);expect(result.traces[0].pass).toBe(true);
    expect(mock.requests.filter(r=>!r.url.endsWith("/api/invite")).every(r=>r.cookie==="jax_user=fixture")).toBe(true);
    expect(mock.events.at(-1)?.data.manifest).toHaveLength(mock.events.length);
  });
  it("rejects cleartext remote URLs and missing signed identities",async()=>{
    await expect(invitedApp({base:"http://example.com",invite:"fixture",send:vi.fn()})).rejects.toThrow("HTTPS");
    await expect(invitedApp({base:"http://127.0.0.1",invite:"fixture",send:vi.fn(async()=>Response.json({ok:true}))})).rejects.toThrow("no identity cookie");
  });
  it("does not convert HTTP failure or unacknowledged telemetry into a passing target",async()=>{
    const bad=transport(429),app=await invitedApp({base:"http://127.0.0.1",invite:"fixture",send:bad.send}),session=app.session();
    await expect(session.turn({type:"brief"})).rejects.toThrow("HTTP 429");await session.close();
    expect(bad.events.find(e=>e.type==="coach.turn")?.data.source).toBe("fallback");
    const lost=transport(200,false),other=await invitedApp({base:"http://127.0.0.1",invite:"fixture",send:lost.send});
    await expect(other.session().close()).rejects.toThrow("not acknowledged");
  });
  it("preserves the primary error when cleanup also fails",async()=>{
    const mock=transport(429,true,502),row=buildCoachRows().find(r=>r.inputs.id==="rdl_knee_squat-first")!;
    await expect(coachTarget(row.inputs,{base:"http://127.0.0.1",invite:"fixture",send:mock.send})).rejects.toThrow("Evaluation coach HTTP 429; Evaluation trace audit HTTP 502");
  });
});
