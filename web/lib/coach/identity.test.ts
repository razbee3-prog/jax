import {afterEach,expect,it,vi} from "vitest";
import {identifyUser,userIdentity} from "./identity.server";
afterEach(()=>vi.unstubAllEnvs());
it("uses a stable signed HttpOnly identity, never a caller supplied user header",()=>{
  vi.stubEnv("SESSION_SECRET","unit-secret");const first=identifyUser(new Request("http://localhost"));expect(first.cookie).toContain("HttpOnly; SameSite=Strict");
  const request=new Request("http://localhost",{headers:{cookie:first.cookie,"x-mda-user-id":"another-user"}});expect(userIdentity(request)).toBe(first.id);expect(identifyUser(request).id).toBe(first.id);
  expect(userIdentity(new Request("http://localhost",{headers:{cookie:first.cookie.replace(first.id,"a".repeat(36))}}))).toBeNull();
  expect(identifyUser(new Request("http://localhost")).id).not.toBe(first.id);
});
it("fails closed for missing, malformed or unsigned identities",()=>{
  vi.stubEnv("SESSION_SECRET","");expect(()=>identifyUser(new Request("http://localhost"))).toThrow("SESSION_SECRET");
  vi.stubEnv("SESSION_SECRET","secret");for(const cookie of ["","jax_user=forged","jax_user="+"a".repeat(36)+"."+"b".repeat(64)+".extra"])expect(userIdentity(new Request("http://localhost",{headers:{cookie}}))).toBeNull();
});
