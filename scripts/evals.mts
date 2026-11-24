import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {homedir} from "node:os";
import {resolve} from "node:path";
import {Client} from "langsmith";
import {evaluate,type EvaluatorT} from "langsmith/evaluation";
import {buildCoachRows,type CoachInput,type CoachExpectation} from "../evals/datasets/coach";
import {buildSessionRows,type SessionInput} from "../evals/datasets/sessions";
import {uploadRows} from "../evals/datasets/upload";
import {aggregateHard} from "../evals/evaluators/coach";
import {coachJudge,JUDGE_MODEL} from "../evals/evaluators/judge";
import {coachTarget,type CoachOutput} from "../evals/targets/coach";
import {sessionTarget} from "../evals/targets/session";
type EvalArgs={inputs:Record<string,unknown>;outputs:Record<string,unknown>;referenceOutputs?:Record<string,unknown>};

const option=(name:string)=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
const suite=option("suite")??"all",label=option("label")??`m8-${Date.now()}`;
if(!["all","coach","sessions","perception"].includes(suite) || !/^[a-z0-9-]+$/u.test(label))throw new Error("Use --suite=all|coach|sessions|perception and a lowercase alphanumeric --label");
const directory=process.env.EVAL_OUTPUT_DIR??"evals/results/m8",evidence=resolve(process.env.EVAL_EVIDENCE_DIR??`${homedir()}/jax-evidence/m8`,label);
await mkdir(directory,{recursive:true});await mkdir(evidence,{recursive:true});
const table:{check:string;value:string;bar:string;pass:boolean}[]=[],links:Record<string,string>={},details:Record<string,unknown>={};
if(suite==="all" || suite==="perception"){
  const result=spawnSync(process.execPath,["--import","tsx","scripts/eval-perception.mts"],{stdio:"inherit",env:process.env});
  table.push({check:"Perception fixtures",value:result.status===0 ? "passed":"failed",bar:"existing M3 gates",pass:result.status===0});
  const perception=JSON.parse(await readFile("evals/results/m3-perception.json","utf8"));details.perception=perception;Object.assign(links,perception.urls);
}
if(suite!=="perception"){
  for(const name of ["LANGSMITH_API_KEY","LANGSMITH_PROJECT","JAX_BASE_URL","INVITE_CODE"])if(!process.env[name])throw new Error(`${name} is required`);
  const config={base:process.env.JAX_BASE_URL!,invite:process.env.INVITE_CODE!},client=new Client();
  const instructions_sha256=createHash("sha256").update(await readFile("agent/instructions.md")).digest("hex");
  const metadata={suite:"m8-hybrid-v1",label,instructions_sha256,target:"deployed app /api/coach",judge_model:JUDGE_MODEL,real_device:false};
  if(suite==="all" || suite==="coach"){
    const all=buildCoachRows(),selected=option("case")?.split(","),rows=selected ? all.filter(row=>selected.includes(row.inputs.id)):all;
    if(!rows.length || selected?.some(id=>!rows.some(row=>row.inputs.id===id)))throw new Error("Unknown or empty --case selection");
    const data=await uploadRows(client,"jax-coach-decisions",rows),judge=await coachJudge();
    const hard:EvaluatorT=({inputs,outputs,referenceOutputs}:EvalArgs)=>{
      const input=inputs as unknown as CoachInput,output=outputs as unknown as CoachOutput;
      const expected=[referenceOutputs as CoachExpectation,...(input.followup??[]).map(s=>s.expected)];
      return Object.entries(aggregateHard(output?.turns??[],expected)).map(([key,score])=>({key:`hard_${key}`,score}));
    };
    const llm:EvaluatorT=async({inputs,outputs}:EvalArgs)=>{
      const result=await judge(inputs as unknown as CoachInput,outputs as unknown as CoachOutput);
      return {key:"judge_average",score:result.score,comment:JSON.stringify(result.dimensions),evaluatorInfo:{model:result.model,rubric:"evals/rubrics/coach.md"}};
    };
    const experiment=await evaluate(input=>coachTarget(input as CoachInput,config),{client,data,experimentPrefix:`jax-m8-coach-${label}`,evaluators:[hard,llm],maxConcurrency:1,metadata});
    links.coach=await client.getProjectUrl({projectName:experiment.experimentName});
    const records=experiment.results.map(row=>({id:row.example.inputs.id,error:row.run.error,scores:row.evaluationResults.results,output:row.run.outputs}));
    await writeFile(resolve(evidence,"coach-results.json"),JSON.stringify(records,null,2)+"\n");
    const hardPassed=records.filter(row=>{const scores=row.scores.filter(s=>s.key.startsWith("hard_"));return !row.error && scores.length===9 && scores.every(s=>s.score===1);}).length;
    const judged=records.map(row=>row.scores.find(s=>s.key==="judge_average")?.score).filter((v):v is number=>typeof v==="number" && v>=1 && v<=5),average=judged.length ? judged.reduce((a,b)=>a+b,0)/judged.length:null;
    table.push({check:"Coach hard checks",value:`${hardPassed}/${rows.length}`,bar:"100%",pass:hardPassed===rows.length && records.length===rows.length});
    table.push({check:"Haiku judge",value:average===null ? "not measured":`${average.toFixed(3)} (${judged.length}/${rows.length})`,bar:"average ≥4; all judged",pass:judged.length===rows.length && average!==null && average>=4});
    table.push({check:"Decision coverage",value:`${rows.length}/${all.length}`,bar:"all 78 examples",pass:rows.length===all.length});
    details.coach={examples:rows.length,hard_passed:hardPassed,judge_average:average,judged:judged.length,failures:records.filter(row=>row.error || row.scores.some(s=>s.key.startsWith("hard_") && s.score!==1)).map(row=>({id:row.id,error:row.error,failed:row.scores.filter(s=>s.key.startsWith("hard_") && s.score!==1).map(s=>s.key)})),instructions_sha256};
    console.log(JSON.stringify(details.coach,null,2));
  }
  if(suite==="all" || suite==="sessions"){
    const rows=buildSessionRows(),data=await uploadRows(client,"jax-session-sim",rows);
    const checks:EvaluatorT=({outputs}:EvalArgs)=>{
      const result=outputs as unknown as Awaited<ReturnType<typeof sessionTarget>>;
      return Object.entries({forty_reps:result?.metrics?.reps===40,talk_ratio:result?.metrics?.talk_ratio_pass,rep_latency:result?.metrics?.latency_pass,speech_gap:result?.metrics?.gap_pass,trace_complete:result?.trace_pass,thumbs_feedback:result?.feedback_pass,expected_mode:result?.mode_pass}).map(([key,value])=>({key,score:Number(Boolean(value))}));
    };
    const experiment=await evaluate(input=>sessionTarget(input as SessionInput,config,resolve(evidence,"sessions",String(input.id))),{client,data,experimentPrefix:`jax-m8-session-${label}`,evaluators:[checks],maxConcurrency:1,metadata});
    links.sessions=await client.getProjectUrl({projectName:experiment.experimentName});
    const results=experiment.results.map(row=>({id:row.example.inputs.id,error:row.run.error,scores:row.evaluationResults.results,output:row.run.outputs}));
    details.sessions=results;
    for(const key of ["forty_reps","talk_ratio","rep_latency","speech_gap","trace_complete","thumbs_feedback","expected_mode"]){
      const passed=results.filter(row=>!row.error && row.scores.find(s=>s.key===key)?.score===1).length;
      table.push({check:`Session ${key}`,value:`${passed}/${rows.length}`,bar:key==="rep_latency" ? "browser meter p95 ≤2500 ms":key==="talk_ratio" ? "25–55% in every set":"100%",pass:passed===rows.length});
    }
    console.log("iPhone acoustic latency remains UNVERIFIED; desktop output-meter timing is not phone verification.");
  }
  await client.awaitPendingTraceBatches();
}
const result={label,suite,created_at:new Date().toISOString(),links,table,details,iphone_acoustic_latency:"unverified"};
await writeFile(resolve(directory,`${label}.json`),JSON.stringify(result,null,2)+"\n");
console.table(table.map(row=>({Check:row.check,Result:row.value,Bar:row.bar,Status:row.pass ? "PASS":"FAIL"})));
for(const [name,url] of Object.entries(links))console.log(`${name}: ${url}`);
if(table.some(row=>!row.pass))process.exitCode=1;
