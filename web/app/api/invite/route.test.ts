import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { GET } from "../health/route";
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => vi.stubEnv("SESSION_SECRET","test-session-secret"));
const request = (body: unknown) => new Request("http://localhost/api/invite", { method: "POST", body: JSON.stringify(body) });
describe("invite", () => {
  it("accepts a case-insensitive code", async () => { vi.stubEnv("INVITE_CODE", "JAX"); expect((await POST(request({ code: "jax" }))).status).toBe(200); });
  it.each([["code=jax",200],["code=wrong",401],["code=",400],["",400]])("handles native form POST %s",async(body,status)=>{
    vi.stubEnv("INVITE_CODE","JAX");
    const response=await POST(new Request("http://localhost/api/invite",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body}));
    expect(response.status).toBe(status);
    if(status===200)expect(response.headers.get("set-cookie")).toContain("jax_invite=");
    else expect(response.headers.has("set-cookie")).toBe(false);
  });
  it("rejects a wrong code", async () => { vi.stubEnv("INVITE_CODE", "JAX"); expect((await POST(request({ code: "wrong" }))).status).toBe(401); });
  it.each([{}, null, { code: "" }, { code: 123 }])("rejects an empty or invalid code %j", async body => { vi.stubEnv("INVITE_CODE", "JAX"); expect((await POST(request(body))).status).toBe(400); });
  it("handles malformed JSON", async () => { vi.stubEnv("INVITE_CODE", "JAX"); expect((await POST(new Request("http://localhost/api/invite", { method: "POST", body: "{" }))).status).toBe(400); });
  it("fails closed without configuration", async () => { vi.stubEnv("INVITE_CODE", ""); expect((await POST(request({ code: "jax" }))).status).toBe(503); });
});
it("reports health", async () => { expect(await GET().json()).toEqual({ status: "ok" }); });
