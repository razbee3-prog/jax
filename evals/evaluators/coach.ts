import {CoachDecisionSchema} from "../../shared/coach-decision";
import {FAULTS,FAULT_IDS,type FaultId} from "../../shared/faults";
import {CUES} from "../../shared/cues";
import type {CoachEvent} from "../../shared/coach-event";
import type {SpeechLine} from "../../web/lib/coach/governor";
import type {CoachExpectation} from "../datasets/coach";

export type PolicyLine={line:SpeechLine;outcome:string};
export type EvaluatedTurn={
  event:CoachEvent;decision:unknown;latency_ms:number;error?:string;local:PolicyLine[];
  prior_corrections:Partial<Record<FaultId,number>>;previous_faults:FaultId[];
};
export const FAULT_PHRASES:Record<FaultId,string>={
  rdl_back_round:"back round|round(?:ed|ing) (?:your |the )?back|spine round",
  rdl_knee_squat:"too much knee bend|knees? bend(?:ing)? too (?:much|deep)|squatt?ing (?:the |your )?(?:hinge|deadlift)|knees? nearly straight",
  rdl_drift:"(?:weights?|dumbbells?) (?:drift|too far|away from)|(?:weights?|dumbbells?) close to (?:your |the )?(?:legs|shins)",
  rdl_shallow:"shallow hinge|hinge (?:was |is )?too short|hips? farther back|hips? further back",
  rdl_fast:"(?:hinge|deadlift|lowering) too (?:fast|quick)|rush(?:ed|ing) (?:the |your )?(?:hinge|deadlift)|slow (?:the |your )?lowering",
  pp_chest_forward:"chest (?:tip|fall|lean)(?:ped|ing|s)? forward|chest up(?:right)?",
  pp_dip_deep:"dip (?:was |is )?too deep|dip (?:a little |too )?deep|smaller dip|shorter dip",
  pp_no_legs:"no leg drive|not using (?:your |the )?legs|use (?:the |your )?legs to|drive (?:the |your )?floor",
  pp_soft_lockout:"soft lockout|incomplete lockout|finish (?:the )?press|reach (?:the )?weights? (?:higher|up)",
  pp_lean_back:"lean(?:ed|ing)? (?:too far )?back|back (?:was |is )?arch(?:ed|ing)",
  pp_press_early:"press(?:ed|ing)? too early|arms? start(?:ed|ing)? before|legs? (?:first|then arms)",
  curl_swing:"(?:body|torso|hips?) (?:was |is )?swing|swing(?:ing)? (?:your |the )?(?:body|torso|hips)|body still|torso still",
  curl_elbow_drift:"elbows? (?:drift|mov|travel)|elbows? (?:stay |close |by |beside |quiet)",
  curl_partial:"partial curls?|incomplete curls?|short curl|finish (?:the |your )?curl|full curl|all the way (?:up|down)",
  curl_drop:"drop(?:ped|ping)? (?:the |your )?weights?|curl lowering too fast|lower (?:the |your )?weights? slowly",
  pu_hip_sag:"hips? (?:was |is |were )?sag|sagg?ing hips?|hips? (?:too |hanging )?low",
  pu_hip_pike:"hips? (?:was |is |were )?(?:pik|too high)|pik(?:ed|ing) hips?|hips? lower",
  pu_shallow:"shallow push.?ups?|push.?ups? (?:was |were )?too shallow|chest closer to (?:the )?floor",
  pu_head_drop:"head (?:was |is )?drop|neck (?:was |is )?drop|drop(?:ped|ping)? (?:your |the )?head",
};
const words=(text:string)=>text.trim() ? text.trim().split(/\s+/u).length:0;
const CLAIMS:Record<FaultId,string>={
  rdl_back_round:"back round|round(?:ed|ing) (?:your |the )?back|spine round",
  rdl_knee_squat:"too much knee bend|knees? bend(?:ing)? too (?:much|deep)|squatt?ing (?:the |your )?(?:hinge|deadlift)",
  rdl_drift:"(?:weights?|dumbbells?) (?:drift|too far|away from)",rdl_shallow:"shallow hinge|hinge (?:was |is )?too short",
  rdl_fast:"(?:hinge|deadlift|lowering) too (?:fast|quick)|rush(?:ed|ing) (?:the |your )?(?:hinge|deadlift)",
  pp_chest_forward:"chest (?:tip|fall|lean)(?:ped|ing|s)? forward",pp_dip_deep:"dip (?:was |is )?too deep|dip (?:a little |too )?deep",
  pp_no_legs:"no leg drive|not using (?:your |the )?legs",pp_soft_lockout:"soft lockout|incomplete lockout",
  pp_lean_back:"lean(?:ed|ing)? (?:too far )?back|back (?:was |is )?arch(?:ed|ing)",pp_press_early:"press(?:ed|ing)? too early|arms? start(?:ed|ing)? before",
  curl_swing:"(?:body|torso|hips?) (?:was |is )?swing|swing(?:ing)? (?:your |the )?(?:body|torso|hips)",
  curl_elbow_drift:"elbows? (?:drift|mov|travel)",curl_partial:"partial curls?|incomplete curls?|short curl",curl_drop:"drop(?:ped|ping)? (?:the |your )?weights?|curl lowering too fast",
  pu_hip_sag:"hips? (?:was |is |were )?sag|sagg?ing hips?|hips? (?:too |hanging )?low",pu_hip_pike:"hips? (?:was |is |were )?(?:pik|too high)|pik(?:ed|ing) hips?",
  pu_shallow:"shallow push.?ups?|push.?ups? (?:was |were )?too shallow",pu_head_drop:"head (?:was |is )?drop|neck (?:was |is )?drop|drop(?:ped|ping)? (?:your |the )?head",
};
function claimedFaults(text:string){return FAULT_IDS.filter(id=>text.toLowerCase().includes(id) || new RegExp(CLAIMS[id],"iu").test(text));}
export function namedFaults(text:string):FaultId[]{
  return FAULT_IDS.filter(id=>text.toLowerCase().includes(id) || new RegExp(FAULT_PHRASES[id],"iu").test(text));
}
export function eligibleFaults(event:CoachEvent){
  const r=event.report;
  return !r || r.quality.visibility<0.8 || !r.quality.view_ok ? []:r.faults.filter(f=>f.validation==="validated" && f.tier==="A" && FAULTS[f.id].tier==="A" && FAULTS[f.id].exercise===r.exercise).map(f=>f.id);
}
export function hardChecks(turn:EvaluatedTurn,expected:CoachExpectation):Record<string,number>{
  const names=["schema","speech_expected","fault_grounded","no_unflagged_fault","word_cap","one_fault_per_line","no_third_cue","behavior"];
  const failed=Object.fromEntries(names.map(n=>[n,0])),parsed=CoachDecisionSchema.safeParse(turn.decision);
  if(!parsed.success || turn.error)return failed;
  const d=parsed.data,event=turn.event,rep=event.type==="rep",g=d.guidance;
  const reports=event.report ? [event.report]:event.reports??[];
  const flagged=new Set(reports.flatMap(r=>r.faults.map(f=>f.id))),eligible=eligibleFaults(event);
  const permitted=new Set(reports.flatMap(report=>eligibleFaults({type:"rep",report})));
  const segments=[d.text,d.summary?.went_well??"",d.summary?.next_time??"",g?.text??""];
  const claims=segments.flatMap(claimedFaults);
  const spoken=turn.local.filter(v=>v.outcome==="played" && v.line.text.trim());
  const guidanceValid=!rep ? g===null:Boolean(g && (g.action==="quiet" ? g.fault_id===null && g.text==="":g.fault_id && eligible.includes(g.fault_id) && (g.action==="focus" ? g.text==="":(g.action==="ack" ? CUES[g.fault_id].fixed:CUES[g.fault_id].reminder).includes(g.text))));
  const localGrounded=spoken.every(({line})=>!line.faultId || flagged.has(line.faultId as FaultId) || (line.priority==="fixed" && turn.previous_faults.includes(line.faultId as FaultId)));
  let behavior=guidanceValid;
  if(expected.guidance==="quiet")behavior &&=g?.action==="quiet";
  if(expected.guidance==="eligible")behavior &&=Boolean(g && g.action!=="quiet" && g.fault_id===expected.fault);
  if(expected.local_speech!==undefined)behavior &&=Boolean(spoken.length)===expected.local_speech;
  if(expected.local_kind){
    const id=(spoken[0]?.line.faultId??turn.previous_faults[0]) as FaultId|undefined;
    behavior &&=Boolean(id && CUES[id][expected.local_kind].includes(spoken[0]?.line.text??""));
  }
  if(expected.slot){
    const value=d.slots?.[expected.slot.name],want=expected.slot.value;
    behavior &&=Array.isArray(want) ? Array.isArray(value) && (want.length ? want.every(v=>value.some(got=>got.toLowerCase().includes(v.toLowerCase()))):value.length===0):typeof want==="string" ? typeof value==="string" && value.toLowerCase()===want.toLowerCase():value===want;
  }
  if(expected.mention){
    const text=[d.text,d.summary?.next_time??""].join(" "),bank=CUES[expected.mention];
    behavior &&=namedFaults(text).includes(expected.mention) || [...bank.first,...bank.reminder].some(line=>text.toLowerCase().includes(line.toLowerCase()));
  }
  if(expected.conservative)behavior &&=/skip|smaller|shorter|comfortable|pain.free|lighter|gentle|reduce|shallow|stop if/iu.test(segments.join(" "));
  if(expected.camera)behavior &&=/camera|fram(?:e|ing)|angle|view/iu.test(d.summary?.next_time??"") && segments.flatMap(namedFaults).length===0;
  if(event.type==="set_end" || event.type==="session_end")behavior &&=d.summary!==null;
  const rawSpeech=rep ? !d.speak && d.text==="" && d.kind==="silence" && d.fault_id===null && d.slots===null && d.summary===null:d.speak===expected.speak && Boolean(d.text.trim());
  const faultGrounded=(d.fault_id===null || (flagged.has(d.fault_id) && permitted.has(d.fault_id))) && (!g?.fault_id || eligible.includes(g.fault_id)) && localGrounded;
  const approvedLocal=spoken.every(({line})=>{
    const id=line.faultId as FaultId|undefined;
    return !id || [...CUES[id].first,...CUES[id].reminder,...CUES[id].fixed].includes(line.text);
  });
  return {
    schema:1,speech_expected:Number(rawSpeech),fault_grounded:Number(faultGrounded),
    no_unflagged_fault:Number(claims.every(id=>permitted.has(id)) && guidanceValid && approvedLocal),
    word_cap:Number(!rep || [d.text,g?.text??"",...spoken.map(s=>s.line.text)].every(t=>words(t)<=14)),
    one_fault_per_line:Number(segments.every(s=>s.split("\n").every(line=>claimedFaults(line).length<=1))),
    no_third_cue:Number(spoken.every(({line})=>line.priority!=="correction" || !line.faultId || (turn.prior_corrections[line.faultId as FaultId]??0)<2)),
    behavior:Number(behavior),
  };
}

export function aggregateHard(turns:EvaluatedTurn[],expected:CoachExpectation[]):Record<string,number>{
  if(!turns.length || turns.length!==expected.length)return {complete:0};
  const rows=turns.map((turn,i)=>hardChecks(turn,expected[i]));
  return {complete:1,...Object.fromEntries(Object.keys(rows[0]).map(key=>[key,Number(rows.every(row=>row[key]===1))]))};
}
