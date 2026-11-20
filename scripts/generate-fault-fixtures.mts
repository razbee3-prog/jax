import { mkdir, readFile, writeFile } from "node:fs/promises";
import { FAULT_IDS, FAULTS } from "../shared/faults";
import { PosePipeline } from "../web/lib/pose/pipeline";
import { SIDES } from "../web/lib/pose/angles";
import type { Fixture, Frame } from "../web/lib/pose/types";

const out="evals/fixtures/faults";
await mkdir(out,{recursive:true});
const bases = new Map<string,Fixture>();
const projection="Synthetic profile projection: all landmark visibility set to 1 and right shoulder placed on left shoulder; left-side geometry otherwise preserved.";
function profileFrames(frames:Frame[]):Frame[] {
  return frames.map(frame=>{const landmarks=frame.landmarks.map(p=>({...p,visibility:1}));landmarks[12]={...landmarks[11]};return {...frame,landmarks};});
}
for(const exercise of ["rdl","push-press","curl","push-up"] as const){
  const f:Fixture=JSON.parse(await readFile(`evals/fixtures/${exercise}.json`,"utf8"));
  const p=new PosePipeline(exercise,f.width,f.height);
  const end=f.frames.findIndex(frame=>(p.process(frame)?.count ?? 0)>=1);
  if(end<0) throw new Error("No first rep: "+exercise);
  bases.set(exercise,{...f,frames:f.frames.slice(0,end+1),expected:1});
  if(exercise==="rdl") await writeFile(`${out}/rdl-off-profile.json`,JSON.stringify({version:1,id:"rdl-off-profile",provenance:"synthetic",source:f.source,perturbation:"Unmodified first demo rep: off-profile quality negative, no form claims expected.",expected:[],evaluated:FAULT_IDS.filter(id=>FAULTS[id].exercise===exercise),window:{exercise,width:f.width,height:f.height,frames:f.frames.slice(0,end+1)}}));
  await writeFile(`${out}/${exercise}-clean.json`,JSON.stringify({version:1,id:exercise+"-clean",provenance:"synthetic",source:f.source,perturbation:"First demo rep, presumed clean negative (not real labeled form footage). "+projection,expected:[],evaluated:FAULT_IDS.filter(id=>FAULTS[id].exercise===exercise),window:{exercise,width:f.width,height:f.height,frames:profileFrames(f.frames.slice(0,end+1))}}));
}
for(const id of FAULT_IDS){
  const base=bases.get(FAULTS[id].exercise)!;
  const f:Fixture=structuredClone(base);
  const p=new PosePipeline(f.exercise,f.width,f.height);
  let pivot=f.frames[0].t,peak=-Infinity;
  for(const frame of f.frames){const r=p.process(frame);if(!r?.angles)continue;const v=f.exercise==="rdl" ? -r.angles.hip : f.exercise==="push-press" ? r.angles.wristHeight : -r.angles.elbow;if(v>peak){peak=v;pivot=frame.t;}}
  const duration=f.frames.at(-1)!.t;
  let description="";
  for(const frame of f.frames){
    const weight=Math.sin(Math.PI/2*(frame.t<=pivot ? frame.t/(pivot||1) : (duration-frame.t)/(duration-pivot||1)))**2;
    for(const side of ["left","right"] as const){
      const pts=frame.landmarks.map(l=>({...l,x:l.x*f.width,y:l.y*f.height}));
      const [si,ei,wi,hi,ki,ai,hei,ti]=SIDES[side];
      const s=pts[si],e=pts[ei],w=pts[wi],h=pts[hi],k=pts[ki],a=pts[ai];
      const L=Math.hypot(s.x-h.x,s.y-h.y),facing=Math.sign(pts[ti].x-pts[hei].x)||1;
      const set=(i:number,x:number,y:number)=>{frame.landmarks[i]={...frame.landmarks[i],x:x/f.width,y:y/f.height};};
      const lean=(degrees:number)=>{const rad=degrees*Math.PI/180;const dx=h.x+L*Math.sin(rad)*facing-s.x,dy=h.y-L*Math.cos(rad)-s.y;for(const i of [si,ei,wi,side==="left"?7:8])set(i,pts[i].x+dx,pts[i].y+dy);};
      const bend=()=>set(ki,h.x+1.2*L*facing,(h.y+a.y)/2);
      const elbowAngle=(degrees:number)=>{const r=degrees*Math.PI/180,ux=s.x-e.x,uy=s.y-e.y;set(wi,e.x+0.8*(ux*Math.cos(r)-uy*Math.sin(r)),e.y+0.8*(ux*Math.sin(r)+uy*Math.cos(r)));};
      if(id==="rdl_back_round"){for(const i of [si,ei,wi,side==="left"?7:8])set(i,h.x+(pts[i].x-h.x)*(1-0.6*weight),h.y+(pts[i].y-h.y)*(1-0.6*weight));description="Upper limb/ear/shoulder coordinates contract toward hip by up to 60%, smoothly peaking at the original hinge bottom.";}
      if(id==="rdl_knee_squat"||id==="pp_dip_deep"||id==="pp_press_early"){bend();description="Both knees moved forward 1.2 current torso lengths at hip/ankle midpoint height throughout the rep; early-press case retains original wrist rise with bent knees.";}
      if(id==="rdl_drift"){set(wi,w.x+3*L*facing,w.y);description="Wrists translated forward three torso lengths throughout the rep.";}
      if(id==="rdl_shallow"){set(wi,w.x,k.y-0.1*L);description="Wrists held 0.1 torso lengths above knees; original hip path retained.";}
      if(id==="pp_chest_forward"){lean(40);description="Upper body translated to a 40-degree forward torso lean; limb offsets preserved.";}
      if(id==="pp_no_legs"){set(ki,(h.x+a.x)/2,(h.y+a.y)/2);description="Knees placed on hip-ankle midpoint: no dip excursion.";}
      if(id==="pp_soft_lockout"||id==="curl_partial"||id==="pu_shallow"){elbowAngle(id==="pu_shallow"?115+50*(1-weight):id==="curl_partial"?80+60*(1-weight):110+40*(1-weight));description="Forearms rotated through a smooth partial arc: "+(id==="pu_shallow"?"165 to 115":id==="curl_partial"?"140 to 80":"150 to 110")+" degrees and back; original upper-arm path retained.";}
      if(id==="pp_lean_back"){lean(-30);description="Upper body translated to a 30-degree backward torso lean throughout lockout.";}
      if(id==="curl_swing"){lean(-40*weight);description="Upper body smoothly leans backward up to 40 degrees at original curl top.";}
      if(id==="curl_elbow_drift"){const x=s.x+L*facing,y=s.y+0.1*L;set(ei,x,y);set(wi,w.x+x-e.x,w.y+y-e.y);description="Elbows moved one torso length forward and 0.1 down from shoulder; forearm offsets preserved.";}
      if(id==="pu_hip_sag"||id==="pu_hip_pike"){set(hi,h.x,h.y+(id==="pu_hip_sag"?1:-1)*L);description="Hips translated one torso length "+(id==="pu_hip_sag"?"down":"up")+" in image space.";}
      if(id==="pu_head_drop"){const ear=side==="left"?7:8;set(ear,pts[ear].x,pts[ear].y+2*L);frame.landmarks[ear].visibility=1;description="Ears translated two torso lengths down and marked visible.";}
    }
    if(id==="rdl_fast"){frame.t=Math.round(frame.t*0.1);description="All timestamps compressed to 10% duration.";}
    if(id==="curl_drop"){if(frame.t>pivot)frame.t=Math.round(pivot+(frame.t-pivot)*0.05);description="Only original post-top timestamps compressed to 5% duration.";}
  }
  const frames:Frame[]=f.frames.filter((frame,i,all)=>!i||frame.t>all[i-1].t);
  await writeFile(`${out}/${id}.json`,JSON.stringify({version:1,id,provenance:"synthetic",source:base.source,perturbation:description+" "+projection,expected:[id],evaluated:[id],window:{exercise:f.exercise,width:f.width,height:f.height,frames:profileFrames(frames)}}));
}
console.log("Generated 19 synthetic profile fault cases, 4 projected clean negatives and 1 off-profile quality negative.");
