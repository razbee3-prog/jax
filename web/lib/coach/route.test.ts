import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {uuid7} from "langsmith";
import {CoachDecisionSchema} from "../../../shared/coach-decision";
import {CoachEventSchema} from "../../../shared/coach-event";
import {identifyUser} from "./identity.server";
import {inviteCookie} from "../voice/access.server";
const mocks=vi.hoisted(()=>({wait:vi.fn(),create:vi.fn(),identity:vi.fn(),trace:vi.fn()}));
vi.mock("langsmith",async importOriginal=>({...await importOriginal<typeof import("langsmith")>(),Client:class{awaitPendingTraceBatches(){return Promise.resolve();}}}));
vi.mock("langsmith/traceable",()=>({traceable:(fn:()=>unknown,options:unknown)=>{mocks.trace(options);return fn;}}));
vi.mock("./agent.server",()=>({agentClient:(user:string)=>{mocks.identity(user);return {threads:{create:mocks.create},runs:{wait:mocks.wait}};},parseDecision:(state:Record<string,unknown>)=>CoachDecisionSchema.parse(state.structuredResponse),repRunConfig:()=>({durability:"exit"})}));
import {POST} from "../../app/api/coach/route";
const decision={speak:false,text:"",kind:"silence",fault_id:null,slots:null,guidance:null,summary:null,reason:"No fault"};
beforeEach(()=>{vi.stubEnv("SESSION_SECRET","route-test");mocks.wait.mockReset().mockResolvedValue({structuredResponse:decision});mocks.create.mockReset().mockImplementation(async(input:{metadata:unknown})=>({metadata:input.metadata}));mocks.identity.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
function request(body:unknown,options:{auth?:boolean;cookie?:string}={}){
  const cookie=options.cookie??`${inviteCookie().split(";")[0]}; ${identifyUser(new Request("http://localhost")).cookie.split(";")[0]}`;
  return new Request("http://localhost/api/coach",{method:"POST",headers:{"Content-Type":"application/json",...(options.auth===false ? {}:{cookie})},body:typeof body==="string" ? body:JSON.stringify(body)});
}
const event=()=>({thread_id:uuid7(),event_id:crypto.randomUUID(),event:{type:"brief"}});
it("rejects unsigned, malformed and oversized calls before reaching the agent",async()=>{
  expect((await POST(request(event(),{auth:false}))).status).toBe(401);expect((await POST(request("not-json"))).status).toBe(400);expect((await POST(request({}))).status).toBe(400);expect((await POST(request("x".repeat(64001)))).status).toBe(413);expect(mocks.wait).not.toHaveBeenCalled();
});
it("uses the signed backend identity and session thread, never a caller identity",async()=>{
  const body=event(),user=identifyUser(new Request("http://localhost")),cookie=`${inviteCookie().split(";")[0]}; ${user.cookie.split(";")[0]}`;
  const response=await POST(request(body,{cookie}));expect(response.status).toBe(200);expect((await response.json()).decision).toEqual(decision);expect(mocks.identity).toHaveBeenCalledWith(user.id);expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({threadId:body.thread_id}));expect(mocks.wait).toHaveBeenCalledWith(body.thread_id,"jax-coach",expect.objectContaining({multitaskStrategy:"reject",metadata:expect.objectContaining({thread_id:body.thread_id})}));
});
it("rejects overlapping turns for the same signed user and releases the lock after errors",async()=>{
  let resolve!:(value:unknown)=>void;mocks.wait.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const body=event(),cookie=`${inviteCookie().split(";")[0]}; ${identifyUser(new Request("http://localhost")).cookie.split(";")[0]}`;
  const first=POST(request(body,{cookie}));await vi.waitFor(()=>expect(mocks.wait).toHaveBeenCalledOnce());expect((await POST(request(body,{cookie}))).status).toBe(409);resolve({structuredResponse:decision});expect((await first).status).toBe(200);
  mocks.wait.mockRejectedValueOnce(new Error("offline"));expect((await POST(request(body,{cookie}))).status).toBe(502);expect((await POST(request(body,{cookie}))).status).toBe(200);
});
it("rejects missing and inconsistent rep batches without accepting frame payloads",()=>{
  expect(CoachEventSchema.safeParse({type:"rep"}).success).toBe(false);expect(CoachEventSchema.safeParse({type:"brief",camera_frames:"forbidden"}).success).toBe(false);expect(CoachEventSchema.safeParse({type:"onboarding_answer",question:"injuries"}).success).toBe(false);
});
it("refuses a thread owned by another signed identity",async()=>{mocks.create.mockResolvedValueOnce({metadata:{user_id:"other-user"}});expect((await POST(request(event()))).status).toBe(502);expect(mocks.wait).not.toHaveBeenCalled();});
it("caps signed-identity thread usage before another paid call and traces fallback",async()=>{
  vi.stubEnv("COACH_MAX_TURNS_PER_THREAD","1");const body=event(),cookie=`${inviteCookie().split(";")[0]}; ${identifyUser(new Request("http://localhost")).cookie.split(";")[0]}`;
  expect((await POST(request(body,{cookie}))).status).toBe(200);const limited=await POST(request({...body,event_id:crypto.randomUUID()},{cookie}));expect(limited.status).toBe(429);expect(await limited.json()).toMatchObject({source:"fallback"});expect(mocks.wait).toHaveBeenCalledOnce();expect(mocks.trace).toHaveBeenCalledWith(expect.objectContaining({metadata:expect.objectContaining({thread_id:body.thread_id,source:"fallback"})}));
});
