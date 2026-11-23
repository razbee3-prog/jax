import {it,expect} from "vitest";
import {containedCamera} from "./framing";
it("fits landscape and portrait camera images without cropping",()=>{
  expect(containedCamera(390,844,1280,720)).toEqual({left:0,top:312.3125,width:390,height:219.375});
  expect(containedCamera(100,100,50,100)).toEqual({left:25,top:0,width:50,height:100});
  expect(containedCamera(100,100,100,50)).toEqual({left:0,top:25,width:100,height:50});
});
it("waits for valid layout and camera metadata",()=>{
  expect(containedCamera(390,844,0,0)).toBeNull();expect(containedCamera(0,0,1280,720)).toBeNull();expect(containedCamera(NaN,844,1280,720)).toBeNull();
});
