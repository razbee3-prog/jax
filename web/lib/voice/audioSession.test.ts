import { beforeEach,afterEach,it,expect,vi } from "vitest";
import { AudioSession } from "./audioSession";
const node=()=>({connect:vi.fn(),disconnect:vi.fn(),gain:{value:1},fftSize:512,getFloatTimeDomainData:(bytes:Float32Array)=>bytes.fill(0)});
const context={createGain:vi.fn(node),createAnalyser:vi.fn(node),createMediaStreamSource:vi.fn(node),destination:{},resume:vi.fn(async()=>{}),close:vi.fn(),sampleRate:48000,audioWorklet:{addModule:vi.fn(async()=>{})}};
beforeEach(()=>{vi.stubGlobal("AudioContext",vi.fn(function(){return context;}));vi.stubGlobal("AudioWorkletNode",vi.fn(function(){return {...node(),port:{postMessage:vi.fn(),onmessage:null}};}));});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it("uses the existing context for capture, honors half-duplex even during connection, and stops tracks at setup",async()=>{
  const track={enabled:true,readyState:"live",stop:vi.fn(()=>{track.readyState="ended";})};
  const audioSession={type:"playback"};vi.stubGlobal("navigator",{audioSession,mediaDevices:{getUserMedia:vi.fn(async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]}))}});
  const session=new AudioSession();await session.unlock();session.muteMicrophone(true);await session.startMicrophone(()=>{});
  expect(track.enabled).toBe(false);expect(audioSession.type).toBe("play-and-record");expect(AudioContext).toHaveBeenCalledTimes(1);
  session.muteMicrophone(false);expect(track.enabled).toBe(true);session.stopMicrophone();expect(track.readyState).toBe("ended");expect(audioSession.type).toBe("playback");expect(context.close).not.toHaveBeenCalled();
});
it("releases a late permission grant instead of reopening the mic after setup",async()=>{
  const stop=vi.fn();let grant!:(value:unknown)=>void;vi.stubGlobal("navigator",{audioSession:{type:"playback"},mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})}});
  const session=new AudioSession(),pending=session.startMicrophone(()=>{});session.stopMicrophone();grant({getTracks:()=>[{stop}]});await pending;expect(stop).toHaveBeenCalledOnce();
});
