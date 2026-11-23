import {afterEach,describe,expect,it,vi} from "vitest";
import {CUES} from "../../../shared/cues";
import type {CoachDecision} from "../../../shared/coach-decision";
import type {RepReport} from "../../../shared/rep-report";
import {HybridCoach} from "./hybrid";
import {SerialCoach} from "./serial";
const silent:CoachDecision={speak:false,text:"",kind:"silence",fault_id:null,slots:null,reason:"Guidance only",guidance:null,summary:null};
const report=(rep:number,faults:RepReport["faults"]=[]):RepReport=>({exercise:"rdl",rep,target:10,ms:{total:2000,lowering:1000,lifting:1000,since_last_rep:2200},metrics:{},faults,quality:{visibility:1,view_ok:true,fps:30},keyframes:[]});
const fault:RepReport["faults"][number]={id:"rdl_knee_squat",value:120,threshold:130,tier:"A",streak:1,validation:"validated"};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
afterEach(()=>{vi.useRealTimers();});
describe("serialized background coach",()=>{
  it("sends once while busy and coalesces subsequent rep reports without losing reps",async()=>{
    const first=deferred<CoachDecision>(),sent=vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(silent),log=vi.fn();const coach=new SerialCoach(sent,log);
    const event=(rep:number)=>({type:"rep" as const,set_id:"one",report:report(rep),reports:[report(rep)]});
    const results=[coach.request(event(1)),coach.request(event(2)),coach.request(event(3))];await Promise.resolve();expect(sent).toHaveBeenCalledTimes(1);
    first.resolve(silent);await Promise.all(results);expect(sent).toHaveBeenCalledTimes(2);expect(sent.mock.calls[1][0].reports.map((r:RepReport)=>r.rep)).toEqual([2,3]);expect(log).toHaveBeenCalledTimes(2);coach.close();
  });
  it("returns fallback at four seconds, never overlaps a still-running turn, and recovers",async()=>{
    vi.useFakeTimers();const first=deferred<CoachDecision>(),sent=vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(silent),log=vi.fn(),coach=new SerialCoach(sent,log);
    const result=coach.request({type:"rep",set_id:"one",report:report(1),reports:[report(1)]});const pending=coach.request({type:"set_end"});
    await vi.advanceTimersByTimeAsync(4000);expect(await result).toMatchObject({source:"fallback",reason:"four-second deadline"});expect((await pending).source).toBe("fallback");
    expect((await coach.request({type:"session_end"})).source).toBe("fallback");expect(sent).toHaveBeenCalledTimes(1);
    first.resolve(silent);await vi.advanceTimersByTimeAsync(0);expect((await coach.request({type:"brief"})).source).toBe("agent");coach.close();
  });
  it("handles empty queues, rejection and closing pending work",async()=>{
    const failing=new SerialCoach(async()=>{throw new Error("offline");},vi.fn());expect((await failing.request({type:"brief"})).source).toBe("fallback");failing.close();expect((await failing.request({type:"brief"})).reason).toBe("session closed");
    const blocked=deferred<CoachDecision>(),coach=new SerialCoach(()=>blocked.promise,vi.fn());const first=coach.request({type:"brief"}),pending=coach.request({type:"session_end"});coach.close();expect((await pending).reason).toBe("session closed");blocked.resolve(silent);await first;
  });
  it("retains and coalesces unsent reps even after an earlier turn times out",async()=>{
    vi.useFakeTimers();const first=deferred<CoachDecision>(),sent=vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(silent),coach=new SerialCoach(sent,vi.fn());const event=(rep:number)=>({type:"rep" as const,set_id:"one",report:report(rep),reports:[report(rep)]});
    const initial=coach.request(event(1)),pending=[coach.request(event(2)),coach.request(event(3))];await vi.advanceTimersByTimeAsync(4000);expect((await initial).source).toBe("fallback");pending.push(coach.request(event(4)));expect(sent).toHaveBeenCalledTimes(1);first.resolve(silent);await Promise.all(pending);expect(sent.mock.calls[1][0].reports.map((r:RepReport)=>r.rep)).toEqual([2,3,4]);coach.close();
  });
});
describe("hybrid local decisions",()=>{
  function harness(decision:CoachDecision=silent){const send=vi.fn().mockResolvedValue(decision),queue=vi.fn(),clear=vi.fn(),log=vi.fn(),serial=new SerialCoach(send,vi.fn()),local=new HybridCoach(serial,queue,clear,log);local.start("one");return {local,serial,send,queue,clear,log};}
  it("makes the local cue synchronously before the transport starts; milestones remain local",async()=>{
    const h=harness();h.local.rep(report(1,[fault]),[]);expect(h.queue).toHaveBeenCalledWith(expect.objectContaining({source:"local",cachedOnly:true,text:CUES.rdl_knee_squat.first[0]}));expect(h.send).not.toHaveBeenCalled();
    await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());h.local.rep(report(5),[]);expect(h.queue).toHaveBeenCalledWith(expect.objectContaining({text:"Five. Halfway.",source:"local",cachedOnly:true}));h.serial.close();
  });
  it("ignores empty, provisional, Tier B, wrongly-tiered and low-quality faults",()=>{
    const h=harness();for(const faults of [[],[{...fault,validation:"provisional" as const}],[{...fault,id:"rdl_back_round" as const,tier:"B" as const}],[{...fault,id:"rdl_back_round" as const}]]){h.local.start(crypto.randomUUID());h.local.rep(report(1,faults),[]);}
    h.local.start("poor");h.local.rep({...report(1,[fault]),quality:{visibility:0.2,view_ok:false,fps:5}},[]);expect(h.queue.mock.calls.every(([line])=>line.speak===false)).toBe(true);h.serial.close();
  });
  it("applies only approved external-focus reminder wording and preserves the two-cue cap",async()=>{
    const h=harness({...silent,guidance:{action:"reminder",fault_id:fault.id,text:CUES[fault.id].reminder[1]}});
    h.local.rep(report(1,[fault]),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());await Promise.resolve();h.local.rep(report(2,[fault]),[]);
    expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"agent",text:CUES[fault.id].reminder[1]}));h.local.rep(report(3,[fault]),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({speak:false}));h.serial.close();
  });
  it.each(["Use your glutes",Array(15).fill("wall").join(" ")])("rejects an arbitrary wording override: %s",async text=>{
    const h=harness({...silent,guidance:{action:"reminder",fault_id:fault.id,text}});h.local.rep(report(1,[fault]),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());await Promise.resolve();h.local.rep(report(2,[fault]),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"local",text:CUES[fault.id].reminder[0]}));h.serial.close();
  });
  it("never speaks an agent rep response directly",async()=>{
    const h=harness({...silent,speak:true,text:"Agent speech must never play",kind:"correction",guidance:{action:"reminder",fault_id:fault.id,text:CUES[fault.id].reminder[1]}});h.local.rep(report(1,[fault]),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());h.local.rep(report(2,[fault]),[]);expect(h.queue.mock.calls.some(([line])=>line.text.includes("Agent speech"))).toBe(false);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"local"}));h.serial.close();
  });
  it("rejects late guidance after a clear/reappearance and after set end",async()=>{
    const pending=deferred<CoachDecision>(),h=harness();h.send.mockReturnValueOnce(pending.promise);h.local.rep(report(1,[fault]),[]);await Promise.resolve();h.local.rep(report(2),[]);h.local.rep(report(3,[fault]),[]);pending.resolve({...silent,guidance:{action:"ack",fault_id:fault.id,text:CUES[fault.id].fixed[1]}});await vi.waitFor(()=>expect(h.send).toHaveBeenCalledTimes(2));h.local.rep(report(4),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"local",text:CUES[fault.id].fixed[0]}));expect(h.clear).toHaveBeenCalledWith(fault.id,expect.any(Number));h.local.end();const count=h.queue.mock.calls.length;h.local.rep(report(5,[fault]),[]);expect(h.queue).toHaveBeenCalledTimes(count);h.serial.close();
  });
  it("supports quiet guidance and marks outage turns and subsequent local cues fallback",async()=>{
    const h=harness({...silent,guidance:{action:"quiet",fault_id:null,text:""}});h.local.rep(report(1),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());await Promise.resolve();h.local.rep(report(2),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"agent",speak:false}));
    h.local.contact({event:{type:"brief"},decision:null,source:"fallback",reason:"offline",latency_ms:4});h.local.rep(report(3,[fault]),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"fallback",text:CUES[fault.id].first[0]}));h.serial.close();
  });
  it("invalidates quiet guidance when a new fault appears, without spending corrective quota",async()=>{
    const h=harness({...silent,guidance:{action:"quiet",fault_id:null,text:""}});h.local.rep(report(1),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());await Promise.resolve();h.local.rep(report(2,[fault]),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"local",text:CUES[fault.id].first[0]}));h.serial.close();
  });
  it("focuses a different eligible flagged fault without allowing unflagged guidance",async()=>{
    const drift={...fault,id:"rdl_drift" as const},h=harness({...silent,guidance:{action:"focus",fault_id:"rdl_drift",text:""}});h.local.rep(report(1,[fault,drift]),[]);await vi.waitFor(()=>expect(h.send).toHaveBeenCalledOnce());h.local.rep(report(2,[fault,drift]),[]);expect(h.queue).toHaveBeenLastCalledWith(expect.objectContaining({source:"agent",text:CUES.rdl_drift.first[0]}));h.serial.close();
  });
});
