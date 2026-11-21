export function scribeFallback(model:string,error:string){
  return model==="scribe_v3_live" && /model.{0,80}(unavailable|not[\s_]+(?:found|available|supported)|invalid|unsupported)|(?:invalid|unknown)[\s_]+model/i.test(error) ? "scribe_v2_realtime" : null;
}
