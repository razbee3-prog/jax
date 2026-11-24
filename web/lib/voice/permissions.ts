import type {AudioSession} from "./audioSession";
export function permissionFailure(error:unknown){
  const name=error && typeof error==="object" && "name" in error && typeof error.name==="string" ? error.name:"Error";
  const message=error && typeof error==="object" && "message" in error && typeof error.message==="string" ? error.message:"Unknown capture error";
  const blocked=name==="NotAllowedError" || name==="SecurityError";
  const copy=blocked ? ["Camera or microphone blocked","In Safari, open Page Menu → Website Settings and allow Camera and Microphone. In Chrome, open Settings → Apps → Chrome and enable Camera and Microphone. Then retry."]:
    name==="NotReadableError" || name==="AbortError" ? ["Camera or microphone is busy","Close other apps or tabs using your camera or microphone, then try again."]:
    name==="OverconstrainedError" ? ["Camera settings unavailable","Your device could not use the requested camera settings. Try another camera or browser."]:
    name==="NotFoundError" ? ["Camera or microphone not found","Connect a camera and microphone, then try again."]:
    ["Could not start camera and microphone","Keep Jax in the foreground and try again. If this continues, reload Jax."];
  return {blocked,title:copy[0],message:copy[1],error_name:name,error_message:message.slice(0,1000)};
}
export async function requestPermissions(audio:Pick<AudioSession,"prepareForCapture">,onRetry:(error:unknown)=>void=()=>{},isCurrent:()=>boolean=()=>true){
  audio.prepareForCapture();
  try{return await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:true});}
  catch(error){if(permissionFailure(error).blocked || !isCurrent())throw error;onRetry(error);}
  let video:MediaStream|undefined,microphone:MediaStream|undefined;
  try{
    video=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
    if(!isCurrent())throw new DOMException("Capture canceled","AbortError");
    microphone=await navigator.mediaDevices.getUserMedia({video:false,audio:true});
    return new MediaStream([...video.getTracks(),...microphone.getTracks()]);
  }catch(error){video?.getTracks().forEach(track=>track.stop());microphone?.getTracks().forEach(track=>track.stop());throw error;}
}
