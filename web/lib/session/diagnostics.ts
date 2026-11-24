import type {TraceData} from "./events";
export function clientFailure(error:unknown){
  const value=error && typeof error==="object" ? error as {name?:unknown;message?:unknown;digest?:unknown}:{};
  return {error_name:typeof value.name==="string" ? value.name.slice(0,100):"Error",error_message:(typeof value.message==="string" ? value.message:typeof error==="string" ? error:"Unknown client error").replace(/https?:\/\/[^\s"'<>]+/gu,"[URL]").slice(0,1000),...(typeof value.digest==="string" ? {digest:value.digest.slice(0,100)}:{})};
}
export function installDiagnostics(thread:string,screen:()=>string,record:(data:TraceData)=>void){
  const seen=new Set<string>(),send=(data:TraceData)=>{const key=JSON.stringify([screen(),data.phase,data.path,data.status,data.error_name,data.error_message]);if(seen.has(key))return;seen.add(key);record({screen:screen(),...data});};
  const error=(event:ErrorEvent)=>send({phase:"window",...clientFailure(event.error??event.message)});
  const rejection=(event:PromiseRejectionEvent)=>send({phase:"promise",...clientFailure(event.reason)});
  const original=window.fetch;
  const fetch:typeof window.fetch=async(input,init)=>{
    const url=new URL(input instanceof Request ? input.url:String(input),window.location.href);
    if(url.origin!==window.location.origin || !url.pathname.startsWith("/api/"))return original.call(window,input,init);
    const headers=new Headers(init?.headers??(input instanceof Request ? input.headers:undefined));headers.set("x-jax-thread-id",thread);
    try{const response=await original.call(window,input,{...init,headers});if(!response.ok)send({phase:"http",path:url.pathname,status:response.status,error_name:"HTTPError",error_message:`HTTP ${response.status}`});return response;}
    catch(error){send({phase:"fetch",path:url.pathname,...clientFailure(error)});throw error;}
  };
  window.fetch=fetch;window.addEventListener("error",error);window.addEventListener("unhandledrejection",rejection);
  return()=>{if(window.fetch===fetch)window.fetch=original;window.removeEventListener("error",error);window.removeEventListener("unhandledrejection",rejection);};
}
