import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CUES } from "../../../shared/cues";
import { FAULT_IDS, FAULTS, speechStatus, type Evidence, type FaultId } from "../../../shared/faults";
import { RepReportSchema, type RepReport, type RepWindow } from "../../../shared/rep-report";
import { buildCountingRows, countTarget, loadFaultFixtures, FaultFixtureSchema } from "../../../evals/datasets/perception";
import { countScores, faultEvidence, faultTable } from "../../../evals/evaluators/perception";
import { analyzeRep } from "./faults";
import { RepReporter } from "./repReport";
import { CuePolicy } from "./cuePolicy";
import { PosePipeline } from "./pipeline";
import { EXERCISES } from "./exercises/config";

const fixture=(id:string)=>FaultFixtureSchema.parse(JSON.parse(readFileSync(`evals/fixtures/faults/${id}.json`,"utf8")));
describe("fault perturbations",()=>{
  it("labels push-press ascent as lifting and return from lockout as lowering",()=>{
    const f=profile("push-press-clean");
    for(const frame of f.frames) frame.t=Math.round(frame.t<2000?frame.t*0.5:1000+(frame.t-2000)*3);
    const p=new PosePipeline(f.exercise,f.width,f.height);
    const samples=f.frames.flatMap(frame=>{const r=p.process(frame);return r?.angles?.valid?[{t:frame.t,a:r.angles}]:[];});
    const peak=samples.reduce((a,b)=>b.a.wristHeight>a.a.wristHeight?b:a);
    const motion=samples.find(s=>!EXERCISES["push-press"].near(s.a))!;
    const ms=analyzeRep(f).ms;
    expect(ms.lifting).toBe(peak.t-motion.t);
    expect(ms.lowering).toBe(samples.at(-1)!.t-peak.t);
    expect(ms.lowering).toBeGreaterThan(ms.lifting);
  });
  it("skips form claims when the decisive peak is off-profile despite good average view",()=>{
    const f=profile("rdl_knee_squat"),p=new PosePipeline(f.exercise,f.width,f.height);
    let peak=0,hip=Infinity;
    f.frames.forEach((frame,i)=>{const r=p.process(frame);if(r?.angles && r.angles.hip<hip){hip=r.angles.hip;peak=i;}});
    for(let i=peak-2;i<=peak+2;i++) f.frames[i].landmarks[12].x+=0.5;
    const a=analyzeRep(f);
    expect(a.quality.visibility).toBe(1);expect(a.quality.view_ok).toBe(false);
    expect(a.observations).toEqual([]);
  });
  for(const id of FAULT_IDS) it("detects synthetic "+id,()=>{
    const f=fixture(id),analysis=analyzeRep(f.window);
    expect(f.provenance).toBe("synthetic");expect(f.expected).toEqual([id]);
    expect(analysis.observations.map(o=>o.id)).toContain(id);
    expect(analysis.observations.every(o=>Number.isFinite(o.value))).toBe(true);
  });
  it("loads all labels, without silently treating perturbation side effects as ground truth",async()=>{
    const all=await loadFaultFixtures(); expect(all).toHaveLength(24);
    expect(all.filter(f=>!f.expected.length)).toHaveLength(5);
    expect(all.every(f=>f.provenance==="synthetic")).toBe(true);
  });
  it("empty and stationary input produce no form claims",()=>{
    expect(analyzeRep(fixture("rdl-off-profile").window).observations).toEqual([]);
    expect(analyzeRep({exercise:"curl",width:1280,height:720,frames:[]}).observations).toEqual([]);
    const f=fixture("curl-clean").window;
    const stationary={...f,frames:f.frames.map(fr=>({...fr,landmarks:f.frames[0].landmarks}))};
    expect(analyzeRep(stationary).observations).toEqual([]);
    const hidden={...f,frames:f.frames.map(fr=>({...fr,landmarks:fr.landmarks.map(p=>({...p,visibility:0}))}))};
    expect(analyzeRep(hidden).quality.visibility).toBe(0);
  });
  it("rejects malformed geometry and out-of-order timestamps",()=>{
    const f=fixture("rdl-clean").window;
    expect(()=>analyzeRep({...f,frames:[f.frames[1],f.frames[0]]})).toThrow("strictly increase");
    expect(()=>analyzeRep({...f,width:0})).toThrow();
    expect(()=>analyzeRep({...f,frames:[{t:0,landmarks:[f.frames[0].landmarks[0]]}]})).toThrow();
  });
});
const evidence=(real=false)=>Object.fromEntries(FAULT_IDS.map(id=>[id,{synthetic:{tp:1,fp:0,fn:0},real:real?{tp:9,fp:1,fn:0}:{tp:0,fp:0,fn:0}}])) as Evidence;
function profile(id:string):RepWindow {
  const f=structuredClone(fixture(id).window);
  for(const frame of f.frames){for(const p of frame.landmarks)p.visibility=1;frame.landmarks[12]={...frame.landmarks[11]};}
  return f;
}
describe("report and speech gates",()=>{
  it("keeps synthetic-only tier A evidence out of speech reports",()=>{
    for(const id of FAULT_IDS.filter(id=>FAULTS[id].tier==="A")){
      const result=new RepReporter(evidence()).build(profile(id),1);
      expect(result.observations.map(o=>o.id)).toContain(id);
      expect(result.report.faults).toEqual([]);
    }
  });
  it("quality-gates degenerate limbs instead of serializing NaN",()=>{
    const f=profile("curl-clean");
    for(const frame of f.frames) for(const [elbow,wrist] of [[13,15],[14,16]]) frame.landmarks[wrist]={...frame.landmarks[elbow]};
    const {report,observations}=new RepReporter(evidence(true)).build(f,1);
    expect(report.quality.visibility).toBe(0);expect(report.quality.view_ok).toBe(false);
    expect(report.metrics).toEqual({});expect(report.faults).toEqual([]);expect(observations).toEqual([]);
  });
  it("omits non-finite optional neck measurements",()=>{
    const f=profile("rdl-clean");f.baselineTorsoLength=1;
    for(const frame of f.frames){frame.landmarks[7]={...frame.landmarks[11]};frame.landmarks[8]={...frame.landmarks[12]};}
    const {report}=new RepReporter(evidence(true)).build(f,1);
    expect(Object.values(report.metrics).every(Number.isFinite)).toBe(true);
    expect(report.metrics).not.toHaveProperty("ear_shoulder_hip");
  });
  it("does not unlock any B fault with synthetic precision, even 1.0",()=>{
    for(const id of FAULT_IDS)expect(speechStatus(id,evidence()[id])).toBe(FAULTS[id].tier==="A"?"provisional":"locked");
    expect(speechStatus("curl_swing")).toBe("locked");
    expect(speechStatus("curl_swing",{synthetic:{tp:1,fp:1,fn:0},real:{tp:0,fp:0,fn:0}})).toBe("locked");
  });
  it("builds bounded schema-valid reports, keeping locked observations out of coach faults",()=>{
    const f=profile("rdl_knee_squat");
    const r=new RepReporter(evidence(true)).build(f,1);
    expect(RepReportSchema.safeParse(r.report).success).toBe(true);
    expect(r.report.faults.find(o=>o.id==="rdl_knee_squat")?.validation).toBe("validated");
    expect(new RepReporter().build(f,1).report.faults).toEqual([]);
    expect(r.observations.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.report).length).toBeLessThan(2800);
  });
  it("requires two consecutive B observations, real precision, and profile view",()=>{
    const f=profile("rdl_back_round"),reporter=new RepReporter(evidence(true));
    expect(()=>reporter.build(f,0)).toThrow();
    expect(reporter.build(f,1).report.faults.some(o=>o.id==="rdl_back_round")).toBe(false);
    expect(reporter.build(f,2).report.faults.some(o=>o.id==="rdl_back_round")).toBe(true);
    const offProfile=structuredClone(f);for(const fr of offProfile.frames)fr.landmarks[12].x+=0.5;
    expect(reporter.build(offProfile,3).report.faults).toEqual([]);
    expect(reporter.build(f,4).report.faults.some(o=>o.id==="rdl_back_round")).toBe(false);
    expect(new RepReporter(evidence()).build(f,2).report.faults.some(o=>o.id==="rdl_back_round")).toBe(false);
  });
  it("empty and bad visibility reports never make claims; invalid report numbers fail",()=>{
    const r=new RepReporter(evidence()); const f=profile("rdl_knee_squat");
    expect(r.build({...f,frames:[]},1).report.faults).toEqual([]);
    const low={...f,frames:f.frames.map(fr=>({...fr,landmarks:fr.landmarks.map(p=>({...p,visibility:0.1}))}))};
    expect(r.build(low,2).report.faults).toEqual([]);
    expect(()=>r.build(f,0)).toThrow();
  });
});
describe("cue bank and correction loop",()=>{
  const make=(rep:number,ids:FaultId[]=["rdl_knee_squat"]):RepReport=>({exercise:"rdl",rep,target:10,ms:{total:2000,lowering:1000,lifting:1000,since_last_rep:0},metrics:{},quality:{visibility:1,fps:30,view_ok:true},keyframes:[],faults:ids.map(id=>({id,tier:FAULTS[id].tier,value:100,threshold:130,streak:1,validation:"provisional"}))});
  it("has three variants per cue kind for every fault",()=>{
    for(const id of FAULT_IDS)for(const values of Object.values(CUES[id])){expect(values).toHaveLength(3);expect(new Set(values).size).toBe(3);}
  });
  it("nudges once, reminds differently, then stays quiet; resets per set",()=>{
    const p=new CuePolicy(); const r=(rep:number)=>p.next({report:make(rep),observations:[]});
    const first=r(1)!,reminder=r(2)!;expect(first.kind).toBe("first");expect(reminder.kind).toBe("reminder");expect(first.text).not.toBe(reminder.text);
    expect(r(3)).toBeNull();p.reset();expect(r(1)?.kind).toBe("first");
  });
  it("acknowledges a cleared fault and suppresses low-quality form claims",()=>{
    const p=new CuePolicy();p.next({report:make(1),observations:[]});
    expect(p.next({report:make(2,[]),observations:[]})?.kind).toBe("fixed");
    expect(p.next({report:{...make(3),quality:{visibility:0.5,fps:30,view_ok:true}},observations:[]})).toBeNull();
  });
  it("chooses one priority fault and keeps spoken variants within 14 words",()=>{
    const p=new CuePolicy();const cue=p.next({report:make(1,["rdl_fast","rdl_back_round"]),observations:[]})!;
    expect(cue.fault_id).toBe("rdl_back_round");expect(cue.text.split(/\s+/).length).toBeLessThanOrEqual(14);
  });
});
describe("perception evaluators",()=>{
  it("matches all four demo counts and all twelve negative/exercise rows",async()=>{
    const rows=await buildCountingRows();expect(rows).toHaveLength(16);
    for(const row of rows)expect(countScores(countTarget(row.inputs).count,row.outputs.count as number)).toEqual({exact_match:1,absolute_error:0});
  });
  it("computes masked per-fault precision and recall without promoting synthetic B evidence",()=>{
    const rows=[{predicted:["rdl_back_round"] as FaultId[],expected:["rdl_back_round"] as FaultId[],evaluated:["rdl_back_round"] as FaultId[],provenance:"synthetic" as const},{predicted:["rdl_back_round"] as FaultId[],expected:[],evaluated:["rdl_back_round"] as FaultId[],provenance:"synthetic" as const}];
    const r=faultTable(rows).find(r=>r.id==="rdl_back_round")!;
    expect(r.precision).toBe(0.5);expect(r.recall).toBe(1);expect(r.status).toBe("locked");
    expect(faultEvidence([]).rdl_back_round?.real.tp).toBe(0);
    expect(faultTable([]).every(r=>r.precision===null&&r.recall===null&&r.status==="locked")).toBe(true);
    expect(countScores(3,2)).toEqual({exact_match:0,absolute_error:1});expect(()=>countScores(NaN,0)).toThrow();
  });
});
