"use client";
import { useEffect,useRef,useState,type RefObject } from "react";
import type {Frame} from "../../lib/pose/types";
import {containedCamera} from "./framing";
const EDGES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]];
export function SelfView({stream,large,inFrame,frame}:{stream:MediaStream|null;large:boolean;inFrame:boolean;frame?:RefObject<Frame|null>}){
  const root=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),[box,setBox]=useState<ReturnType<typeof containedCamera>>(null);
  useEffect(()=>{
    const v=video.current,element=root.current;if(!v || !element || !stream)return;
    const measure=()=>setBox(containedCamera(element.clientWidth,element.clientHeight,v.videoWidth,v.videoHeight));
    v.srcObject=stream;v.addEventListener("loadedmetadata",measure);void v.play().catch(()=>{});const observer=new ResizeObserver(measure);observer.observe(element);
    let raf=0,last:Frame|null|undefined;
    const draw=()=>{raf=requestAnimationFrame(draw);const c=canvas.current,f=frame?.current;if(!c || f===last)return;last=f;c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext("2d");if(!ctx || !f)return;ctx.strokeStyle="#CADCFC";ctx.lineWidth=3;
      for(const [a,b] of EDGES){const p=f.landmarks[a],q=f.landmarks[b];if(!p || !q || p.visibility<0.5 || q.visibility<0.5)continue;ctx.beginPath();ctx.moveTo(p.x*c.width,p.y*c.height);ctx.lineTo(q.x*c.width,q.y*c.height);ctx.stroke();}
    };raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);observer.disconnect();v.removeEventListener("loadedmetadata",measure);};
  },[stream,frame]);
  return <div ref={root} className={`shell-self ${large ? "large":""}`} role="img" aria-label={stream ? "Mirrored self-view":"Simulated self-view"}>
    {stream ? <div className="camera-plane" style={box??undefined}><video ref={video} muted autoPlay playsInline aria-label="Your camera stays on this device"/><canvas ref={canvas} aria-hidden="true"/>{large && <div className="camera-frame-guide" aria-hidden="true"/>}</div> : <div className="simulated-person"/>}
    {!stream && inFrame && <svg className="body-guide" viewBox="0 0 180 300" aria-hidden="true"><ellipse cx="90" cy="42" rx="19" ry="23"/><path d="M90 65V160 M48 91L90 78L132 91 M48 91L32 158L40 201 M132 91L148 158L140 201 M90 160L59 221L53 280 M90 160L121 221L127 280"/>{[[90,78],[48,91],[132,91],[32,158],[148,158],[90,160],[59,221],[121,221]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4"/>)}</svg>}
    <span>{stream ? "Video stays on your phone":"Simulated pose"}</span>
  </div>;
}
