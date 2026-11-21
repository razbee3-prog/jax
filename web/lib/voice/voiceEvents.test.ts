import { beforeEach,afterEach,it,expect,vi } from "vitest";
const {flush,trace}=vi.hoisted(()=>({flush:vi.fn(async()=>{}),trace:vi.fn((fn:()=>Promise<unknown>,config?:unknown)=>{void config;return fn;})}));
vi.mock("langsmith",()=>({Client:class{awaitPendingTraceBatches=flush;}}));
vi.mock("langsmith/traceable",()=>({traceable:trace}));
import { POST } from "../../app/api/voice-events/route";
import { inviteCookie } from "./access.server";
const data={thread_id:"01a1fba4-24d3-7059-ac40-04df80fa1c61",event_id:"voice-one",type:"utterance",text:"Push the floor away.",outcome:"played",reason:"completed",ttfa_ms:180,cache:"MISS"};
function request(body:unknown=data,authenticated=true){return new Request("http://localhost/api/voice-events",{method:"POST",headers:authenticated ? {cookie:inviteCookie().split(";")[0]} : {},body:JSON.stringify(body)});}
beforeEach(()=>{vi.stubEnv("SESSION_SECRET","test");vi.stubEnv("LANGSMITH_API_KEY","test");vi.stubEnv("LANGSMITH_PROJECT","test-project");});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it("traces a voice event under the UUID v7 session, flushes, and acknowledges the ledger ID",async()=>{
  const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toEqual({event_id:data.event_id});expect(flush).toHaveBeenCalledOnce();
  expect(trace.mock.calls[0][1]).toMatchObject({name:"utterance",metadata:{thread_id:data.thread_id,event_id:data.event_id},tracingEnabled:true});
});
it("fails closed for unauthorized, invalid, unconfigured and failed trace submissions",async()=>{
  expect((await POST(request(data,false))).status).toBe(401);expect((await POST(request({}))).status).toBe(400);expect((await POST(request({...data,audio:"not allowed"}))).status).toBe(400);
  vi.stubEnv("LANGSMITH_API_KEY","");expect((await POST(request())).status).toBe(503);vi.stubEnv("LANGSMITH_API_KEY","test");flush.mockRejectedValueOnce(new Error("offline"));expect((await POST(request())).status).toBe(502);
});
