import type {CoachDecision} from "../../../shared/coach-decision";
import type {RepReport} from "../../../shared/rep-report";
export function debriefReports(sets:readonly RepReport[][],exercise?:number){
  const reports=exercise===undefined ? sets.flatMap(set=>set.length ? [set[set.length-1]]:[]):sets[exercise]??[];
  return reports.length ? {reports}:{};
}
export function summarySpeech(decision:CoachDecision|null|undefined,signoff:string){
  const text=decision?.speak ? decision.text.trim():"";
  return text.endsWith(signoff) ? text:[decision?.summary?.went_well?.trim(),signoff].filter(Boolean).join(" ");
}
