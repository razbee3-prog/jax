export const FAULT_IDS = [
  "rdl_back_round", "rdl_knee_squat", "rdl_drift", "rdl_shallow", "rdl_fast",
  "pp_chest_forward", "pp_dip_deep", "pp_no_legs", "pp_soft_lockout", "pp_lean_back", "pp_press_early",
  "curl_swing", "curl_elbow_drift", "curl_partial", "curl_drop",
  "pu_hip_sag", "pu_hip_pike", "pu_shallow", "pu_head_drop",
] as const;
export type FaultId = typeof FAULT_IDS[number];
export type Exercise = "rdl" | "push-press" | "curl" | "push-up";
export type Tier = "A" | "B";
const proxies: readonly FaultId[] = ["rdl_back_round", "pp_lean_back", "pp_press_early", "pu_head_drop"];
export const FAULTS = Object.fromEntries(FAULT_IDS.map((id, priority) => [id, {
  id, priority, tier: proxies.includes(id) ? "B" : "A",
  exercise: id.startsWith("rdl_") ? "rdl" : id.startsWith("pp_") ? "push-press" : id.startsWith("curl_") ? "curl" : "push-up",
}])) as Record<FaultId, { id: FaultId; priority: number; tier: Tier; exercise: Exercise }>;

export type Counts = { tp: number; fp: number; fn: number };
export type FaultEvidence = { synthetic: Counts; real: Counts };
export type Evidence = Partial<Record<FaultId, FaultEvidence>>;
export type UnlockStatus = "locked" | "provisional" | "validated";
export function precision(c: Counts): number | null { return c.tp + c.fp ? c.tp / (c.tp + c.fp) : null; }
export function recall(c: Counts): number | null { return c.tp + c.fn ? c.tp / (c.tp + c.fn) : null; }
export function speechStatus(id: FaultId, evidence?: FaultEvidence): UnlockStatus {
  if (!evidence) return "locked";
  const real = precision(evidence.real);
  if (real !== null && real >= 0.85) return "validated";
  const synthetic = precision(evidence.synthetic);
  if (FAULTS[id].tier === "A" && real === null && synthetic !== null && synthetic >= 0.85) return "provisional";
  return "locked";
}
