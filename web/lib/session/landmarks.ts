import type {Frame} from "../pose/types";
export const LANDMARK_IDS=[0,11,12,13,14,15,16,23,24,25,26,27,28] as const;
export function landmarkSeries(frames:Frame[]){
  if(!frames.length)return [];
  const start=frames[0].t,end=Math.min(frames.at(-1)!.t,start+15000),series:{t:number;lm:[number,number,number][]}[]=[];
  let index=0;
  const round=(n:number)=>Math.round(n*10000)/10000;
  for(let t=start;t<=end;t+=100){
    while(index+1<frames.length && frames[index+1].t<t)index++;
    const a=frames[index],b=frames[Math.min(index+1,frames.length-1)],ratio=b.t===a.t ? 0:(t-a.t)/(b.t-a.t);
    series.push({t:Math.round(t-start),lm:LANDMARK_IDS.map(id=>{const p=a.landmarks[id],q=b.landmarks[id];if(!p || !q || b.t-a.t>500)return [0,0,0];return [round(p.x+(q.x-p.x)*ratio),round(p.y+(q.y-p.y)*ratio),round(Math.min(p.visibility,q.visibility))];})});
  }
  return series;
}
