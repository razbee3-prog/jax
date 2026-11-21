import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { CuePolicy } from "../web/lib/pose/cuePolicy";
import { RepReportSchema } from "../shared/rep-report";
import { parseDecision, percentile } from "./lib/agent.mjs";

const policy=new CuePolicy(),times:number[]=[],decisions=[];
for(let i=0;i<50;i++){
  const start=performance.now(),rep=i%10+1;
  const report=RepReportSchema.parse({exercise:"rdl",rep,target:10,ms:{total:2000,lowering:1200,lifting:800,since_last_rep:2000},
    metrics:{},quality:{visibility:0.95,fps:30,view_ok:true},keyframes:[],
    faults:rep>=2&&rep<=4 ? [{id:"rdl_shallow",value:130,threshold:120,tier:"A",streak:rep-1,validation:"validated"}] : []});
  const cue=policy.next({report,observations:report.faults.map(f=>({...f,metric:"synthetic benchmark"}))});
  const decision=parseDecision({structuredResponse:{speak:!!cue,text:cue?.text ?? "",kind:cue ? cue.kind === "first" ? "correction" : cue.kind : "silence",fault_id:cue?.fault_id ?? null,slots:null,reason:cue ? "Prototype cached detector cue" : "Prototype silence"}});
  times.push((performance.now()-start)/1000);decisions.push(decision);
}
const evidence={prototype_only:true,adopted:false,remote_MDA_gate_passed:false,
  note:"Synthetic reports simulate validated flags ONLY to benchmark cached policy branches. This is not real detector validation, an MDA turn, or an audio latency measurement.",
  n:50,p50_seconds:percentile(times,0.5),p95_seconds:percentile(times,0.95),spoken:decisions.filter(d=>d.speak).length,decisions};
const directory=`${homedir()}/jax-evidence/m1`;
await mkdir(directory,{recursive:true});await writeFile(`${directory}/hybrid-prototype.json`,JSON.stringify(evidence,null,2)+"\n");
console.log(`Local-only hybrid prototype (NOT the MDA gate): n=50 p50=${evidence.p50_seconds.toFixed(6)}s p95=${evidence.p95_seconds.toFixed(6)}s spoken=${evidence.spoken}/50`);
console.log("Not adopted. Raz must approve changing in-set coaching to cached local cues; no UI/server routing changed.");
console.log(`Evidence: ${directory}/hybrid-prototype.json`);
