import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {AudioSession} from "./audioSession";
import {permissionFailure,requestPermissions} from "./permissions";
const track=()=>({stop:vi.fn()});
const stream=(tracks=[track()])=>({getTracks:()=>tracks});
let type:{type:string};
beforeEach(()=>{
  type={type:"playback"};
  vi.stubGlobal("navigator",{audioSession:type,mediaDevices:{getUserMedia:vi.fn()}});
  vi.stubGlobal("AudioContext",vi.fn(function(){return {createGain:()=>({connect:vi.fn()}),createAnalyser:()=>({connect:vi.fn()}),destination:{},resume:async()=>{}};}));
  vi.stubGlobal("MediaStream",class{constructor(private tracks:MediaStreamTrack[]){}getTracks(){return this.tracks;}});
});
afterEach(()=>vi.unstubAllGlobals());
it("enters play-and-record before S1 capture, preserves it through onboarding, and releases it at setup",async()=>{
  const audio=new AudioSession();await audio.unlock();expect(type.type).toBe("playback");
  const result=stream(),get=vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(async()=>{expect(type.type).toBe("play-and-record");return result as unknown as MediaStream;});
  expect(await requestPermissions(audio)).toBe(result);expect(get).toHaveBeenCalledOnce();
  audio.stopMicrophone(false);await audio.unlock();expect(type.type).toBe("play-and-record");
  audio.stopMicrophone();expect(type.type).toBe("playback");
});
it("reacquires video only after onboarding, without enabling or retrying microphone capture",async()=>{const audio=new AudioSession(),video=stream(),get=vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(video as unknown as MediaStream);expect(await requestPermissions(audio,()=>{},()=>true,false)).toBe(video);expect(get).toHaveBeenCalledWith({video:{facingMode:"user"},audio:false});expect(type.type).toBe("playback");get.mockClear().mockRejectedValue(new DOMException("busy","NotReadableError"));await expect(requestPermissions(audio,()=>{},()=>true,false)).rejects.toMatchObject({name:"NotReadableError"});expect(get).toHaveBeenCalledOnce();});
it.each(["NotAllowedError","SecurityError"])("does not retry a permission denial (%s)",async name=>{
  const error=new DOMException("denied",name),get=vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error),retry=vi.fn();
  await expect(requestPermissions(new AudioSession(),retry)).rejects.toBe(error);expect(get).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();
});
it("retries a non-permission combined failure once with separate streams in capture mode",async()=>{
  const video=stream(),mic=stream(),retry=vi.fn(),calls:MediaStreamConstraints[]=[];
  const get=vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(async constraints=>{
    expect(type.type).toBe("play-and-record");calls.push(constraints!);
    if(calls.length===1)throw new DOMException("combined unavailable","NotReadableError");
    return (calls.length===2 ? video:mic) as unknown as MediaStream;
  });
  const result=await requestPermissions(new AudioSession(),retry);
  expect(result.getTracks()).toEqual([...video.getTracks(),...mic.getTracks()]);expect(get).toHaveBeenCalledTimes(3);expect(retry).toHaveBeenCalledOnce();
  expect(calls).toEqual([{video:{facingMode:"user"},audio:true},{video:{facingMode:"user"},audio:false},{video:false,audio:true}]);
});
it("releases the first separate stream if the second request fails; never loops",async()=>{
  const video=stream(),error=new DOMException("mic busy","NotReadableError"),get=vi.mocked(navigator.mediaDevices.getUserMedia);
  get.mockRejectedValueOnce(error).mockResolvedValueOnce(video as unknown as MediaStream).mockRejectedValueOnce(error);
  await expect(requestPermissions(new AudioSession())).rejects.toBe(error);expect(get).toHaveBeenCalledTimes(3);expect(video.getTracks()[0].stop).toHaveBeenCalledOnce();
});
it("does not request a microphone after a canceled separate video grant",async()=>{
  const video=stream(),get=vi.mocked(navigator.mediaDevices.getUserMedia);let current=true;
  get.mockRejectedValueOnce(new DOMException("busy","NotReadableError")).mockImplementationOnce(async()=>{current=false;return video as unknown as MediaStream;});
  await expect(requestPermissions(new AudioSession(),()=>{},()=>current)).rejects.toMatchObject({name:"AbortError"});
  expect(get).toHaveBeenCalledTimes(2);expect(video.getTracks()[0].stop).toHaveBeenCalledOnce();
});
it.each([
  ["NotAllowedError","Camera or microphone blocked",true],["SecurityError","Camera or microphone blocked",true],
  ["NotReadableError","Camera or microphone is busy",false],["AbortError","Camera or microphone is busy",false],
  ["OverconstrainedError","Camera settings unavailable",false],["NotFoundError","Camera or microphone not found",false],
  ["InvalidStateError","Could not start camera and microphone",false],["TypeError","Could not start camera and microphone",false]
])("maps %s to actionable copy without mislabeling permission",(name,title,blocked)=>{
  expect(permissionFailure(new DOMException("browser detail",name))).toMatchObject({title,blocked,error_name:name,error_message:"browser detail"});
});
it.each([null,undefined,{},""])("handles an unknown or empty error %j",error=>{
  expect(permissionFailure(error)).toMatchObject({blocked:false,error_name:"Error",error_message:"Unknown capture error"});
});
