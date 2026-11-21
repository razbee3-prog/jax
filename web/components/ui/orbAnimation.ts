import type { Color,ShaderMaterial } from "three";
export function advanceOrbMaterial(material:ShaderMaterial,delta:number,speed:number,input:number,output:number,first:Color,second:Color){
  const u=material.uniforms;
  u.uTime.value+=delta*0.5;
  u.uOpacity.value=Math.min(1,u.uOpacity.value+delta*2);
  u.uAnimation.value+=delta*speed;
  u.uInputVolume.value=input;
  u.uOutputVolume.value=output;
  u.uColor1.value.lerp(first,0.08);
  u.uColor2.value.lerp(second,0.08);
}
