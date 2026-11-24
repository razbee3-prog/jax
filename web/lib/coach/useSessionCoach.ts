"use client";
import {useCallback,useEffect,useRef,useState,type Dispatch,type RefObject} from "react";
import {CoachDecisionSchema} from "../../../shared/coach-decision";
import type {CoachEvent} from "../../../shared/coach-event";
import type {RepReport} from "../../../shared/rep-report";
import type {Observation} from "../pose/faults";
import type {SpeechQueue} from "../voice/speechQueue";
import {useTranscription} from "../voice/stt";
import {caption,GREETING,MOVES,question,kcal,type ShellAction,type ShellState} from "../session/shell";
import {HybridCoach,type CueSource} from "./hybrid";
import {SerialCoach,type CoachResult} from "./serial";
import {onboardingAnswer} from "./onboarding";
import {debriefReports,summarySpeech,restSpeech} from "./debrief";
import type {SavedWorkout} from "../session/persistence";
type Emit=(type:string,data:Record<string,unknown>)=>void;
export function useSessionCoach({state,fake,sessionId,queue,emit,dispatch,speak,talking,memory}:{state:ShellState;fake:boolean;sessionId:string;queue:RefObject<SpeechQueue|null>;emit:Emit;dispatch:Dispatch<ShellAction>;speak:(text:string,inSet?:boolean,countdown?:boolean,source?:CueSource)=>void;talking:boolean;memory?:SavedWorkout["coach"]}){
  const [answerBusy,setBusy]=useState(false),[captions,setCaptions]=useState<Record<string,string>>(memory?.captions??{}),[summary,setSummary]=useState<{went_well:string;next_time:string}|null>(null),[fallback,setFallback]=useState(false);
  const [returning,setReturning]=useState(!!memory?.injuries.length);
  const [summaryReady,setSummaryReady]=useState(false);
  const setFaults=useRef(Array.from({length:4},(_,i)=>{const reports=memory?.reports[i].filter(r=>r.quality.visibility>=0.8 && r.quality.view_ok)??[];return {seen:new Set(reports.flatMap(r=>r.faults.map(f=>f.id))),current:new Set(reports.at(-1)?.faults.map(f=>f.id)??[])};}));
  const busy=answerBusy || (!fake && !memory && state.screen==="S2" && state.question===0 && !captions["S2-0"]);
  const current=useRef(state),hybrid=useRef<HybridCoach|null>(null),serial=useRef<SerialCoach|null>(null),alive=useRef(true),injuries=useRef<string[]>(memory?.injuries??[]),lastScreen=useRef(memory && state.screen!=="S6" ? `${state.screen}-${state.screen==="S2" ? state.question:state.exercise}`:""),latestRep=useRef({set_id:"",rep:0}),answerLock=useRef(false);
  const setReports=useRef<RepReport[][]>(memory?.reports??[[],[],[],[]]);
  const checkpoint=useCallback(()=>({reports:setReports.current,injuries:injuries.current,captions,hybrid:hybrid.current?.checkpoint()??memory?.hybrid}),[captions,memory]);
  useEffect(()=>{current.current=state;},[state]);
  useEffect(()=>{
    if(fake)return;alive.current=true;
    const record=(result:CoachResult)=>{
      hybrid.current?.contact(result);if(alive.current)setFallback(result.source==="fallback");
      emit("coach.turn",{source:result.source,event_type:result.event.type,event:result.event,set_id:result.event.set_id??"",rep:result.event.report?.rep??0,reports:JSON.stringify(result.event.reports?.map(r=>r.rep)??[]),latency_ms:result.latency_ms,reason:result.reason,before_next_rep:result.event.type==="rep" && current.current.screen==="S6" && latestRep.current.set_id===result.event.set_id && latestRep.current.rep===result.event.report?.rep,decision:result.decision??null});
    };
    const transport=new SerialCoach(async event=>{
      const response=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id:sessionId,event_id:crypto.randomUUID(),event}),signal:AbortSignal.timeout(75000)});
      if(!response.ok)throw new Error("Coach unavailable");return CoachDecisionSchema.parse((await response.json()).decision);
    },record);
    const local=new HybridCoach(transport,line=>queue.current?.enqueue(line),(id,at)=>queue.current?.clearFault(id,at),data=>emit("cue.decision",data));
    serial.current=transport;hybrid.current=local;
    return()=>{alive.current=false;local.end();transport.close();serial.current=null;hybrid.current=null;};
  },[fake,sessionId,queue,emit]);
  const turn=useCallback(async(event:CoachEvent,fallbackText:string,key:string,countdown=false)=>{
    const result=await serial.current?.request(event);if(!result || !alive.current)return;
    const decision=result.decision,text=event.type==="session_end" ? summarySpeech(decision,fallbackText):event.type==="set_end" ? restSpeech(decision,fallbackText):decision?.speak && decision.text.trim() ? decision.text:fallbackText;
    setCaptions(old=>({...old,[key]:text}));speak(text,false,countdown,result.source);
    if(event.type==="session_start"){injuries.current=decision?.slots?.injuries??[];setReturning(injuries.current.length>0);}
    if(event.type==="session_end"){setSummary(decision?.summary??null);setSummaryReady(true);}
  },[speak]);
  const answer=useCallback(async(raw:string)=>{
    const s=current.current;if(fake || s.screen!=="S2" || answerLock.current)return;
    answerLock.current=true;setBusy(true);
    const value=onboardingAnswer(s.question,raw,injuries.current);
    if(value===null){emit("onboarding.answer",{question:s.question,accepted:false,transcript:raw.slice(0,1000),source:"local"});speak(question(s));answerLock.current=false;setBusy(false);return;}
    const next={...s,answers:[...s.answers,value],question:Math.min(3,s.question+1)};
    let nextQuestion=question(next);
    if(s.question===1 && injuries.current.length)nextQuestion=`Last time you mentioned ${injuries.current.join(" and ")}. Is that still the case?`;
    emit("onboarding.answer",{question:s.question,accepted:true,answer:value,transcript:raw.slice(0,1000),source:"local"});
    const result=await serial.current?.request({type:"onboarding_answer",question:["focus","duration","injuries","dumbbells"][s.question],transcript:raw.slice(0,1000),next_question:s.question<3 ? nextQuestion:undefined,known_injuries:injuries.current,returning:injuries.current.length>0});
    if(alive.current && current.current.screen==="S2" && current.current.question===s.question){
      if(s.question<3){const text=result?.decision?.speak ? result.decision.text:nextQuestion;setCaptions(old=>({...old,[`S2-${s.question+1}`]:text}));speak(text,false,false,result?.source??"fallback");}
      dispatch({type:"answer",value});
    }
    answerLock.current=false;if(alive.current)setBusy(false);
  },[fake,emit,speak,dispatch]);
  const stt=useTranscription(text=>{if(!talking && !busy)void answer(text);});
  const sttStart=useRef(stt.start),sttStop=useRef(stt.stop);useEffect(()=>{sttStart.current=stt.start;sttStop.current=stt.stop;});
  useEffect(()=>{
    if(fake)return;
    if(state.screen!=="S2" || busy || talking){sttStop.current();return;}
    const timer=setTimeout(()=>{void sttStart.current();},750);return()=>{clearTimeout(timer);sttStop.current();};
  },[state.screen,state.question,busy,talking,fake]);
  useEffect(()=>{
    if(fake)return;
    const key=`${state.screen}-${state.screen==="S2" ? state.question:state.exercise}`;
    if(lastScreen.current===key)return;const previousKey=lastScreen.current;lastScreen.current=key;
    const totals={reps:state.reps.reduce((a,b)=>a+b,0),elapsed_ms:state.lastRepMs,kcal:kcal(state.lastRepMs),weight_kg:68 as const,met:3.5 as const};
    if(state.screen==="S2" && state.question===0)void turn({type:"session_start",next_question:GREETING},GREETING,key);
    if(state.screen==="S4")void turn({type:"brief"},caption(state),key);
    if(state.screen==="S5")void turn({type:"set_start",exercise:MOVES[state.exercise].id,target_reps:10},caption(state),key,true);
    if(state.screen==="S6"){const set_id=`${sessionId}:${state.exercise}`;latestRep.current={set_id,rep:state.reps[state.exercise]};hybrid.current?.start(set_id,memory?.hybrid);}
    if(state.screen==="S7"){hybrid.current?.end();void turn({type:"set_end",exercise:MOVES[state.exercise].id,...debriefReports(setReports.current,state.exercise),totals,next_question:caption(state)},caption(state),key);}
    if(state.screen==="S8"){
      hybrid.current?.end();void (async()=>{if(previousKey.startsWith("S6-"))await turn({type:"set_end",exercise:MOVES[state.exercise].id,...debriefReports(setReports.current,state.exercise),totals},"That's the set.","final-debrief");await turn({type:"session_end",...debriefReports(setReports.current),totals},caption(state),key);})();
    }
  },[state,fake,sessionId,turn,memory]);
  const report=useCallback((report:RepReport,observations:Observation[])=>{setReports.current[current.current.exercise].push(report);const faults=setFaults.current[current.current.exercise];if(report.quality.visibility>=0.8 && report.quality.view_ok){faults.current=new Set(observations.map(o=>o.id));for(const id of faults.current)faults.seen.add(id);}latestRep.current={set_id:`${sessionId}:${current.current.exercise}`,rep:report.rep};hybrid.current?.rep(report,observations);},[sessionId]);
  const setStats=useCallback((exercise:number)=>{const faults=setFaults.current[exercise];return {faults_seen:JSON.stringify([...faults.seen]),faults_fixed:JSON.stringify([...faults.seen].filter(id=>!faults.current.has(id)))};},[]);
  const key=`${state.screen}-${state.screen==="S2" ? state.question:state.exercise}`;
  return {answer,report,busy,returning,setStats,summaryReady,checkpoint,caption:captions[key],summary,fallback,partial:stt.partial,sttError:stt.error};
}
