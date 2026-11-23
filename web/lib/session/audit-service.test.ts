import {it,expect,vi,afterEach} from "vitest";
const {feedback,flush,query}=vi.hoisted(()=>({feedback:vi.fn(async()=>({})),flush:vi.fn(async()=>{}),query:vi.fn()}));
vi.mock("langsmith",()=>({Client:class{createFeedback=feedback;awaitPendingTraceBatches=flush;listRuns=query;readProject=async()=>({id:"project"});}}));
vi.mock("langsmith/traceable",()=>({traceable:(fn:()=>unknown)=>fn}));
import {finishAudit} from "./audit.server";
const thread="01a1fbca-bc9c-773c-8811-18f65a5a4ff4",id=crypto.randomUUID(),ledger=[{event_id:id,type:"session.end" as const}];
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();});
it("writes trace_complete=1 on session.end and flushes a complete audit",async()=>{
  query.mockImplementation(async function*(){yield {id,name:"session.end"};});const result=await finishAudit(thread,id,ledger);expect(result.pass).toBe(true);expect(feedback).toHaveBeenCalledWith(expect.objectContaining({runId:id,key:"trace_complete",score:1}));expect(flush).toHaveBeenCalledTimes(2);
});
it("polls at most 60 seconds, writes trace_complete=0 and posts all missing IDs to the webhook",async()=>{
  vi.useFakeTimers();vi.stubEnv("ALERT_WEBHOOK_URL","http://localhost/alert");const post=vi.fn<typeof fetch>(async()=>new Response(null,{status:204}));vi.stubGlobal("fetch",post);query.mockImplementation(async function*(){});const pending=finishAudit(thread,id,ledger);await vi.advanceTimersByTimeAsync(60000);const result=await pending;expect(result.missing).toEqual(ledger);expect(feedback).toHaveBeenCalledWith(expect.objectContaining({runId:id,score:0}));expect(JSON.parse(post.mock.calls[0][1]!.body as string)).toMatchObject({type:"trace.incomplete",missing:ledger,expected:1,recorded:0});
});
it("surfaces unavailable feedback and failed webhook delivery without reporting PASS",async()=>{
  query.mockImplementation(async function*(){yield {id,name:"session.end"};});feedback.mockRejectedValueOnce(new Error("feedback unavailable"));await expect(finishAudit(thread,id,ledger)).rejects.toThrow("feedback unavailable");expect(flush).toHaveBeenCalledTimes(2);
  vi.useFakeTimers();vi.stubEnv("ALERT_WEBHOOK_URL","http://localhost/alert");vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:500})));query.mockImplementation(async function*(){});const failure=expect(finishAudit(thread,id,ledger)).rejects.toThrow("Alert delivery failed");await vi.advanceTimersByTimeAsync(60000);await failure;
});
