import { afterEach, describe, expect, it, vi } from "vitest";
import { agentClient, parseDecision, percentile, repRunConfig } from "../../../scripts/lib/agent.mjs";
import { currentSetMessages, latestEventType, memoryWriteCompleted, toolAllowed } from "../../../agent/policy";

const silent={speak:false,text:"",kind:"silence",fault_id:null,slots:null,reason:"Clean rep; leave room to move."};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("CoachDecision",()=>{
  it("parses structured silence and an onboarding answer",()=>{
    expect(parseDecision({structuredResponse:silent})).toEqual(silent);
    expect(parseDecision({structured_response:{...silent,speak:true,text:"Got it.",kind:"ack",slots:{focus:"full body",duration_min:15,injuries:[],has_dumbbells:true}}}).slots?.injuries).toEqual([]);
  });
  it("rejects missing, malformed and unknown-fault responses",()=>{
    for(const response of [{},{structuredResponse:{}},{structuredResponse:{...silent,speak:"false"}},{structuredResponse:{...silent,fault_id:"invented"}}])expect(()=>parseDecision(response)).toThrow();
  });
  it("rejects empty reasons, inconsistent speech and invalid durations",()=>{
    for(const decision of [{...silent,reason:" "},{...silent,text:"unexpected speech"},{...silent,speak:true},
      {...silent,slots:{focus:null,duration_min:-1,injuries:[],has_dumbbells:null}}])expect(()=>parseDecision({structuredResponse:decision})).toThrow();
  });
});
describe("agent ingress",()=>{
  it("uses exit-only checkpoints only for tool-free rep trials in the trim profile",()=>{
    vi.stubEnv("JAX_AGENT_PROFILE","baseline");
    expect(repRunConfig("rep","trim")).toEqual({durability:"exit"});
    for(const event of ["onboarding_answer","session_end",null])expect(repRunConfig(event,"trim")).toEqual({});
    for(const profile of ["baseline","short","unknown",undefined])expect(repRunConfig("rep",profile)).toEqual({});
  });
  it("sends backend identity, never the workspace key",async()=>{
    const fetch=vi.fn<typeof globalThis.fetch>(async()=>Response.json({thread_id:"thread"}));
    vi.stubGlobal("fetch",fetch);vi.stubEnv("LANGSMITH_API_KEY","must-not-be-forwarded");
    await agentClient("user-a",{MDA_DEPLOYMENT_URL:"https://agent.example",MDA_INGRESS_SECRET:"test-ingress"}).threads.create({threadId:"thread"});
    const headers=new Headers(fetch.mock.calls[0][1]?.headers);
    expect(headers.get("x-mda-user-id")).toBe("user-a");
    expect(headers.get("x-mda-ingress-secret")).toBe("test-ingress");
    expect(headers.has("x-api-key")).toBe(false);
  });
  it("fails closed for missing configuration or caller",()=>{
    expect(()=>agentClient("user",{})).toThrow("MDA_DEPLOYMENT_URL");
    expect(()=>agentClient("user",{MDA_DEPLOYMENT_URL:"https://agent.example"})).toThrow("MDA_INGRESS_SECRET");
    expect(()=>agentClient(" ",{MDA_DEPLOYMENT_URL:"https://agent.example",MDA_INGRESS_SECRET:"test"})).toThrow("user ID");
  });
});
describe("onboarding-only tools",()=>{
  it("keeps only the current set for optimized rep context",()=>{
    const old={role:"user",content:'{"type":"rep","report":{"rep":9}}'};
    const start={role:"user",content:'{"type":"rep","report":{"rep":1}}'};
    const response={role:"assistant",content:"structured decision"};
    const latest={role:"user",content:'{"type":"rep","report":{"rep":2}}'};
    expect(currentSetMessages([old,start,response,latest])).toEqual([start,response,latest]);
    const explicit={role:"user",content:'{"type":"set_start"}'};
    expect(currentSetMessages([old,explicit,latest])).toEqual([explicit,latest]);
    expect(currentSetMessages([])).toEqual([]);
    expect(currentSetMessages([{role:"user",content:"invalid"}])).toEqual([{role:"user",content:"invalid"}]);
  });
  it("requires a successful memory write in the current turn",()=>{
    const answer={role:"user",content:'{"type":"onboarding_answer","question":"injuries"}'};
    const saved={role:"tool",name:"write_file",content:"Successfully wrote user memory"};
    expect(memoryWriteCompleted([])).toBe(false);
    expect(memoryWriteCompleted([answer,saved])).toBe(true);
    expect(memoryWriteCompleted([answer,{...saved,status:"error"}])).toBe(false);
    expect(memoryWriteCompleted([answer,{...saved,content:"Error: file exists"}])).toBe(false);
    expect(memoryWriteCompleted([saved,answer])).toBe(false);
  });
  it("recognizes the last user event through intervening replies",()=>{
    expect(latestEventType([{role:"user",content:'{"type":"onboarding_answer"}'},{role:"assistant",content:"reply"}])).toBe("onboarding_answer");
    expect(toolAllowed("onboarding_answer","write_file")).toBe(true);
    expect(toolAllowed("onboarding_answer","task")).toBe(false);
  });
  it("denies tools on rep, other events, empty or malformed input",()=>{
    expect(latestEventType([])).toBe(null);
    expect(latestEventType([{role:"user",content:'{"type":"onboarding_answer"}'},{role:"user",content:"invalid JSON"}])).toBe(null);
    expect(latestEventType([{role:"user",content:[]}])).toBe(null);
    for(const event of ["rep","set_start","set_end","session_end",null])for(const tool of ["read_file","write_file","edit_file","task","write_todos"])expect(toolAllowed(event,tool)).toBe(false);
  });
});
describe("latency percentiles",()=>{
  it("uses nearest rank over all samples, without excluding slow turns",()=>{
    expect(percentile([5,1,4,2,3],0.5)).toBe(3);
    expect(percentile(Array.from({length:50},(_,i)=>i+1),0.95)).toBe(48);
  });
  it("rejects empty, non-finite, negative samples and invalid quantiles",()=>{
    for(const samples of [[],[NaN],[Infinity],[-1]])expect(()=>percentile(samples,0.95)).toThrow();
    for(const q of [0,1.1,NaN])expect(()=>percentile([1],q)).toThrow();
  });
});
