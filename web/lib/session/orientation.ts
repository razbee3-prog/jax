function physicalOrientation(){
  const orientation=window.screen?.orientation;
  return orientation && /^(portrait|landscape)-(primary|secondary)$/.test(orientation.type) ? orientation:undefined;
}
function hasLegacyOrientation(){return typeof window.orientation==="number" && Number.isFinite(window.orientation);}
export function isLandscape(){
  if(typeof window==="undefined")return false;
  const orientation=physicalOrientation();
  if(orientation)return orientation.type.startsWith("landscape");
  if(hasLegacyOrientation())return Math.abs(window.orientation)%180===90;
  return window.matchMedia("(orientation: landscape)").matches;
}
export function subscribeOrientation(notify:()=>void){
  if(typeof window==="undefined")return()=>{};
  const orientation=physicalOrientation();
  if(orientation){orientation.addEventListener("change",notify);return()=>orientation.removeEventListener("change",notify);}
  if(hasLegacyOrientation()){window.addEventListener("orientationchange",notify);return()=>window.removeEventListener("orientationchange",notify);}
  const query=window.matchMedia("(orientation: landscape)");
  query.addEventListener("change",notify);return()=>query.removeEventListener("change",notify);
}
