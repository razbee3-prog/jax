export function containedCamera(width:number,height:number,videoWidth:number,videoHeight:number){
  if(![width,height,videoWidth,videoHeight].every(n=>Number.isFinite(n) && n>0))return null;
  const scale=Math.min(width/videoWidth,height/videoHeight),w=videoWidth*scale,h=videoHeight*scale;
  return {left:(width-w)/2,top:(height-h)/2,width:w,height:h};
}
