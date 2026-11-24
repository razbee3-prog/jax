"use client";
import { useScribe,AudioFormat,CommitStrategy } from "@elevenlabs/react";
import { useEffect,useRef,useState } from "react";
import { getAudioSession } from "./audioSession";
import { scribeFallback } from "./sttPolicy";
export function useTranscription(onTranscript:(text:string)=>void){
  const [model,setModel]=useState("scribe_v3_live"),[error,setError]=useState(""),[micOpen,setMicOpen]=useState(false);
  const selected=useRef("scribe_v3_live"),active=useRef(false),version=useRef(0);
  const scribe=useScribe({audioFormat:AudioFormat.PCM_16000,sampleRate:16000,commitStrategy:CommitStrategy.VAD,vadSilenceThresholdSecs:0.8,languageCode:"en",
    onCommittedTranscript:({text})=>{if(text.trim())onTranscript(text);},
    onSessionStarted:()=>{if(active.current){const generation=version.current;void getAudioSession().startMicrophone(audio=>scribe.sendAudio(audio)).then(()=>{if(active.current && generation===version.current)setMicOpen(true);},()=>{if(generation===version.current){setError("Microphone unavailable");stop();}});}},
    onError:event=>{
      const message=event instanceof Error ? event.message : "Transcription connection error";
      const fallback=scribeFallback(selected.current,message);
      if(active.current && fallback){scribe.disconnect();getAudioSession().stopMicrophone(false);void connect(fallback);}
      else {setError("Transcription failed. Try reconnecting.");stop();}
    },
    onDisconnect:()=>{setMicOpen(false);getAudioSession().stopMicrophone(false);},
  });
  useEffect(()=>()=>{version.current++;if(active.current){active.current=false;getAudioSession().stopMicrophone();}},[]);
  async function connect(id:string){
    const generation=++version.current;selected.current=id;setModel(id);setError("");active.current=true;
    try{getAudioSession().prepareForCapture();await getAudioSession().unlock();if(generation!==version.current)return;const response=await fetch("/api/stt-token",{method:"POST"});if(!response.ok)throw new Error("Token unavailable");const {token}=await response.json();if(active.current && generation===version.current)await scribe.connect({token,modelId:id});}
    catch{if(generation===version.current){setError("Microphone or transcription token unavailable. Check your invite.");stop();}}
  }
  function stop(){version.current++;active.current=false;setMicOpen(false);scribe.disconnect();getAudioSession().stopMicrophone(false);}
  return {start:()=>connect("scribe_v3_live"),stop,status:scribe.status,micOpen,partial:scribe.partialTranscript,model,error};
}
