import {SIDES} from "./angles";
import type {Frame,Side} from "./types";
export function setupQuality(frame:Frame,side:Side){
  const points=[0,...SIDES[side]].map(i=>frame.landmarks[i]);
  const visible=points.every(p=>p && p.visibility>=0.5 && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1);
  const body_height=visible ? Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)):0;
  return {visible,body_height,ready:visible && body_height>=0.5 && body_height<=0.9};
}
