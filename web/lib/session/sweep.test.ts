import {afterEach,beforeEach,expect,it,vi} from "vitest";
import type {AuditRun} from "./audit.server";
const fixture=vi.hoisted(()=>({runs:[] as AuditRun[]}));
vi.mock("langsmith",()=>({Client:class {async *listRuns(){yield* fixture.runs;}}}));
const thread="01a209a7-5410-71c5-8aa0-168f6b4caf2a",voice="01a209a9-b362-77a8-9d93-0eb301154309",start="a7287018-cbdf-46b6-bba7-0ecdf2c3116b",end="4f67d452-11e2-4fd4-903e-bfe0ac419459";
const manifest=[{event_id:start,type:"session.start"},{event_id:end,type:"session.end"}],originalExit=process.exitCode;
function run(id:string,name:string,thread_id=thread,source="shell",outputs:Record<string,unknown>={}){return {id,name,extra:{metadata:{thread_id,source}},outputs};}
beforeEach(()=>{vi.resetModules();vi.stubEnv("LANGSMITH_API_KEY","test-key");vi.stubEnv("LANGSMITH_PROJECT","test-project");vi.stubEnv("SWEEP_OUTPUT","");process.exitCode=0;vi.spyOn(console,"log").mockImplementation(()=>{});});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();process.exitCode=originalExit;});
it("ignores voice-lab utterance and transcript threads",async()=>{
  fixture.runs=[run(start,"utterance",voice,"voice-lab"),run(end,"onboarding.turn",voice,"voice-lab")];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenLastCalledWith("Daily trace sweep: 0 sessions, 0 flagged.");expect(process.exitCode).toBe(0);
});
it("sweeps completed workouts without including voice-lab runs",async()=>{
  fixture.runs=[run(start,"session.start"),run(end,"session.end",thread,"shell",{manifest}),run("voice-event","utterance",voice,"voice-lab")];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenLastCalledWith("Daily trace sweep: 1 sessions, 0 flagged.");expect(process.exitCode).toBe(0);
});
it("still flags abandoned workouts",async()=>{
  fixture.runs=[run(start,"session.start")];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenCalledWith(`FAIL ${thread} Missing session.end`);expect(process.exitCode).toBe(1);
});
it("still flags legacy workouts without manifests",async()=>{
  fixture.runs=[run(start,"session.start"),run(end,"session.end")];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenCalledWith(`FAIL ${thread} Missing ledger manifest`);expect(process.exitCode).toBe(1);
});
it("does not hide workouts whose session.start trace was lost",async()=>{
  fixture.runs=[run(end,"session.end",thread,"shell",{manifest})];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenCalledWith(`FAIL ${thread} ${JSON.stringify([manifest[0]])}`);expect(process.exitCode).toBe(1);
});
it("handles a project with no runs",async()=>{
  fixture.runs=[];await import("../../../scripts/sweep-sessions.mjs");expect(console.log).toHaveBeenLastCalledWith("Daily trace sweep: 0 sessions, 0 flagged.");expect(process.exitCode).toBe(0);
});
