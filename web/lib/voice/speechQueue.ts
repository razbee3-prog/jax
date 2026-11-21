import { SpeechGovernor,SpeechDropped,type SpeechLine,type SpeechEvent } from "../coach/governor";
export type Playback={ttfa_ms:number;cache:string};
export class SpeechQueue {
  private pending?:SpeechLine;
  private active=false;
  private timer?:ReturnType<typeof setTimeout>;
  private controller?:AbortController;
  private closed=false;
  readonly governor=new SpeechGovernor();
  constructor(private play:(line:SpeechLine,signal:AbortSignal,beforeAudio:()=>void)=>Promise<Playback>,private log:(event:SpeechEvent)=>void,private now=()=>performance.now()){}
  enqueue(line:SpeechLine){
    if(this.closed){this.log({line,outcome:"dropped",reason:"queue closed",ttfa_ms:null});return;}
    const reason=this.governor.reason(line,this.now());
    if(reason){this.log({line,outcome:line.speak===false ? "silent":"dropped",reason,ttfa_ms:null});return;}
    if(this.pending){
      if(!this.governor.prefer(line,this.pending)){this.log({line,outcome:"dropped",reason:"lower priority",ttfa_ms:null});return;}
      this.log({line:this.pending,outcome:"dropped",reason:"replaced by newer line",ttfa_ms:null});
    }
    this.pending=line;this.pump();
  }
  clearFault(id:string,at:number){this.governor.clearFault(id,at);this.pump();}
  private pump(){
    if(this.active || this.closed)return;
    clearTimeout(this.timer);
    const line=this.pending;if(!line)return;
    const reason=this.governor.reason(line,this.now());
    if(reason){this.pending=undefined;this.log({line,outcome:"dropped",reason,ttfa_ms:null});return;}
    const delay=this.governor.delay(line,this.now());
    if(delay){this.timer=setTimeout(()=>this.pump(),Math.min(delay, line.repAt===undefined ? delay : Math.max(1,line.repAt+3001-this.now())));return;}
    this.pending=undefined;this.active=true;this.controller=new AbortController();
    let started=false;
    const beforeAudio=()=>{const reason=this.governor.reason(line,this.now());if(reason)throw new SpeechDropped(reason);started=true;};
    void this.play(line,this.controller.signal,beforeAudio).then(result=>{started=true;this.log({line,outcome:"played",reason:"completed",...result});},error=>this.log({line,outcome:error instanceof SpeechDropped ? "dropped":"error",reason:error instanceof SpeechDropped ? error.message : "playback failed or cancelled",ttfa_ms:null})).finally(()=>{
      if(started)this.governor.ended(line,this.now());this.active=false;this.pump();
    });
  }
  close(){this.closed=true;clearTimeout(this.timer);this.controller?.abort();if(this.pending)this.log({line:this.pending,outcome:"dropped",reason:"queue closed",ttfa_ms:null});this.pending=undefined;}
}
