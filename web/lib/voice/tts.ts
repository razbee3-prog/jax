import type { AudioSession } from "./audioSession";
import {SpeechDropped} from "../coach/governor";
export type AudioResult={ttfa_ms:number;cache:string;audio_started_at_ms?:number};
type Clip={pcm:Uint8Array;cache:string};
export class TTS {
  private clips=new Map<string,Promise<Clip>>();
  private ready=new Set<string>();
  constructor(private session:AudioSession){}
  private async response(text:string,signal?:AbortSignal){const r=await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text}),signal});if(!r.ok || !r.body)throw new Error(r.status===401 ? "Enter the invite code on the home page first." : "Speech unavailable");return r;}
  prefetch(text:string){
    let clip=this.clips.get(text);
    if(!clip){clip=this.response(text).then(async r=>{const clip={pcm:new Uint8Array(await r.arrayBuffer()),cache:r.headers.get("X-TTS-Cache")??"MISS"};this.ready.add(text);return clip;}).catch(error=>{this.clips.delete(text);throw error;});this.clips.set(text,clip);}
    return clip;
  }
  async prefetchAll(lines:readonly string[]){const remaining=[...new Set(lines)];await Promise.all([0,1].map(async()=>{while(remaining.length)await this.prefetch(remaining.shift()!);}));}
  async play(text:string,signal:AbortSignal,onAudio:()=>void,beforeAudio=()=>{},cachedOnly=false):Promise<AudioResult>{
    if(cachedOnly && !this.ready.has(text))throw new SpeechDropped("audio not prefetched");
    const start=performance.now();
    const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
    signal.addEventListener("abort",abort,{once:true});if(signal.aborted)abort();
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
    try{
      const cached=this.clips.get(text),response=cached ? null : await this.response(text,controller.signal);
      const clip=cached ? await cached : null;
      reader=response?.body!.getReader();
      const iterator=reader ? {read:()=>reader!.read()} : {read:(()=>{let read=false;return async()=>{if(read)return {done:true,value:undefined};read=true;return {done:false,value:clip!.pcm};};})()};
      return await this.render(iterator,controller.signal,start,clip ? "MEMORY" : response!.headers.get("X-TTS-Cache")??"MISS",onAudio,beforeAudio);
    }finally{
      signal.removeEventListener("abort",abort);
      const cancelled=reader?.cancel().catch(()=>{});controller.abort();await cancelled;reader?.releaseLock();
    }
  }
  private async render(reader:{read:()=>Promise<{done:boolean;value?:Uint8Array}>},signal:AbortSignal,start:number,cache:string,onAudio:()=>void,beforeAudio:()=>void):Promise<AudioResult>{
    const context=this.session.context,sources=new Set<AudioBufferSourceNode>(),notBefore=context.currentTime+0.03;let next=notBefore,carry=new Uint8Array(0),first:number|undefined;
    const timer=setInterval(()=>{if(first===undefined && context.currentTime>=notBefore && this.session.getOutputVolume()>0.001){first=performance.now()-start;onAudio();}},8);
    const abort=()=>{for(const source of sources)source.stop();};signal.addEventListener("abort",abort,{once:true});
    try{
      let last:Promise<void>=Promise.resolve(),scheduled=false;
      while(true){
        if(signal.aborted)throw new Error("Playback cancelled");
        const {done,value}=await reader.read();if(done)break;if(!value?.length)continue;
        const bytes=new Uint8Array(carry.length+value.length);bytes.set(carry);bytes.set(value,carry.length);
        const length=bytes.length-bytes.length%2;carry=bytes.slice(length);if(!length)continue;
        if(!scheduled){beforeAudio();scheduled=true;}
        const buffer=context.createBuffer(1,length/2,24000),channel=buffer.getChannelData(0),view=new DataView(bytes.buffer);
        for(let i=0;i<channel.length;i++)channel[i]=view.getInt16(i*2,true)/32768;
        const source=context.createBufferSource();source.buffer=buffer;source.connect(this.session.gain);sources.add(source);
        last=new Promise(resolve=>{source.onended=()=>{sources.delete(source);source.disconnect();resolve();};});
        next=Math.max(next,context.currentTime+0.02);source.start(next);next+=buffer.duration;
      }
      if(carry.length)throw new Error("Incomplete PCM stream");
      await last;if(signal.aborted)throw new Error("Playback cancelled");
      if(first===undefined)throw new Error("No audible audio received");
      return {ttfa_ms:first,cache,audio_started_at_ms:start+first};
    }finally{clearInterval(timer);signal.removeEventListener("abort",abort);abort();}
  }
  async countdown(signal:AbortSignal,onTick:(text:string)=>void,onAudio:()=>void):Promise<AudioResult>{
    const labels=["Get ready","3","2","1","Go"],start=performance.now();
    const clips=await Promise.all(labels.map(text=>this.prefetch(text)));
    if(signal.aborted)throw new Error("Playback cancelled");
    const context=this.session.context,base=context.currentTime+0.05,sources:AudioBufferSourceNode[]=[];
    const buffers=clips.map(({pcm})=>{const buffer=context.createBuffer(1,pcm.length/2,24000),samples=buffer.getChannelData(0),view=new DataView(pcm.buffer,pcm.byteOffset,pcm.byteLength);for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;return buffer;});
    let first:number|undefined,index=-1,frame=0;
    const draw=()=>{const current=Math.min(4,Math.floor(context.currentTime-base));if(current>=0 && current!==index){index=current;onTick(labels[current]);}if(first===undefined && this.session.getOutputVolume()>0.001){first=performance.now()-start;onAudio();}frame=requestAnimationFrame(draw);};draw();
    const abort=()=>sources.forEach(s=>s.stop());signal.addEventListener("abort",abort,{once:true});
    try{
      await Promise.all(buffers.map((buffer,i)=>new Promise<void>(resolve=>{const source=context.createBufferSource();sources.push(source);source.buffer=buffer;source.playbackRate.value=Math.max(1,buffer.duration/0.95);source.connect(this.session.gain);source.onended=()=>{source.disconnect();resolve();};source.start(base+i);})));
      if(signal.aborted)throw new Error("Playback cancelled");return {ttfa_ms:first??performance.now()-start,cache:"MEMORY",...(first===undefined ? {}:{audio_started_at_ms:start+first})};
    }finally{cancelAnimationFrame(frame);signal.removeEventListener("abort",abort);}
  }
}
