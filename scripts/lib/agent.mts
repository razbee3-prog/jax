export {agentClient,parseDecision,repRunConfig} from "../../web/lib/coach/agent.server";
export function percentile(samples: readonly number[], quantile: number) {
  if(!samples.length || !samples.every(n=>Number.isFinite(n)&&n>=0) || quantile<=0 || quantile>1 || !Number.isFinite(quantile))throw new Error("Invalid percentile inputs");
  return [...samples].sort((a,b)=>a-b)[Math.ceil(quantile*samples.length)-1];
}
