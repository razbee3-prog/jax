"use client";
import { useCallback,useEffect,useState } from "react";
import {SessionLedger} from "./ledger";
import type {TraceData} from "./events";
import type {AuditResult} from "./audit.server";
export function useShellTrace(thread_id:string){
  const [ledger]=useState(()=>new SessionLedger(thread_id)),[snapshot,setSnapshot]=useState({receipt:ledger.receipt,acknowledged:0,emitted:0}),[audit,setAudit]=useState<AuditResult|null>(null),[auditState,setAuditState]=useState("pending");
  useEffect(()=>{
    const unsubscribe=ledger.subscribe(()=>setSnapshot({receipt:ledger.receipt,acknowledged:ledger.acknowledged.size,emitted:ledger.events.length}));
    const interval=setInterval(()=>void ledger.flush(),2000);
    const hide=()=>{if(document.visibilityState==="hidden")ledger.beacon((url,data)=>navigator.sendBeacon(url,data));};
    document.addEventListener("visibilitychange",hide);const pagehide=()=>ledger.beacon((url,data)=>navigator.sendBeacon(url,data));window.addEventListener("pagehide",pagehide);
    return()=>{clearInterval(interval);document.removeEventListener("visibilitychange",hide);window.removeEventListener("pagehide",pagehide);unsubscribe();};
  },[ledger]);
  const emit=useCallback((type:string,data:TraceData={})=>ledger.emit(type,data),[ledger]);
  const finish=useCallback(async()=>{
    setAuditState("checking");await ledger.flush();
    try{if(!ledger.receipt)throw new Error("Telemetry flush failed");const response=await fetch("/api/session/audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id,...ledger.receipt,ledger:ledger.events}),signal:AbortSignal.timeout(80000)});if(!response.ok)throw new Error("Audit unavailable");const result:AuditResult=await response.json();setAudit(result);setAuditState(result.pass ? "pass":"fail");}
    catch{setAuditState("fail");setAudit({thread_id,pass:false,expected:ledger.events.length,recorded:0,missing:[...ledger.events]});}
  },[thread_id,ledger]);
  return {emit,finish,audit,auditState,...snapshot};
}
