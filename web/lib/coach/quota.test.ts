import {afterEach,expect,it,vi} from "vitest";
import {CoachQuota,coachIp,coachLimits} from "./quota.server";
afterEach(()=>vi.unstubAllEnvs());
it("allows a full session twice and bounds daily user and IP use across threads and identities",()=>{
  const q=new CoachQuota(),limits={thread:120,user:240,ip:300};
  for(let i=0;i<120;i++)expect(q.consume("u","s","ip",limits,0)).toBeNull();expect(q.consume("u","s","ip",limits,0)).toBe("thread");
  for(let i=0;i<120;i++)expect(q.consume("u","s2","ip",limits,0)).toBeNull();expect(q.consume("u","s3","ip",limits,0)).toBe("user");
  for(let i=0;i<60;i++)expect(q.consume("u2","s3","ip",limits,0)).toBeNull();expect(q.consume("u3","s4","ip",limits,0)).toBe("ip");
  expect(q.consume("u3","s4","other-ip",limits,0)).toBeNull();
  expect(q.consume("u","s3","ip",limits,86400000)).toBeNull();expect(q.consume("u","s","ip",limits,86400000)).toBe("thread");
});
it("uses safe defaults for absent, empty and invalid limits",()=>{
  for(const value of ["","0","-1","NaN","1.5","Infinity"]){for(const name of ["THREAD","USER_DAY","IP_DAY"])vi.stubEnv(`COACH_MAX_TURNS_PER_${name}`,value);expect(coachLimits()).toEqual({thread:120,user:240,ip:1200});}
  vi.stubEnv("COACH_MAX_TURNS_PER_THREAD","125");expect(coachLimits().thread).toBe(125);
});
it("uses the proxy's final hop and a shared bucket for missing or malformed IPs",()=>{
  expect(coachIp(new Request("http://localhost"))).toBe("unknown");expect(coachIp(new Request("http://localhost",{headers:{"x-forwarded-for":"forged, 192.0.2.1"}}))).toBe("192.0.2.1");expect(coachIp(new Request("http://localhost",{headers:{"x-forwarded-for":"not-an-ip"}}))).toBe("unknown");
});
