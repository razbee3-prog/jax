import { FAULTS, type FaultId } from "../../../shared/faults";
import { RepWindowSchema, type RepWindow } from "../../../shared/rep-report";
import { angle, SIDES } from "./angles";
import { EXERCISES } from "./exercises/config";
import { PosePipeline } from "./pipeline";
import type { Angles, Landmark, Side } from "./types";

export type Observation = { id: FaultId; value: number; threshold: number; metric: string; tier: "A" | "B" };
type Sample = { t: number; a: Angles; points: Landmark[]; side: Side };
function belowLine(p: Landmark, a: Landmark, b: Landmark) {
  const dx = b.x-a.x, dy = b.y-a.y;
  return ((p.y-a.y)*Math.abs(dx)-(p.x-a.x)*dy*Math.sign(dx)) / (Math.hypot(dx,dy) || 1);
}
export function analyzeRep(input: RepWindow) {
  const window = RepWindowSchema.parse(input);
  const pipeline = new PosePipeline(window.exercise, window.width, window.height);
  const samples: Sample[] = [];
  let last = -Infinity;
  for (const frame of window.frames) {
    if (frame.t <= last) throw new Error("Rep window timestamps must strictly increase");
    last = frame.t;
    const r = pipeline.process(frame);
    if (r?.angles?.valid && Object.values(r.angles).every(v=>typeof v !== "number" || Number.isFinite(v))) samples.push({ t:frame.t, a:r.angles, points:r.points, side:r.side });
  }
  const observations: Observation[] = [];
  const total = window.frames.length > 1 ? window.frames.at(-1)!.t-window.frames[0].t : 0;
  const quality = { visibility: samples.length / (window.frames.length || 1), fps: total ? (window.frames.length-1)*1000/total : 0, view_ok: samples.length > 0 && samples.filter(s=>s.a.viewOk).length/samples.length >= 0.8 };
  const ms = { total, lowering:0, lifting:0 };
  const metrics: Record<string, number> = {};
  if (!samples.length) return { observations, quality, ms, metrics, keyframes:[] };
  const first = samples[0], end = samples.at(-1)!;
  const extreme = (fn:(s:Sample)=>number, max=false) => samples.reduce((a,b)=>(max ? fn(b)>fn(a) : fn(b)<fn(a)) ? b : a);
  const pivot = window.exercise === "rdl" ? extreme(s=>s.a.hip) : window.exercise === "push-press" ? extreme(s=>s.a.wristHeight,true) : extreme(s=>s.a.elbow);
  if (!pivot.a.viewOk) { quality.view_ok = false; return { observations, quality, ms, metrics, keyframes:[] }; }
  const baseline = window.baselineTorsoLength ?? first.a.torsoLength;
  const min = (fn:(s:Sample)=>number) => Math.min(...samples.map(fn));
  const max = (fn:(s:Sample)=>number) => Math.max(...samples.map(fn));
  const motion = samples.find(s=>!EXERCISES[window.exercise].near(s.a)) ?? first;
  const outbound = Math.max(0,pivot.t-motion.t), inbound = Math.max(0,end.t-pivot.t);
  ms.lowering = window.exercise === "curl" ? inbound : outbound;
  ms.lifting = window.exercise === "curl" ? outbound : inbound;
  Object.assign(metrics,{ hip_min:min(s=>s.a.hip), knee_min:min(s=>s.a.knee), elbow_min:min(s=>s.a.elbow), elbow_max:max(s=>s.a.elbow), torso_lean_max:max(s=>s.a.torsoLean), torso_len_ratio_min:min(s=>s.a.torsoLength/baseline) });
  const progress = EXERCISES[window.exercise].progress;
  const excursion = max(s=>progress(s.a))-min(s=>progress(s.a));
  if (excursion < (window.exercise === "push-press" ? 0.15 : 10)) return { observations, quality, ms, metrics, keyframes:[] };
  function flag(id:FaultId, metric:string, value:number, threshold:number, condition:boolean) {
    if (!Number.isFinite(value)) return;
    metrics[metric] = value;
    if (condition && Number.isFinite(value)) observations.push({ id, metric, value, threshold, tier:FAULTS[id].tier });
  }
  function joints(s:Sample) {
    const p = s.points.map(p=>({...p,x:p.x*window.width,y:p.y*window.height}));
    const [shoulder,elbow,wrist,hip,knee,ankle,heel,toe] = SIDES[s.side].map(i=>p[i]);
    return { shoulder,elbow,wrist,hip,knee,ankle,heel,toe, ear:p[s.side === "left" ? 7 : 8], facing:Math.sign(toe.x-heel.x)||1 };
  }
  const b = joints(pivot);
  if (window.exercise === "rdl") {
    const ratio = pivot.a.torsoLength/baseline;
    const neck = b.ear.visibility >= 0.5 ? angle(b.ear,b.shoulder,b.hip) : 180;
    if (ratio < 0.88) flag("rdl_back_round","bottom_torso_ratio",ratio,0.88,true);
    else flag("rdl_back_round","ear_shoulder_hip",neck,150,neck<150);
    flag("rdl_knee_squat","bottom_knee",pivot.a.knee,130,pivot.a.knee<130);
    const f = Math.max(0,Math.min(1,(b.wrist.y-b.knee.y)/(b.ankle.y-b.knee.y || 1)));
    const drift = (b.wrist.x-(b.knee.x+f*(b.ankle.x-b.knee.x)))*b.facing/baseline;
    flag("rdl_drift","wrist_shin_gap",drift,0.25,drift>0.25);
    const pass = max(s=>{const j=joints(s);return (j.wrist.y-j.knee.y)/baseline;});
    if (pivot.a.torsoLean<45) flag("rdl_shallow","bottom_torso_lean",pivot.a.torsoLean,45,true);
    else flag("rdl_shallow","wrist_past_knee",pass,0,pass<=0);
    flag("rdl_fast","lowering_ms",ms.lowering,1000,ms.lowering<1000);
  } else if (window.exercise === "push-press") {
    const dip = samples.filter(s=>s.t<=pivot.t).reduce((a,b)=>b.a.knee<a.a.knee ? b:a,first);
    flag("pp_chest_forward","dip_lean",dip.a.torsoLean,15,dip.a.torsoLean>15);
    flag("pp_dip_deep","dip_knee",dip.a.knee,125,dip.a.knee<125);
    const bend = Math.max(...samples.filter(s=>s.t<=pivot.t).map(s=>s.a.knee))-dip.a.knee;
    flag("pp_no_legs","dip_knee_change",bend,12,bend<12);
    const extension = max(s=>s.a.elbow), front=(b.wrist.x-b.shoulder.x)*b.facing/baseline;
    if (extension<160) flag("pp_soft_lockout","elbow_peak",extension,160,true);
    else flag("pp_soft_lockout","lockout_front",front,0.2,front>0.2);
    flag("pp_lean_back","lockout_lean",pivot.a.torsoLean,-12,pivot.a.torsoLean < -12);
    const early = samples.find(s=>s.t>=dip.t && s.t<=pivot.t && s.a.wristHeight-first.a.wristHeight>=0.15);
    flag("pp_press_early","knee_at_press_start",early?.a.knee ?? 180,170,!!early && early.a.knee<170);
  } else if (window.exercise === "curl") {
    const swing = max(s=>s.a.torsoLean)-min(s=>s.a.torsoLean);
    flag("curl_swing","lean_range",swing,12,swing>12);
    flag("curl_elbow_drift","top_shoulder_flex",pivot.a.shoulderFlex,30,pivot.a.shoulderFlex>30);
    if (metrics.elbow_min>60) flag("curl_partial","elbow_top",metrics.elbow_min,60,true);
    else flag("curl_partial","elbow_bottom",metrics.elbow_max,155,metrics.elbow_max<155);
    flag("curl_drop","lowering_ms",ms.lowering,800,ms.lowering<800);
  } else {
    const bent = samples.filter(s=>s.a.bodyLine<160);
    const sag = Math.max(0,...bent.map(s=>{const j=joints(s);return belowLine(j.hip,j.shoulder,j.ankle)/baseline;}));
    const pike = Math.min(0,...bent.map(s=>{const j=joints(s);return belowLine(j.hip,j.shoulder,j.ankle)/baseline;}));
    flag("pu_hip_sag","hip_below_line",sag,0,sag>0);
    flag("pu_hip_pike","hip_below_line_min",pike,0,pike<0);
    flag("pu_shallow","elbow_min",metrics.elbow_min,100,metrics.elbow_min>=100);
    const ears = samples.filter(s=>joints(s).ear.visibility>=0.5);
    if (ears.length/samples.length>=0.8) {
      const drop = Math.max(...ears.map(s=>{const j=joints(s);return belowLine(j.ear,j.shoulder,j.hip)/baseline;}));
      flag("pu_head_drop","ear_below_line",drop,0.15,drop>0.15);
    }
  }
  observations.sort((a,b)=>FAULTS[a.id].priority-FAULTS[b.id].priority);
  const keyframes = ([ ["top",first], ["bottom",pivot], ["end",end] ] as const).map(([t,s])=>{
    const indices = SIDES[s.side];
    return { t, lm:Object.fromEntries(["shoulder","hip","knee","ankle"].map((name,i)=>{
      const p=s.points[indices[[0,3,4,5][i]]];return [name,[p.x,p.y] as [number,number]];
    })) };
  });
  return { observations, quality, ms, metrics, keyframes };
}
