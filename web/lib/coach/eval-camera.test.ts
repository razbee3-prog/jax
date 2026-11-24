import {describe,it,expect,vi} from "vitest";
import {runInNewContext} from "node:vm";
import {demoCamera} from "../../e2e/coach-fixtures";

describe("evaluation camera bootstrap",()=>{
  for(const microphone of [false,true])it(`initializes standalone JavaScript with microphone=${microphone}`,async()=>{
    let script:unknown;
    await demoCamera({addInitScript:async(value:unknown)=>{script=value;return {dispose:async()=>{},[Symbol.asyncDispose]:async()=>{}};}},microphone);
    expect(typeof script).toBe("string");
    const audio={getAudioTracks:()=>[{kind:"audio"}]},original=vi.fn(async()=>audio),media:{getUserMedia:(constraints:unknown)=>Promise<unknown>}={getUserMedia:original},window={};
    class Stream{getAudioTracks(){return [];}}
    runInNewContext(script as string,{navigator:{mediaDevices:media},window,MediaStream:Stream});
    expect(media.getUserMedia).not.toBe(original);
    await media.getUserMedia({audio:true});
    expect(original).toHaveBeenCalledTimes(microphone ? 1:0);
    expect(window).toHaveProperty("coachMicrophoneTracks",microphone ? [{kind:"audio"}]:[]);
  });
});
