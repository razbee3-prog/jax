import { afterEach,it,expect,vi } from "vitest";
import { TTS } from "./tts";
import type { AudioSession } from "./audioSession";
import { SpeechDropped } from "../coach/governor";
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const session={context:{currentTime:0},getOutputVolume:()=>0} as AudioSession;
it("ignores a rep tick while cue PCM is delayed or silent, then records only cue onset",async()=>{
  vi.useFakeTimers();
  let stream!:ReadableStreamDefaultController<Uint8Array>,cueVolume=0;
  const sources:{connect:ReturnType<typeof vi.fn>;onended?:()=>void;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>}[]=[];
  const meter={connect:vi.fn(),disconnect:vi.fn()},gain={};
  const audio={gain,volume:(node:unknown)=>node===meter ? cueVolume:1,getOutputVolume:()=>1,context:{currentTime:1,createAnalyser:()=>meter,createBuffer:()=>({duration:0.1,getChannelData:()=>new Float32Array(1)}),createBufferSource:()=>{const source={connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn()};sources.push(source);return source;}}} as unknown as AudioSession;
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(c){stream=c;}}))));
  const onAudio=vi.fn(),playing=new TTS(audio).play("Delayed cue",new AbortController().signal,onAudio);
  await vi.advanceTimersByTimeAsync(1);audio.context.currentTime=2;
  await vi.advanceTimersByTimeAsync(40);expect(onAudio).not.toHaveBeenCalled();
  stream.enqueue(new Uint8Array([0,0]));await vi.advanceTimersByTimeAsync(16);expect(onAudio).not.toHaveBeenCalled();
  expect(sources[0].connect).toHaveBeenCalledWith(meter);expect(meter.connect).toHaveBeenCalledWith(gain);
  cueVolume=0.2;await vi.advanceTimersByTimeAsync(8);expect(onAudio).toHaveBeenCalledOnce();
  stream.close();await vi.advanceTimersByTimeAsync(0);sources[0].onended!();
  expect((await playing).ttfa_ms).toBeGreaterThan(40);expect(meter.disconnect).toHaveBeenCalledOnce();
});
it("never waits for or starts a network request for cached-only in-set audio",async()=>{
  let resolve!:(value:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal("fetch",fetcher);
  const tts=new TTS(session);await expect(tts.play("Offline",new AbortController().signal,vi.fn(),()=>{},true)).rejects.toThrow("audio not prefetched");expect(fetcher).not.toHaveBeenCalled();
  const pending=tts.prefetch("Offline");await expect(tts.play("Offline",new AbortController().signal,vi.fn(),()=>{},true)).rejects.toThrow("audio not prefetched");resolve(new Response(new Uint8Array([0,1])));await pending;
  const stop=new SpeechDropped("test playback gate");await expect(tts.play("Offline",new AbortController().signal,vi.fn(),()=>{throw stop;},true)).rejects.toBe(stop);expect(fetcher).toHaveBeenCalledOnce();
});
it("cancels the reader and request when a prepared cue becomes stale",async()=>{
  const cancel=vi.fn(),stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array([0,1]));},cancel});
  let requestSignal:AbortSignal|undefined;
  vi.stubGlobal("fetch",vi.fn(async(_url:string,options:RequestInit)=>{requestSignal=options.signal!;return new Response(stream);}));
  const caller=new AbortController(),error=new SpeechDropped("stale rep"),onAudio=vi.fn();
  await expect(new TTS(session).play("A stale cue",caller.signal,onAudio,()=>{throw error;})).rejects.toBe(error);
  expect.soft(cancel).toHaveBeenCalledOnce();expect.soft(requestSignal?.aborted).toBe(true);expect.soft(stream.locked).toBe(false);
  expect(onAudio).not.toHaveBeenCalled();expect(caller.signal.aborted).toBe(false);
});
it("releases the response reader after an empty stream fails",async()=>{
  const stream=new ReadableStream<Uint8Array>({start(controller){controller.close();}});
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(stream)));
  await expect(new TTS(session).play("Empty",new AbortController().signal,vi.fn())).rejects.toThrow("No audible audio received");
  expect(stream.locked).toBe(false);
});
it("forwards caller cancellation to the fetch without replacing its reason",async()=>{
  let requestSignal:AbortSignal|undefined;
  vi.stubGlobal("fetch",vi.fn((_url:string,options:RequestInit)=>new Promise((_resolve,reject)=>{requestSignal=options.signal!;requestSignal.addEventListener("abort",()=>reject(requestSignal!.reason),{once:true});})));
  const caller=new AbortController(),reason=new Error("Caller cancelled"),pending=new TTS(session).play("Cancel",caller.signal,vi.fn());
  caller.abort(reason);await expect(pending).rejects.toBe(reason);expect(requestSignal?.aborted).toBe(true);
});
it("keeps prefetched clips reusable when one playback is dropped",async()=>{
  const fetcher=vi.fn(async()=>new Response(new Uint8Array([0,1])));vi.stubGlobal("fetch",fetcher);
  const tts=new TTS(session),error=new SpeechDropped("stale rep");await tts.prefetch("Fixed");
  for(let i=0;i<2;i++)await expect(tts.play("Fixed",new AbortController().signal,vi.fn(),()=>{throw error;})).rejects.toBe(error);
  expect(fetcher).toHaveBeenCalledOnce();
});
