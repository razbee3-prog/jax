import {FAULTS,FAULT_IDS,type FaultId,type Exercise} from "../../shared/faults";
import type {CoachEvent} from "../../shared/coach-event";
import {RepReportSchema,type RepReport} from "../../shared/rep-report";

export type CoachExpectation={
  speak:boolean;
  guidance?:"eligible"|"quiet";
  fault?:FaultId;
  local_speech?:boolean;
  local_kind?:"first"|"reminder"|"fixed";
  mention?:FaultId;
  slot?:{name:"focus"|"duration_min"|"injuries"|"has_dumbbells";value:string|number|boolean|string[]};
  conservative?:boolean;
  camera?:boolean;
};
export type CoachStep={event:CoachEvent;expected:CoachExpectation;new_thread?:boolean};
export type CoachInput={
  id:string;history:CoachEvent[];event:CoachEvent;seed_injury?:string;followup?:CoachStep[];required_prior_corrections?:Partial<Record<FaultId,number>>;
};
export type CoachRow={inputs:CoachInput;outputs:CoachExpectation;metadata:{situation:string;provenance:"synthetic-contract";counterfactual_validation:boolean}};

export function contractReport(exercise:Exercise,rep:number,ids:FaultId[]=[],validation:"validated"|"provisional"="validated"):RepReport{
  return RepReportSchema.parse({exercise,rep,target:10,ms:{total:8000,lowering:4000,lifting:4000,since_last_rep:8000},metrics:{},
    faults:ids.map(id=>({id,tier:FAULTS[id].tier,validation,value:1,threshold:0,streak:rep})),
    quality:{visibility:0.95,fps:30,view_ok:true},keyframes:[]});
}
export function repEvent(report:RepReport):CoachEvent{return {type:"rep",exercise:report.exercise,set_id:"contract-set",report,reports:[report]};}
const question="Last one: do you have a pair of dumbbells with you?";
export function buildCoachRows():CoachRow[]{
  const rows:CoachRow[]=[];
  function add(id:string,situation:string,event:CoachEvent,expected:CoachExpectation,options:Partial<Omit<CoachInput,"id"|"event">>={}){
    rows.push({inputs:{id,history:[],event,...options},outputs:expected,metadata:{situation,provenance:"synthetic-contract",counterfactual_validation:Boolean([...(options.history??[]),event,...(options.followup??[]).map(s=>s.event)].some(e=>e.report?.faults.some(f=>f.validation==="validated")))}});
  }
  for(const id of FAULT_IDS.filter(id=>FAULTS[id].tier==="A")){
    const exercise=FAULTS[id].exercise,first=repEvent(contractReport(exercise,1,[id])),second=repEvent(contractReport(exercise,2,[id])),third=repEvent(contractReport(exercise,3,[id]));
    add(`${id}-first`,"first-fault",first,{speak:false,guidance:"eligible",fault:id,local_speech:true,local_kind:"first"});
    add(`${id}-fixed`,"fault-fixed",repEvent(contractReport(exercise,2)),{speak:false,guidance:"quiet",local_speech:true,local_kind:"fixed"},{history:[first]});
    add(`${id}-persists`,"fault-persists",second,{speak:false,guidance:"eligible",fault:id,local_speech:true,local_kind:"reminder"},{history:[first]});
    add(`${id}-third`,"third-cue-and-rest",third,{speak:false,guidance:"quiet",local_speech:false},{history:[first,second],required_prior_corrections:{[id]:2},followup:[{
      event:{type:"set_end",exercise,reports:[first.report!,second.report!,third.report!]},expected:{speak:true,mention:id},
    }]});
  }
  for(const id of FAULT_IDS.filter(id=>FAULTS[id].tier==="B"))add(`${id}-tier-b`,"tier-b",repEvent(contractReport(FAULTS[id].exercise,1,[id])),{speak:false,guidance:"quiet",local_speech:false});
  add("provisional","provisional",repEvent(contractReport("rdl",1,["rdl_knee_squat"],"provisional")),{speak:false,guidance:"quiet",local_speech:false});
  for(const quality of [{visibility:0.4,fps:30,view_ok:true},{visibility:0.95,fps:30,view_ok:false}]){
    const report=contractReport("curl",1,["curl_swing"]);report.quality=quality;
    add(`quality-${quality.view_ok ? "visibility":"view"}`,"low-quality",repEvent(report),{speak:false,guidance:"quiet",local_speech:false},{followup:[{event:{type:"set_end",exercise:"curl",reports:[report]},expected:{speak:true,camera:true}}]});
  }
  for(const ids of [["rdl_drift","rdl_knee_squat"],["curl_partial","curl_swing"]] as FaultId[][]){
    const priority=[...ids].sort((a,b)=>FAULTS[a].priority-FAULTS[b].priority)[0];
    add(`${priority}-two-faults`,"two-faults",repEvent(contractReport(FAULTS[priority].exercise,1,ids)),{speak:false,guidance:"eligible",fault:priority,local_speech:true,local_kind:"first"});
  }
  add("clean-streak","clean-streak",repEvent(contractReport("rdl",6)),{speak:false,guidance:"quiet",local_speech:false},{history:Array.from({length:5},(_,i)=>repEvent(contractReport("rdl",i+1)))});
  add("injury-brief","injury-on-file",{type:"brief",exercise:"rdl"},{speak:true,conservative:true},{seed_injury:"My left knee hurts when I bend deeply. Please remember it."});
  for(const [name,transcript,value] of [
    ["focus","Um, yeah, I'd like a full-body workout today, please.","full body"],
    ["duration_min","Uh, I've got about ten minutes before work.",10],
    ["injuries","Well, my left knee hurts a bit. Nothing else, though.",["knee"]],
    ["has_dumbbells","Yes, I have a pair of dumbbells, the ten-pound ones, right here.",true],
  ] as const){
    const keys={focus:"focus",duration_min:"duration",injuries:"injuries",has_dumbbells:"dumbbells"};
    const next={focus:"Got it. How much time do you have: 5, 10, or 20 minutes?",duration_min:"Any injuries or anything you'd like me to be careful with?",injuries:question,has_dumbbells:undefined};
    add(`messy-${name}`,"messy-onboarding",{type:"onboarding_answer",question:keys[name],transcript,next_question:next[name]},{speak:true,slot:{name,value:Array.isArray(value) ? [...value]:value as string|number|boolean}});
  }
  const seed="My left knee is injured. Please remember that.";
  add("healed-injury","healed-memory",{type:"onboarding_answer",question:"injuries",transcript:"My left knee is completely healed now. No injuries anymore.",known_injuries:["left knee"],returning:true,next_question:question},{speak:true,slot:{name:"injuries",value:[]}},{seed_injury:seed,followup:[{
    event:{type:"onboarding_answer",question:"injury_recall",transcript:"What active injuries do you remember?"},expected:{speak:true,slot:{name:"injuries",value:[]}},new_thread:true,
  }]});
  add("remembered-injury","injury-recall",{type:"session_start",next_question:"What would you like to work on today?"},{speak:true,slot:{name:"injuries",value:["knee"]}},{seed_injury:seed});
  add("summary","summary",{type:"session_end",reports:(["rdl","push-press","curl","push-up"] as const).map(exercise=>contractReport(exercise,10)),totals:{reps:40,elapsed_ms:240000,kcal:17,weight_kg:68,met:3.5}},{speak:true});
  return rows;
}
