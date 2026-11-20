import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "langsmith";
import { evaluate, type EvaluatorT, type SummaryEvaluatorT } from "langsmith/evaluation";
import { FAULT_IDS } from "../shared/faults";
import { buildCountingRows, buildFaultRows, countTarget, faultTarget, type DatasetRow } from "../evals/datasets/perception";
import { countScores, faultTable, type FaultResult } from "../evals/evaluators/perception";
import type { FaultId } from "../shared/faults";

if(!process.env.LANGSMITH_API_KEY) throw new Error("LANGSMITH_API_KEY is required");
const client=new Client();
const suite="m3-perception-v1";
async function upload(name:string,rows:DatasetRow[]) {
  const dataset=await client.hasDataset({datasetName:name}) ? await client.readDataset({datasetName:name}) : await client.createDataset(name,{description:"Jax M3 perception smoke evaluation. Synthetic fault fixtures are NOT real-clip validation."});
  const existing=new Set<string>();
  for await(const example of client.listExamples({datasetId:dataset.id})) existing.add(example.id);
  const payload=rows.map(row=>{
    const hex=createHash("sha256").update(name+JSON.stringify(row)).digest("hex").slice(0,32);
    const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`;
    return {id,dataset_id:dataset.id,inputs:row.inputs,reference_outputs:row.outputs,metadata:{...row.metadata,suite}};
  });
  const missing=payload.filter(row=>!existing.has(row.id));
  for(let i=0;i<missing.length;i+=3) await client.createExamples(missing.slice(i,i+3));
  const ids=new Set(payload.map(row=>row.id));
  const examples=[];
  for await(const example of client.listExamples({datasetId:dataset.id})) if(ids.has(example.id)) examples.push(example);
  if(examples.length!==rows.length) throw new Error(`${name}: expected ${rows.length} examples, API returned ${examples.length}`);
  console.log(`${name}: ${examples.length} examples; ${await client.getDatasetUrl({datasetId:dataset.id})}`);
  return examples;
}
const counting=await upload("jax-rep-counting",await buildCountingRows());
const faults=await upload("jax-form-faults",await buildFaultRows());
const countEvaluators:EvaluatorT[]=[({outputs,referenceOutputs})=>{
  const scores=countScores(outputs.count,referenceOutputs!.count);
  return Object.entries(scores).map(([key,score])=>({key,score}));
}];
const faultEvaluator:EvaluatorT=({outputs,referenceOutputs})=>{
  const expected=referenceOutputs!.faults as FaultId[],evaluated=referenceOutputs!.evaluated as FaultId[],predicted=outputs.faults as FaultId[];
  return evaluated.map(id=>({key:id+"_correct",score:Number(predicted.includes(id)===expected.includes(id))}));
};
const faultSummary:SummaryEvaluatorT=({runs,examples})=>{
  const rows:FaultResult[]=runs.map(run=>{
    const example=examples.find(e=>e.id===run.reference_example_id);
    if(!example) throw new Error("Summary run has no matching labeled example");
    return {predicted:run.outputs!.faults,expected:example.outputs!.faults,evaluated:example.outputs!.evaluated,provenance:example.metadata!.provenance};
  });
  return faultTable(rows).flatMap(r=>[
    {key:r.id+"_precision",score:r.precision ?? undefined,comment:"Synthetic/demo only; not real-clip validation"},
    {key:r.id+"_recall",score:r.recall ?? undefined,comment:"Synthetic/demo only; not real-clip validation"},
  ]);
};
const countExperiment=await evaluate(input=>countTarget(input),{client,data:counting,experimentPrefix:"jax-m3-rep-counting",evaluators:countEvaluators,maxConcurrency:2,metadata:{suite}});
const countResults=countExperiment.results;
const faultExperiment=await evaluate(input=>faultTarget(input as {window:unknown}),{client,data:faults,experimentPrefix:"jax-m3-form-faults",evaluators:[faultEvaluator],summaryEvaluators:[faultSummary],maxConcurrency:2,metadata:{suite,real_labeled_clips:0}});
const faultResults=faultExperiment.results;
if(countResults.length!==counting.length || faultResults.length!==faults.length) throw new Error("Experiment returned incomplete results");
await client.awaitPendingTraceBatches();
const urls={counting:await client.getProjectUrl({projectName:countExperiment.experimentName}),faults:await client.getProjectUrl({projectName:faultExperiment.experimentName})};
const table=faultTable(faultResults.map(row=>({predicted:row.run.outputs!.faults,expected:row.example.outputs!.faults,evaluated:row.example.outputs!.evaluated,provenance:row.example.metadata!.provenance})));
const scores=countResults.map(row=>countScores(row.run.outputs!.count,row.example.outputs!.count));
const result={suite,created_at:new Date().toISOString(),urls,counting:{examples:scores.length,exact_matches:scores.filter(s=>s.exact_match).length,absolute_error:scores.reduce((n,s)=>n+s.absolute_error,0)},faults:{examples:faultResults.length,real_labeled_clips:0,table}};
await mkdir("evals/results",{recursive:true});
await writeFile("evals/results/m3-perception.json",JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(scores.some(s=>!s.exact_match)||table.some(r=>r.recall!==1)||FAULT_IDS.some(id=>!table.some(r=>r.id===id))) process.exitCode=1;
