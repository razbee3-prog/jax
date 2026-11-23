import {Client} from "@langchain/langgraph-sdk";
import {CoachDecisionSchema} from "../../../shared/coach-decision";
export function agentClient(userId:string,env:Record<string,string|undefined>=process.env){
  for(const name of ["MDA_DEPLOYMENT_URL","MDA_INGRESS_SECRET"])if(!env[name])throw new Error(`${name} is required`);
  if(!userId.trim())throw new Error("A user ID is required");
  return new Client({apiUrl:env.MDA_DEPLOYMENT_URL,apiKey:null,timeoutMs:60000,callerOptions:{maxRetries:0},defaultHeaders:{"x-mda-ingress-secret":env.MDA_INGRESS_SECRET,"x-mda-user-id":userId}});
}
export function parseDecision(state:Record<string,unknown>){
  const decision=CoachDecisionSchema.parse(state.structuredResponse??state.structured_response);
  if(!decision.reason.trim())throw new Error("A decision reason is required");
  if(decision.speak ? !decision.text.trim():decision.text!=="")throw new Error("Speech and text disagree");
  const duration=decision.slots?.duration_min;
  if(duration!==null && duration!==undefined && (!Number.isInteger(duration)||duration<=0))throw new Error("Duration must be positive whole minutes");
  return decision;
}
export function repRunConfig(eventType:unknown,profile:string|undefined=process.env.JAX_AGENT_PROFILE){return eventType==="rep" && profile==="trim" ? {durability:"exit" as const}:{};}
