import { afterEach,it,expect,vi } from "vitest";
import { TTS } from "./tts";
import type { AudioSession } from "./audioSession";
import { SpeechDropped } from "../coach/governor";
afterEach(()=>vi.unstubAllGlobals());
const session={context:{currentTime:0},getOutputVolume:()=>0} as AudioSession;
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
