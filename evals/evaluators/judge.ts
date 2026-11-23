import {readFile} from "node:fs/promises";
import {ChatAnthropic} from "@langchain/anthropic";
import {z} from "zod";
import type {CoachInput} from "../datasets/coach";
import type {CoachOutput} from "../targets/coach";

export const JUDGE_MODEL="claude-haiku-5-5";
export const JudgeScore=z.object({
  warmth:z.number().int().min(1).max(5),external_focus:z.number().int().min(1).max(5),
  fits_moment:z.number().int().min(1).max(5),not_annoying:z.number().int().min(1).max(5),explanation:z.string().min(1),
}).strict();
export function judgeMean(value:unknown){
  const score=JudgeScore.parse(value);
  return (score.warmth+score.external_focus+score.fits_moment+score.not_annoying)/4;
}
export async function coachJudge(){
  if(!process.env.ANTHROPIC_API_KEY)throw new Error("ANTHROPIC_API_KEY is required for the Haiku judge");
  const rubric=await readFile(new URL("../rubrics/coach.md",import.meta.url),"utf8");
  const model=new ChatAnthropic({model:JUDGE_MODEL,maxTokens:450,maxRetries:0,thinking:{type:"disabled"},outputConfig:{effort:"low"}}).withStructuredOutput(JudgeScore,{name:"coach_judgment"});
  return async(input:CoachInput,output:CoachOutput|undefined)=>{
    if(!output?.turns?.length)throw new Error("Judge requires a completed candidate");
    const score=await model.invoke([{role:"system",content:rubric},{role:"user",content:JSON.stringify({input,candidate:output.turns})}]);
    return {score:judgeMean(score),dimensions:score,model:JUDGE_MODEL};
  };
}
