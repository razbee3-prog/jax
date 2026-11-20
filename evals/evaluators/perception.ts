import { FAULT_IDS, precision, recall, speechStatus, type Evidence, type FaultId } from "../../shared/faults";
export function countScores(actual:number,expected:number) {
  if (!Number.isFinite(actual)||!Number.isFinite(expected)) throw new Error("Count scores require finite numbers");
  return {exact_match:Number(actual===expected),absolute_error:Math.abs(actual-expected)};
}
export type FaultResult = { predicted:FaultId[]; expected:FaultId[]; evaluated:FaultId[]; provenance:"synthetic"|"real" };
export function faultEvidence(rows:FaultResult[]):Evidence {
  const evidence:Evidence=Object.fromEntries(FAULT_IDS.map(id=>[id,{synthetic:{tp:0,fp:0,fn:0},real:{tp:0,fp:0,fn:0}}]));
  for(const row of rows) for(const id of new Set(row.evaluated)) {
    const c=evidence[id]![row.provenance];
    if(row.predicted.includes(id)){ if(row.expected.includes(id))c.tp++;else c.fp++; }
    else if(row.expected.includes(id))c.fn++;
  }
  return evidence;
}
export function faultTable(rows:FaultResult[]) {
  const evidence=faultEvidence(rows);
  return FAULT_IDS.map(id=>({id,...evidence[id]!,precision:precision(evidence[id]!.synthetic),recall:recall(evidence[id]!.synthetic),real_precision:precision(evidence[id]!.real),status:speechStatus(id,evidence[id]),speech_eligible:speechStatus(id,evidence[id])==="validated"}));
}
