"use client";
import {useEffect,useRef,useState} from "react";
import type {Dispatch,RefObject} from "react";
import type {RepReport} from "../../../shared/rep-report";
import {MOVES,type ShellAction,type ShellState} from "../session/shell";
import {Landmarker} from "./landmarker";
import {PosePipeline} from "./pipeline";
import {RepReporter} from "./repReport";
import {FAULT_EVIDENCE} from "./evidence";
import {setupQuality} from "./setup";
import type {Frame} from "./types";
import type {Observation} from "./faults";
export function useSessionPose(stream:MediaStream|null,state:ShellState,enabled:boolean,delegate:"CPU"|"GPU",dispatch:Dispatch<ShellAction>,report:(report:RepReport,observations:Observation[])=>void,status:(data:Record<string,string|number|boolean>)=>void,frameRef?:RefObject<Frame|null>){
  const [error,setError]=useState("");
  const current=useRef({state,report,status});useEffect(()=>{current.current={state,report,status};},[state,report,status]);
  useEffect(()=>{
    if(!enabled || !stream)return;
    let closed=false,detector:Landmarker|undefined,raf=0,pipeline:PosePipeline|undefined,reporter=new RepReporter(FAULT_EVIDENCE),exercise=-1,screen="",offset=0,frames:Frame[]=[],previousCount=0,lastRep=0,lastVideoTime=-1,lastGood=-Infinity,lastStatus=-Infinity;
    const video=document.createElement("video");video.muted=true;video.playsInline=true;video.srcObject=stream;
    const loop=()=>{
      if(closed)return;
      raf=requestAnimationFrame(loop);
      const {state:s,report}=current.current;
      if(!detector || video.readyState<2 || video.currentTime===lastVideoTime)return;
      lastVideoTime=video.currentTime;
      if(s.screen==="S3" && s.floor){if(frameRef)frameRef.current=null;if(!s.inFrame)dispatch({type:"frame",value:true});return;}
      if(!["S3","S6"].includes(s.screen) || s.paused || document.visibilityState!=="visible" || window.matchMedia("(orientation: landscape)").matches){screen=s.screen;if(s.paused)pipeline=undefined;return;}
      if(exercise!==s.exercise || screen!==s.screen || !pipeline){
        exercise=s.exercise;screen=s.screen;pipeline=new PosePipeline(MOVES[exercise].id,video.videoWidth,video.videoHeight);reporter=new RepReporter(FAULT_EVIDENCE);offset=s.reps[exercise];previousCount=0;frames=[];lastRep=performance.now();
      }
      try{
        const frame=detector.detect(video);if(frameRef)frameRef.current=frame;const result=pipeline.process(frame),angles=result?.angles;
        const setup=setupQuality(frame,pipeline.side);
        if(s.screen==="S3"){
          if(setup.ready!==s.inFrame)dispatch({type:"frame",value:setup.ready});
          if(performance.now()-lastStatus>=1000){lastStatus=performance.now();current.current.status({model:"full",delegate:detector.delegate,floor:s.floor,...setup});}
        }
        else{
          if(angles?.valid)lastGood=performance.now();
          const visible=performance.now()-lastGood<500;if(visible!==s.inFrame)dispatch({type:"frame",value:visible});
          frames.push(frame);frames=frames.filter(f=>frame.t-f.t<=15000);
          if(pipeline.counter.count>previousCount){
            previousCount=pipeline.counter.count;const count=offset+previousCount;
            if(count<=10){const now=performance.now(),built=reporter.build({exercise:MOVES[exercise].id,width:video.videoWidth,height:video.videoHeight,frames,baselineTorsoLength:pipeline.baseline || undefined},count,10,now-lastRep);report(built.report,built.observations);dispatch({type:"rep"});lastRep=now;frames=[frame];}
          }
        }
      }catch{setError("Tracking unavailable. Reframe or skip this set.");dispatch({type:"frame",value:false});}
    };
    void Promise.all([Landmarker.create("full",delegate),video.play()]).then(([landmarker])=>{if(closed){landmarker.close();return;}detector=landmarker;setError("");loop();},()=>{if(!closed){setError("Pose model unavailable. Reload to retry.");dispatch({type:"frame",value:false});}});
    return()=>{closed=true;cancelAnimationFrame(raf);detector?.close();video.pause();video.srcObject=null;if(frameRef)frameRef.current=null;};
  },[enabled,stream,delegate,dispatch,frameRef]);
  return error;
}
