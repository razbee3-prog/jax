"use client";
import { useEffect,useRef } from "react";
export function SelfView({stream,large,inFrame}:{stream:MediaStream|null;large:boolean;inFrame:boolean}){
  const video=useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(video.current){video.current.srcObject=stream;if(stream)void video.current.play().catch(()=>{});}},[stream]);
  return <div className={`shell-self ${large ? "large":""}`} role="img" aria-label={stream ? "Mirrored self-view":"Simulated self-view"}>
    {stream ? <video ref={video} muted autoPlay playsInline aria-label="Your camera stays on this device"/> : <div className="simulated-person"/>}
    {inFrame && <svg className="body-guide" viewBox="0 0 180 300" aria-hidden="true"><ellipse cx="90" cy="42" rx="19" ry="23"/><path d="M90 65V160 M48 91L90 78L132 91 M48 91L32 158L40 201 M132 91L148 158L140 201 M90 160L59 221L53 280 M90 160L121 221L127 280"/>{[[90,78],[48,91],[132,91],[32,158],[148,158],[90,160],[59,221],[121,221]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4"/>)}</svg>}
    <span>{stream ? "Video stays on your phone":"Simulated pose"}</span>
  </div>;
}
