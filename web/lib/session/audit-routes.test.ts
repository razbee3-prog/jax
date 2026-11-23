import {beforeEach,afterEach,it,expect,vi} from "vitest";
const {finish,read}=vi.hoisted(()=>({finish:vi.fn(),read:vi.fn()}));
vi.mock("./audit.server",()=>({finishAudit:finish,readSession:read}));
import {POST} from "../../app/api/session/audit/route";
import {GET} from "../../app/admin/sessions/[id]/route";
import {inviteCookie} from "../voice/access.server";
import {feedbackReceipt} from "./feedback.server";
const thread="01a1fbca-bc9c-773c-8811-18f65a5a4ff4",run=crypto.randomUUID();
beforeEach(()=>{vi.stubEnv("SESSION_SECRET","test");vi.stubEnv("ADMIN_KEY","test-admin");finish.mockResolvedValue({pass:true,thread_id:thread,expected:1,recorded:1,missing:[]});});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const body=()=>({thread_id:thread,run_id:run,receipt:feedbackReceipt(thread,run),ledger:[{event_id:run,type:"session.end"}]});
const request=(data:unknown,auth=true)=>new Request("http://localhost/api/session/audit",{method:"POST",headers:auth ? {cookie:inviteCookie().split(";")[0]}:{},body:JSON.stringify(data)});
it("audits only an authenticated signed session with a nonempty unique end-bound ledger",async()=>{
  expect((await POST(request(body(),false))).status).toBe(401);expect((await POST(request({}))).status).toBe(400);expect((await POST(request({...body(),receipt:"wrong"}))).status).toBe(403);expect((await POST(request({...body(),ledger:[]}))).status).toBe(400);expect((await POST(request({...body(),ledger:[...body().ledger,...body().ledger]}))).status).toBe(400);const response=await POST(request(body()));expect(response.status).toBe(200);expect((await response.json()).pass).toBe(true);expect(finish).toHaveBeenCalledWith(thread,run,body().ledger);
});
it("returns real audit failures and service errors rather than a placeholder PASS",async()=>{
  finish.mockResolvedValueOnce({pass:false,missing:body().ledger});expect((await (await POST(request(body()))).json()).pass).toBe(false);finish.mockRejectedValueOnce(new Error("offline"));expect((await POST(request(body()))).status).toBe(502);
});
it("checks admin credentials server-side and handles missing, invalid, escaped and unavailable sessions",async()=>{
  const params=Promise.resolve({id:thread}),headers={authorization:"Basic "+Buffer.from("admin:test-admin").toString("base64")};
  expect((await GET(new Request("http://localhost"),{params})).status).toBe(401);expect((await GET(new Request("http://localhost",{headers:{authorization:"Basic "+Buffer.from("admin:wrong").toString("base64")}}),{params})).status).toBe(401);expect((await GET(new Request("http://localhost",{headers}),{params:Promise.resolve({id:"bad"})})).status).toBe(400);
  read.mockResolvedValueOnce({runs:[]});expect((await GET(new Request("http://localhost",{headers}),{params})).status).toBe(404);
  read.mockResolvedValueOnce({runs:[{name:"<script>alert(1)</script>"}],result:{pass:false,expected:1,recorded:0,missing:body().ledger}});const response=await GET(new Request("http://localhost",{headers}),{params});expect(response.status).toBe(200);const html=await response.text();expect(html).toContain("FAIL");expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("test-admin");read.mockRejectedValueOnce(new Error("offline"));expect((await GET(new Request("http://localhost",{headers}),{params})).status).toBe(503);
});
