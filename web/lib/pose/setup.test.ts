import {describe,it,expect} from "vitest";
import {setupQuality} from "./setup";
import type {Frame} from "./types";
const frame=():Frame=>({t:0,landmarks:Array.from({length:33},(_,i)=>({x:0.4,y:i===0 ? 0.1:0.8,visibility:1}))});
describe("real setup framing",()=>{
  it("requires a complete visible body filling fifty to ninety percent of height",()=>{
    const f=frame();expect(setupQuality(f,"left")).toMatchObject({visible:true,ready:true});for(const y of [0.2,0.4]){f.landmarks.forEach((p,i)=>{if(i)p.y=y;});expect(setupQuality(f,"left").ready).toBe(false);}f.landmarks.forEach(p=>{p.y=1;});f.landmarks[0].y=0;expect(setupQuality(f,"left").ready).toBe(false);
  });
  it("rejects empty, missing, low-visibility and out-of-frame landmarks",()=>{
    expect(setupQuality({t:0,landmarks:[]},"left").ready).toBe(false);
    for(const change of [{visibility:0.4},{x:-0.1},{y:1.1},{x:NaN}]){const f=frame();Object.assign(f.landmarks[15],change);expect(setupQuality(f,"left").ready).toBe(false);}
  });
});
