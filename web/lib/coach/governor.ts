export type Priority="safety"|"correction"|"fixed"|"milestone"|"praise"|"pace";
export type SpeechLine={id:string;text:string;priority:Priority;inSet:boolean;fixed?:boolean;repAt?:number;faultId?:string;speak?:boolean;countdown?:boolean;leadIn?:string};
export type SpeechEvent={line:SpeechLine;outcome:"played"|"dropped"|"silent"|"error";reason:string;ttfa_ms:number|null;cache?:string};
export class SpeechDropped extends Error {}
const rank:Record<Priority,number>={safety:0,correction:1,fixed:2,milestone:3,praise:4,pace:5};
export class SpeechGovernor {
  private cleared=new Map<string,number>();
  private lastEnd=-Infinity;
  clearFault(id:string,at:number){this.cleared.set(id,Math.max(at,this.cleared.get(id)??-Infinity));}
  reason(line:SpeechLine,now:number){
    if(line.speak===false)return "silent decision";
    if(!line.text.trim())return "empty line";
    if(line.inSet && line.text.trim().split(/\s+/).length>14)return "word cap";
    if(line.inSet && !Number.isFinite(line.repAt))return "missing rep timestamp";
    if(line.inSet && line.repAt!==undefined && now-line.repAt>3000)return "stale rep";
    if(line.faultId && line.repAt!==undefined && (this.cleared.get(line.faultId)??-Infinity)>line.repAt)return "fault cleared";
    return null;
  }
  delay(line:SpeechLine,now:number){return line.inSet ? Math.max(0,this.lastEnd+3500-now) : 0;}
  prefer(incoming:SpeechLine,pending:SpeechLine){return rank[incoming.priority]<=rank[pending.priority];}
  ended(line:SpeechLine,now:number){if(line.inSet)this.lastEnd=now;}
  reset(){this.cleared.clear();this.lastEnd=-Infinity;}
}
