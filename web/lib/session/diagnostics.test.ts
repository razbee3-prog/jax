import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {clientFailure,installDiagnostics} from "./diagnostics";
import {eventSchema} from "./events";
import {SessionLedger} from "./ledger";
import {compareLedger} from "./audit.server";
const thread="01a20b58-3294-719a-8527-f93082126e2c";
let send:ReturnType<typeof vi.fn<typeof fetch>>,record:ReturnType<typeof vi.fn<(data:Record<string,unknown>)=>void>>,stop:()=>void;
beforeEach(()=>{send=vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));record=vi.fn();vi.stubGlobal("window",Object.assign(new EventTarget(),{fetch:send,location:{href:"https://jax.example/",origin:"https://jax.example"}}));});
afterEach(()=>{stop?.();vi.unstubAllGlobals();});
it("preserves successful responses and adds session correlation without logging bodies",async()=>{
  stop=installDiagnostics(thread,()=>"S3",record);const response=await window.fetch("/api/tts",{method:"POST",body:"private speech",headers:{"Content-Type":"application/json"}});
  expect(await response.text()).toBe("ok");expect(record).not.toHaveBeenCalled();const options=send.mock.calls[0][1]!;expect(new Headers(options.headers).get("x-jax-thread-id")).toBe(thread);expect(options.body).toBe("private speech");
});
it("records a failed API once per screen/status and does not recurse on failed telemetry",async()=>{
  send.mockImplementation(async()=>new Response("private provider details",{status:502}));let screen="S3";stop=installDiagnostics(thread,()=>screen,record);
  await window.fetch("/api/telemetry?token=private");await window.fetch("/api/telemetry?token=other");expect(record).toHaveBeenCalledTimes(1);expect(record).toHaveBeenLastCalledWith({phase:"http",screen:"S3",path:"/api/telemetry",status:502,error_name:"HTTPError",error_message:"HTTP 502"});
  screen="S4";await window.fetch("/api/telemetry");expect(record).toHaveBeenCalledTimes(2);
});
it("records network exceptions and still rejects with the original exception",async()=>{
  const error=new TypeError("Fetch https://private.example/?token=private failed");send.mockRejectedValue(error);stop=installDiagnostics(thread,()=>"S4",record);
  await expect(window.fetch(new Request("https://jax.example/api/coach"))).rejects.toBe(error);expect(record).toHaveBeenCalledWith({phase:"fetch",screen:"S4",path:"/api/coach",error_name:"TypeError",error_message:"Fetch [URL] failed"});
});
it("ignores third-party and non-API requests, and removes listeners on cleanup",async()=>{
  stop=installDiagnostics(thread,()=>"S3",record);await window.fetch("https://other.example/api/tts");await window.fetch("/videos/rdl.mp4");expect(send.mock.calls.every(call=>call[1]===undefined)).toBe(true);
  window.dispatchEvent(Object.assign(new Event("error"),{error:new Error("render failed")}));window.dispatchEvent(Object.assign(new Event("unhandledrejection"),{reason:"promise failed"}));expect(record).toHaveBeenCalledTimes(2);
  stop();expect(window.fetch).toBe(send);window.dispatchEvent(Object.assign(new Event("error"),{message:"later"}));expect(record).toHaveBeenCalledTimes(2);
});
it.each([null,undefined,{},""])("bounds empty/unknown failure %j",error=>{expect(clientFailure(error).error_name).toBe("Error");expect(clientFailure(error).error_message.length).toBeLessThanOrEqual(1000);});
it("bounds details, includes the React digest and accepts errors into the audited ledger",async()=>{
  const data={phase:"react",screen:"S3",...clientFailure({name:"TypeError",message:"x".repeat(2000),digest:"123"})};expect(data.error_message).toHaveLength(1000);expect(data.digest).toBe("123");
  const ledger=new SessionLedger(thread,async(_url,init)=>{const events=JSON.parse(init!.body as string).events;expect(events.every((event:unknown)=>eventSchema.safeParse(event).success)).toBe(true);return Response.json({acknowledged:events.map((event:{event_id:string})=>event.event_id)});});ledger.emit("client.error",data);await ledger.flush();expect(ledger.acknowledged.size).toBe(1);expect(compareLedger(thread,ledger.events,[{id:ledger.events[0].event_id,name:"client.error"}]).pass).toBe(true);
});
