import type {Page} from "@playwright/test";
export async function demoCamera(page:Page,microphone=false){
  await page.addInitScript(({microphone})=>{
    const media=navigator.mediaDevices,original=media.getUserMedia.bind(media),tracks:MediaStreamTrack[]=[];
    Object.assign(window,{coachMicrophoneTracks:tracks});
    Object.defineProperty(media,"getUserMedia",{value:async(constraints:MediaStreamConstraints)=>{
      const audio=constraints.audio && microphone ? await original({audio:constraints.audio}):new MediaStream();tracks.push(...audio.getAudioTracks());
      if(!constraints.video)return audio;
      const canvas=document.createElement("canvas");canvas.width=640;canvas.height=366;const context=canvas.getContext("2d")!;
      const videos=new Map<string,HTMLVideoElement>();let exercise="rdl",screen="";
      for(const id of ["rdl","push-press","curl","push-up"]){const video=document.createElement("video");video.src=`/videos/${id}.mp4`;video.muted=true;video.loop=true;video.playsInline=true;video.preload="auto";video.load();videos.set(id,video);}
      const draw=()=>{
        const active=document.querySelector("[data-testid=app-shell]")?.getAttribute("data-screen")??"";
        const source=document.querySelector<HTMLVideoElement>(".screen-S5 .shell-demo,.screen-S6 .shell-demo,.screen-S7 .shell-demo")?.getAttribute("src");
        const next=active==="S3" && document.querySelector(".screen-S3 .shell-eyebrow")?.textContent?.includes("FLOOR") ? "push-up":source?.split("/").at(-1)?.replace(".mp4","")??exercise;
        if(next!==exercise){videos.get(exercise)!.pause();exercise=next;}
        const video=videos.get(exercise)!;if(active==="S6" && screen!==active)video.currentTime=0;screen=active;
        if(video.paused)void video.play().catch(()=>{});
        if(video.readyState>=2){const scale=Math.min(canvas.width/video.videoWidth,canvas.height/video.videoHeight),width=video.videoWidth*scale,height=video.videoHeight*scale;context.fillStyle="black";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(video,(canvas.width-width)/2,(canvas.height-height)/2,width,height);}
        requestAnimationFrame(draw);
      };draw();
      return new MediaStream([...canvas.captureStream(24).getVideoTracks(),...audio.getAudioTracks()]);
    }});
  },{microphone});
}
