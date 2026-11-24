import {mkdir,writeFile} from "node:fs/promises";
import {Client} from "langsmith";
import {onlineCode} from "../evals/evaluators/online";

const key=process.env.LANGSMITH_API_KEY,projectName=process.env.LANGSMITH_PROJECT;
if(!key || !projectName)throw new Error("LANGSMITH_API_KEY and LANGSMITH_PROJECT are required");
const directory=process.env.EVAL_OUTPUT_DIR??"evals/results/m8";
await mkdir(directory,{recursive:true});
const name="jax-m8-coach-code-v1",code=onlineCode();
await writeFile(`${directory}/online-evaluator.mjs`,code+"\nexport {perform_eval};\n");
const project=await new Client().readProject({projectName});
const endpoint=(process.env.LANGSMITH_ENDPOINT??"https://api.smith.langchain.com").replace(/\/$/u,"");
const headers={"Content-Type":"application/json","x-api-key":key,...(process.env.LANGSMITH_WORKSPACE_ID ? {"x-tenant-id":process.env.LANGSMITH_WORKSPACE_ID}:{})};
const body={display_name:name,session_id:project.id,sampling_rate:1,filter:'eq(name, "coach.request")',is_enabled:true,code_evaluators:[{language:"javascript",code}]};
await writeFile(`${directory}/online-rule.json`,JSON.stringify(body,null,2)+"\n");
try{
  let existing:string|undefined;
  let cursor="";const cursors=new Set<string>();
  do{
    const url=new URL(endpoint+"/api/v2/runs/rules");url.searchParams.set("project_id",project.id);url.searchParams.set("name_contains",name);if(cursor)url.searchParams.set("cursor",cursor);
    const listed=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
    if(!listed.ok)throw Object.assign(new Error(`List online rules: ${(await listed.text()).replaceAll(key,"[REDACTED]").slice(0,2000)}`),{status:listed.status});
    const page=await listed.json() as {items?:{id:string;display_name:string}[];next_cursor?:string};
    if(!Array.isArray(page.items))throw new Error("Unexpected online-rule response: missing items array");
    existing=page.items.find(rule=>rule.display_name===name)?.id;cursor=page.next_cursor??"";
    if(cursor && cursors.has(cursor))throw new Error("Online-rule pagination repeated a cursor");cursors.add(cursor);
  }while(!existing && cursor);
  if(existing){await writeFile(`${directory}/online-setup.json`,JSON.stringify({status:"already_attached",rule_id:existing,project_id:project.id},null,2)+"\n");console.log(`Online evaluator already attached: ${existing}`);}
  else{
    const response=await fetch(endpoint+"/api/v1/runs/rules",{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    if(!response.ok){
      const error={status:"blocked",http_status:response.status,message:(await response.text()).replaceAll(key,"[REDACTED]").slice(0,2000)};
      await writeFile(`${directory}/online-setup.json`,JSON.stringify(error,null,2)+"\n");
      console.log(`Online evaluator creation blocked: HTTP ${response.status}; see online-setup.json`);process.exitCode=1;
    }else{
      const rule=await response.json();await writeFile(`${directory}/online-setup.json`,JSON.stringify({status:"attached",rule_id:rule.id,project_id:project.id},null,2)+"\n");
      console.log(`Online schema, word-count and latency evaluators attached: ${rule.id}`);
    }
  }
}catch(error){
  const status=error && typeof error==="object" && "status" in error ? error.status:"unknown";
  await writeFile(`${directory}/online-setup.json`,JSON.stringify({status:"blocked",http_status:status,message:error instanceof Error ? error.message.replaceAll(key,"[REDACTED]"):"Online evaluator API unavailable"},null,2)+"\n");
  console.log(`Online evaluator API blocked: ${status}; evaluator code and setup payload saved.`);process.exitCode=1;
}
