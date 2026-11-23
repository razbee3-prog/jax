import {afterEach,expect,it,vi} from "vitest";
import {auditError,retryAuditRead} from "./audit-errors.server";
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
it("logs the exception class and status without environment secrets or URLs",()=>{
  vi.stubEnv("LANGSMITH_API_KEY","fixture-private-key");const error=Object.assign(new Error("fixture-private-key failed https://private.example/token?secret=other"),{status:503,cause:new TypeError("not logged")});
  expect(auditError(error)).toEqual({name:"Error",message:"[REDACTED] failed [URL]",status:503,cause_name:"TypeError"});expect(auditError("offline")).toMatchObject({message:"offline"});
});
it("retries a transient metadata read once with bounded backoff",async()=>{
  vi.useFakeTimers();const read=vi.fn().mockRejectedValueOnce(new DOMException("slow","TimeoutError")).mockResolvedValueOnce({id:"project"});const result=retryAuditRead(read);expect(read).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(250);await expect(result).resolves.toEqual({id:"project"});expect(read).toHaveBeenCalledTimes(2);
});
it("does not retry authentication errors or retry indefinitely",async()=>{
  const denied=vi.fn().mockRejectedValue(Object.assign(new Error("denied"),{status:401}));await expect(retryAuditRead(denied)).rejects.toThrow("denied");expect(denied).toHaveBeenCalledTimes(1);
  vi.useFakeTimers();const unavailable=vi.fn().mockRejectedValue(Object.assign(new Error("unavailable"),{status:503}));const failure=expect(retryAuditRead(unavailable)).rejects.toThrow("unavailable");await vi.advanceTimersByTimeAsync(250);await failure;expect(unavailable).toHaveBeenCalledTimes(2);
});
