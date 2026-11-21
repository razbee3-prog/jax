import { beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { SpeechGovernor,SpeechDropped,type SpeechLine } from "../coach/governor";
import { SpeechQueue,type Playback } from "./speechQueue";
import { inviteCookie,voiceAccess } from "./access.server";
import { clearVoiceCache,synthesize,voiceCacheKey } from "./provider.server";
import { POST as tts } from "../../app/api/tts/route";
import { POST as token } from "../../app/api/stt-token/route";
import { scribeFallback } from "./sttPolicy";
const line=(props:Partial<SpeechLine>={}):SpeechLine=>({id:"one",text:"Push the floor away.",priority:"correction",inSet:true,repAt:0,...props});
const request=(body:unknown={},cookie=true)=>new Request("http://localhost/api/tts",{method:"POST",headers:cookie ? {cookie:inviteCookie().split(";")[0]} : {},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv("SESSION_SECRET","test-secret");vi.stubEnv("ELEVENLABS_API_KEY","test-provider-key");vi.stubEnv("ELEVENLABS_VOICE_ID","test-voice");vi.stubEnv("ELEVENLABS_TTS_MODEL","");clearVoiceCache();});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
describe("speech governor",()=>{
  it("accepts 14 words but rejects 15; empty and silent lines have reasons",()=>{
    const governor=new SpeechGovernor();
    expect(governor.reason(line({text:Array(14).fill("word").join(" ")}),0)).toBeNull();
    expect(governor.reason(line({text:Array(15).fill("word").join(" ")}),0)).toBe("word cap");
    expect(governor.reason(line({text:" "}),0)).toBe("empty line");expect(governor.reason(line({speak:false}),0)).toBe("silent decision");
    expect(governor.reason(line({repAt:undefined}),0)).toBe("missing rep timestamp");
    expect(governor.reason(line({text:Array(20).fill("word").join(" "),inSet:false}),0)).toBeNull();
  });
  it("drops only after 3 seconds and only claims faults not cleared by a newer rep",()=>{
    const governor=new SpeechGovernor();expect(governor.reason(line(),3000)).toBeNull();expect(governor.reason(line(),3001)).toBe("stale rep");
    governor.clearFault("curl_swing",1000);expect(governor.reason(line({faultId:"curl_swing"}),1001)).toBe("fault cleared");
    expect(governor.reason(line({faultId:"curl_swing",repAt:1000,priority:"fixed"}),1001)).toBeNull();
  });
  it("enforces the complete priority order, with newest winning ties",()=>{
    const governor=new SpeechGovernor(),order=["safety","correction","fixed","milestone","praise","pace"] as const;
    for(let i=0;i<order.length;i++)for(let j=0;j<order.length;j++)expect(governor.prefer(line({priority:order[i]}),line({priority:order[j]}))).toBe(i<=j);
  });
});
describe("speech queue",()=>{
  it("waits 3.5 seconds from the END, not the start",async()=>{
    vi.useFakeTimers();vi.setSystemTime(0);let finish!:()=>void;
    const play=vi.fn(()=>new Promise<{ttfa_ms:number;cache:string}>(resolve=>{finish=()=>resolve({ttfa_ms:10,cache:"MISS"});})),log=vi.fn();
    const queue=new SpeechQueue(play,log,()=>Date.now());queue.enqueue(line());await vi.advanceTimersByTimeAsync(1000);finish();await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);queue.enqueue(line({id:"two",repAt:2000}));await vi.advanceTimersByTimeAsync(2499);expect(play).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);expect(play).toHaveBeenCalledTimes(2);finish();await vi.advanceTimersByTimeAsync(0);queue.close();
  });
  it("has one pending slot, respects priority, and never interrupts an active fixed line",async()=>{
    let finish!:()=>void;const play=vi.fn<(line:SpeechLine,signal:AbortSignal)=>Promise<Playback>>(()=>new Promise(resolve=>{finish=()=>resolve({ttfa_ms:10,cache:"HIT"});})),log=vi.fn();
    const queue=new SpeechQueue(play,log,()=>0);
    queue.enqueue(line({fixed:true,inSet:false}));queue.enqueue(line({id:"old",priority:"praise",inSet:false}));queue.enqueue(line({id:"new",priority:"praise",inSet:false}));queue.enqueue(line({id:"safety",priority:"safety",inSet:false}));queue.enqueue(line({id:"pace",priority:"pace",inSet:false}));
    expect(play).toHaveBeenCalledTimes(1);expect(log.mock.calls.map(([event])=>event.reason)).toEqual(["replaced by newer line","replaced by newer line","lower priority"]);
    finish();await new Promise(resolve=>setTimeout(resolve,0));expect(play.mock.calls[1][0].id).toBe("safety");finish();await new Promise(resolve=>setTimeout(resolve,0));queue.close();
  });
  it("expires waiting lines, clears faults, and logs playback errors and silent decisions",async()=>{
    vi.useFakeTimers();vi.setSystemTime(0);const log=vi.fn(),play=vi.fn(async()=>({ttfa_ms:5,cache:"MISS"}));
    const queue=new SpeechQueue(play,log,()=>Date.now());queue.enqueue(line());await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);queue.enqueue(line({id:"waiting",repAt:100}));await vi.advanceTimersByTimeAsync(3001);expect(play).toHaveBeenCalledTimes(1);expect(log.mock.calls.at(-1)![0].reason).toBe("stale rep");
    queue.enqueue(line({faultId:"sag",repAt:3101}));queue.clearFault("sag",3102);expect(log.mock.calls.at(-1)![0].reason).toBe("fault cleared");
    queue.enqueue(line({speak:false}));expect(log.mock.calls.at(-1)![0].outcome).toBe("silent");queue.close();
    const broken=new SpeechQueue(async()=>{throw new Error("offline");},log,()=>0);broken.enqueue(line());await vi.advanceTimersByTimeAsync(0);expect(log.mock.calls.at(-1)![0].outcome).toBe("error");broken.close();
  });
  it("rechecks staleness immediately before audio, including slow network preparation",async()=>{
    let now=0;const log=vi.fn();
    const queue=new SpeechQueue(async(_line,_signal,beforeAudio)=>{now=3001;beforeAudio();return {ttfa_ms:1,cache:"MISS"};},log,()=>now);
    queue.enqueue(line());await new Promise(resolve=>setTimeout(resolve,0));expect(log.mock.calls[0][0].reason).toBe("stale rep");expect(log.mock.calls[0][0].outcome).toBe("dropped");queue.close();
    expect(new SpeechDropped("fault cleared").message).toBe("fault cleared");
  });
});
describe("voice access",()=>{
  it("requires an intact, unexpired invite cookie and same origin",()=>{
    expect(voiceAccess(request())).toBe(true);expect(voiceAccess(request({},false))).toBe(false);
    const cross=request();cross.headers.set("origin","https://attacker.invalid");expect(voiceAccess(cross)).toBe(false);
    const corrupt=request();corrupt.headers.set("cookie",corrupt.headers.get("cookie")!.slice(0,-64)+"é".repeat(64));expect(voiceAccess(corrupt)).toBe(false);
    vi.useFakeTimers();const issued=request();vi.advanceTimersByTime(86400001);expect(voiceAccess(issued)).toBe(false);
  });
});
describe("TTS proxy and bounded cache",()=>{
  it("streams before upstream completion, then caches by text, voice and actual model",async()=>{
    let end!:()=>void;const fetcher=vi.fn(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));end=()=>{c.enqueue(new Uint8Array([3,4]));c.close();};}})));
    vi.stubGlobal("fetch",fetcher);const first=await synthesize("hello"),reader=first.body!.getReader();expect((await reader.read()).value).toEqual(new Uint8Array([1,2]));end();await reader.read();await reader.read();
    const second=await synthesize("hello");expect(second.headers.get("X-TTS-Cache")).toBe("HIT");expect(new Uint8Array(await second.arrayBuffer())).toEqual(new Uint8Array([1,2,3,4]));expect(fetcher).toHaveBeenCalledTimes(1);
    expect(voiceCacheKey("a","b","c")).not.toBe(voiceCacheKey("a","bc",""));
    expect(first.headers.get("X-TTS-Key")).not.toBe(voiceCacheKey("hello","other","eleven_v4_turbo"));
  });
  it("falls back only on a model error and reuses the fallback cache",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({detail:{status:"model_not_found"}},{status:400})).mockResolvedValueOnce(new Response(new Uint8Array([1,2])));vi.stubGlobal("fetch",fetcher);
    const first=await synthesize("hello");await first.arrayBuffer();expect(first.headers.get("X-TTS-Model")).toBe("eleven_flash_v2_5");expect((await synthesize("hello")).headers.get("X-TTS-Cache")).toBe("HIT");expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not cache incomplete or empty streams, or retry auth/provider errors",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response(new ReadableStream({start(c){c.error(new Error("interrupted"));}}))).mockResolvedValueOnce(new Response(new Uint8Array(0))).mockResolvedValueOnce(Response.json({error:"denied"},{status:401}));vi.stubGlobal("fetch",fetcher);
    await expect((await synthesize("hello")).arrayBuffer()).rejects.toThrow();await (await synthesize("hello")).arrayBuffer();await expect(synthesize("hello")).rejects.toThrow("provider unavailable");expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("validates text and authentication and keeps provider details private",async()=>{
    expect((await tts(request({},false))).status).toBe(401);
    for(const text of ["",null,"a".repeat(501)])expect((await tts(request({text}))).status).toBe(400);
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({secret:"not for browser"},{status:500})));const failed=await tts(request({text:"hello"}));expect(failed.status).toBe(502);expect(await failed.text()).not.toContain("not for browser");
    vi.stubEnv("ELEVENLABS_API_KEY","");await expect(synthesize("hello")).rejects.toThrow("service unavailable");
  });
});
describe("single-use STT token",()=>{
  it.each(["model_not_found","Unknown model scribe_v3_live","Model is not supported","Model unavailable"])("falls back on a model error: %s",message=>{
    expect(scribeFallback("scribe_v3_live",message)).toBe("scribe_v2_realtime");expect(scribeFallback("scribe_v2_realtime",message)).toBeNull();
  });
  it.each(["","Invalid API key","Quota exceeded","Network unavailable"])("does not retry unrelated STT failures: %s",message=>{expect(scribeFallback("scribe_v3_live",message)).toBeNull();});
  it("mints realtime_scribe server-side, no-store, with a 15-minute lifetime",async()=>{
    const fetcher=vi.fn<typeof fetch>(async()=>Response.json({token:"single-use"}));vi.stubGlobal("fetch",fetcher);const response=await token(request());
    expect(await response.json()).toEqual({token:"single-use",expires_in:900});expect(response.headers.get("Cache-Control")).toBe("no-store");expect(fetcher.mock.calls[0][0]).toContain("/single-use-token/realtime_scribe");
  });
  it("rejects unauthenticated, missing-key, empty and error responses",async()=>{
    expect((await token(request({},false))).status).toBe(401);vi.stubEnv("ELEVENLABS_API_KEY","");expect((await token(request())).status).toBe(503);vi.stubEnv("ELEVENLABS_API_KEY","test");
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({token:""})));expect((await token(request())).status).toBe(502);
    vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("network");}));expect((await token(request())).status).toBe(502);
  });
});
