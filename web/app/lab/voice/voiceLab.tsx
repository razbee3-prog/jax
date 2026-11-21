"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { Orb } from "../../../components/ui/orb";
import { getAudioSession,type AudioSession } from "../../../lib/voice/audioSession";
import { TTS } from "../../../lib/voice/tts";
import { SpeechQueue } from "../../../lib/voice/speechQueue";
import { FIXED_LINES } from "../../../lib/voice/fixedLines";
import { useTranscription } from "../../../lib/voice/stt";
import type { SpeechEvent } from "../../../lib/coach/governor";
import "./voice.css";
type Log={event_id:string;type:"utterance"|"transcript";text:string;outcome:string;reason:string;ttfa_ms:number|null;cache?:string;acked?:boolean};
export const ORB_COLORS:[string,string]=["#CADCFC","#A0B9D1"];
export default function VoiceLab({sessionId}:{sessionId:string}){
  const [enabled,setEnabled]=useState(false),[text,setText]=useState("Let's make every rep count."),[state,setState]=useState<"thinking"|"talking"|null>(null),[error,setError]=useState("");
  const [logs,setLogs]=useState<Log[]>([]),[transcript,setTranscript]=useState(""),[prefetch,setPrefetch]=useState("Not started"),[countdown,setCountdown]=useState(""),[inSet,setInSet]=useState(false),[input,setInput]=useState(0),[output,setOutput]=useState(0);
  const audio=useRef<AudioSession|null>(null),tts=useRef<TTS|null>(null),queue=useRef<SpeechQueue|null>(null),mounted=useRef(true);
  async function record(log:Log){
    setLogs(previous=>[...previous,log]);
    try{const response=await fetch("/api/voice-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...log,thread_id:sessionId}),keepalive:true});if(!response.ok)throw new Error("Trace unavailable");setLogs(previous=>previous.map(item=>item.event_id===log.event_id ? {...item,acked:true}:item));}
    catch{if(mounted.current)setError("Trace not acknowledged. This event remains in the local ledger.");}
  }
  const stt=useTranscription(value=>{setTranscript(previous=>[previous,value].filter(Boolean).join(" "));void record({event_id:crypto.randomUUID(),type:"transcript",text:value,outcome:"committed",reason:"VAD commit",ttfa_ms:null});});
  useEffect(()=>{
    mounted.current=true;
    let frame=0;
    function levels(){setInput(audio.current?.getInputVolume()??0);setOutput(audio.current?.getOutputVolume()??0);frame=requestAnimationFrame(levels);}frame=requestAnimationFrame(levels);
    return()=>{mounted.current=false;cancelAnimationFrame(frame);queue.current?.close();audio.current?.stopMicrophone();};
  },[]);
  async function enable(){
    try{
      audio.current=getAudioSession();await audio.current.unlock();
      tts.current??=new TTS(audio.current);
      queue.current??=new SpeechQueue(async(line,signal,beforeAudio)=>{
        audio.current!.muteMicrophone(true);setState("thinking");setCountdown("");
        try{return line.countdown ? await tts.current!.countdown(signal,setCountdown,()=>setState("talking")) : await tts.current!.play(line.text,signal,()=>setState("talking"),beforeAudio);}
        finally{audio.current!.muteMicrophone(false);if(mounted.current)setState(null);}
      },(event:SpeechEvent)=>{void record({event_id:event.line.id,type:"utterance",text:event.line.text,outcome:event.outcome,reason:event.reason,ttfa_ms:event.ttfa_ms,cache:event.cache});if(event.outcome==="error" && mounted.current)setError("Playback failed. Check your invite and try again.");});
      setEnabled(true);setError("");setPrefetch("Loading fixed lines");
      void tts.current.prefetchAll(FIXED_LINES).then(()=>{if(mounted.current)setPrefetch("Ready");},()=>{if(mounted.current){setPrefetch("Failed");setError("Prefetch failed. Enter the invite code on the home page first.");}});
    }catch{setError("Audio could not start. Tap Enable audio again.");}
  }
  function speak(isCountdown=false){setError("");queue.current?.enqueue({id:crypto.randomUUID(),text:isCountdown ? "Get ready. 3, 2, 1. Go." : text,priority:isCountdown ? "milestone":"correction",inSet:inSet && !isCountdown,repAt:performance.now(),fixed:isCountdown,countdown:isCountdown});}
  const agentState=state ?? (stt.micOpen ? "listening" : ["connecting","connected","transcribing"].includes(stt.status) ? "thinking" : null);
  const played=logs.filter(log=>log.outcome==="played" && log.ttfa_ms!==null),last=played.at(-1);
  return <main className="voice-lab"><section aria-labelledby="voice-title">
    <header><Link href="/">Jax</Link><span>VOICE LAB · M4</span></header>
    <div className="voice-orb" aria-label={`Jax ${agentState??"idle"}`}><Orb colors={ORB_COLORS} volumeMode="manual" agentState={agentState} getOutputVolume={()=>audio.current?.getOutputVolume()??0} getInputVolume={()=>audio.current?.getInputVolume()??0}/></div>
    <h1 id="voice-title">Voice lab</h1>
    <p className="voice-state" role="status" data-testid="orb-state">{agentState??"idle"}</p>
    <p className="voice-caption">Type to hear Jax. Speak to see your answer.</p>
    {!enabled && <button onClick={()=>void enable()}>Enable audio</button>}
    <div className="voice-meter-row"><span>MIC <meter min="0" max="1" value={input} aria-label="Microphone level"/></span><span>JAX <meter min="0" max="1" value={output} aria-label="Output level"/></span></div>
    <label htmlFor="voice-text">What should Jax say?</label>
    <textarea id="voice-text" rows={2} maxLength={500} value={text} onChange={event=>setText(event.target.value)}/>
    <div className="voice-actions"><button disabled={!enabled} onClick={()=>speak()}>Speak line</button><button disabled={!enabled || prefetch!=="Ready"} onClick={()=>speak(true)}>Countdown</button></div>
    <label className="voice-toggle"><input type="checkbox" checked={inSet} onChange={event=>setInSet(event.target.checked)}/>In-set limits: 14 words · 3.5 s gap</label>
    <div className="voice-actions"><button disabled={!enabled || state!==null || ["connecting","connected","transcribing"].includes(stt.status)} onClick={()=>void stt.start()}>Start microphone</button><button className="voice-secondary" disabled={!enabled} onClick={()=>stt.stop()}>Setup / stop mic</button></div>
    <p className="voice-transcript" aria-live="polite" data-testid="transcript">{[transcript,stt.partial].filter(Boolean).join(" ") || "Your answer will appear here."}</p>
    <p className="voice-countdown" data-testid="countdown">{countdown}</p>
    <p className="voice-stats" data-testid="ttfa">{last ? `First audio ${Math.round(last.ttfa_ms!)} ms · ${last.cache}` : "First audio —"}</p>
    <p className="voice-stats">Fixed lines: <span data-testid="prefetch">{prefetch}</span> · STT: {stt.model}</p>
    <p className="voice-stats" data-testid="ledger">Trace ledger {logs.filter(log=>log.acked).length}/{logs.length} acknowledged</p>
    <p className="voice-error" role="alert">{error || stt.error}</p>
    <details><summary>Voice event ledger</summary><pre data-testid="voice-ledger">{JSON.stringify({thread_id:sessionId,events:logs},null,2)}</pre></details>
    <footer>Microphone is for onboarding only. Setup stops the track.<br/>iPhone audio routing still needs real-device testing.</footer>
  </section></main>;
}
