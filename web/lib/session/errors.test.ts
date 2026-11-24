import {afterEach,expect,it,vi} from "vitest";
import {logApiError} from "./errors.server";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it("logs a correlated server exception without secrets or URLs",()=>{
  vi.stubEnv("ELEVENLABS_API_KEY","fixture-server-secret");const log=vi.spyOn(console,"error").mockImplementation(()=>{}),thread="01a20b58-3294-719a-8527-f93082126e2c";
  logApiError("/api/tts",new TypeError("fixture-server-secret failed https://private.example/token"),new Request("https://jax.example/api/tts",{headers:{"x-jax-thread-id":thread}}));
  expect(log).toHaveBeenCalledWith("jax.api.error",{path:"/api/tts",thread_id:thread,name:"TypeError",message:"[REDACTED] failed [URL]"});
});
it.each([null,undefined,""])("handles unknown errors and missing or malformed correlation %j",error=>{
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});logApiError("/api/telemetry",error,new Request("https://jax.example",{headers:{"x-jax-thread-id":"not-a-session"}}),{status:400});expect(log.mock.calls[0][1]).toMatchObject({path:"/api/telemetry",status:400,name:"Error"});expect(log.mock.calls[0][1]).not.toHaveProperty("thread_id");
});
