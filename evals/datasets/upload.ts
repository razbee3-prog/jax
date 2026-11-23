import {createHash} from "node:crypto";
import {Client} from "langsmith";
type Row={inputs:object;outputs:object;metadata:object};
export async function uploadRows(client:Client,name:string,rows:Row[]){
  if(!rows.length)throw new Error(`Refusing an empty evaluation dataset: ${name}`);
  const dataset=await client.hasDataset({datasetName:name}) ? await client.readDataset({datasetName:name}):await client.createDataset(name,{description:"Jax M8 hybrid contract evaluation. Counterfactual validated flags are synthetic fixtures, NOT detector validation or speech-gate evidence."});
  const existing=new Set<string>();for await(const example of client.listExamples({datasetId:dataset.id}))existing.add(example.id);
  const payload=rows.map(row=>{
    const hash=createHash("sha256").update(name+JSON.stringify(row)).digest("hex").slice(0,32);
    const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20)}`;
    return {id,dataset_id:dataset.id,inputs:row.inputs,reference_outputs:row.outputs,metadata:{...row.metadata,suite:"m8-hybrid-v1"}};
  });
  const missing=payload.filter(row=>!existing.has(row.id));
  for(let i=0;i<missing.length;i+=3)await client.createExamples(missing.slice(i,i+3));
  const wanted=new Set(payload.map(row=>row.id)),examples=[];
  for await(const example of client.listExamples({datasetId:dataset.id}))if(wanted.has(example.id))examples.push(example);
  if(examples.length!==rows.length)throw new Error(`${name}: expected ${rows.length} examples, received ${examples.length}`);
  console.log(`${name}: ${examples.length} examples; ${await client.getDatasetUrl({datasetId:dataset.id})}`);
  return examples;
}
