"use client";
import { useCallback,useRef,useState } from "react";
export function useShellTrace(thread_id:string){
  const [receipt,setReceipt]=useState<{run_id:string;receipt:string}|null>(null),[acknowledged,setAcknowledged]=useState(0),[emitted,setEmitted]=useState(0);
  const ledger=useRef<{event_id:string;type:string;acked:boolean}[]>([]);
  const emit=useCallback((type:string,data:Record<string,string|number|boolean>={})=>{
    const event_id=crypto.randomUUID(),item={event_id,type,acked:false};ledger.current.push(item);setEmitted(n=>n+1);
    void fetch("/api/session/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id,event_id,type,data}),keepalive:true}).then(async response=>{if(!response.ok)return;const result=await response.json();if(result.event_id!==event_id)return;item.acked=true;setAcknowledged(n=>n+1);if(type==="session.end")setReceipt({run_id:result.run_id,receipt:result.receipt});}).catch(()=>{});
  },[thread_id]);
  return {emit,receipt,acknowledged,emitted,ledger};
}
