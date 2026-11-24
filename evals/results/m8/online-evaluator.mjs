function perform_eval(run) {
  const schema = {"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"speak":{"type":"boolean"},"text":{"type":"string"},"kind":{"type":"string","enum":["question","ack","correction","reminder","fixed","praise","pace","transition","summary","silence"]},"fault_id":{"anyOf":[{"type":"string","enum":["rdl_back_round","rdl_knee_squat","rdl_drift","rdl_shallow","rdl_fast","pp_chest_forward","pp_dip_deep","pp_no_legs","pp_soft_lockout","pp_lean_back","pp_press_early","curl_swing","curl_elbow_drift","curl_partial","curl_drop","pu_hip_sag","pu_hip_pike","pu_shallow","pu_head_drop"]},{"type":"null"}]},"slots":{"anyOf":[{"type":"object","properties":{"focus":{"type":["string","null"]},"duration_min":{"type":["number","null"]},"injuries":{"type":"array","items":{"type":"string"}},"has_dumbbells":{"type":["boolean","null"]}},"required":["focus","duration_min","injuries","has_dumbbells"],"additionalProperties":false},{"type":"null"}]},"reason":{"type":"string"},"guidance":{"anyOf":[{"type":"object","properties":{"action":{"type":"string","enum":["focus","reminder","ack","quiet"]},"fault_id":{"anyOf":[{"type":"string","enum":["rdl_back_round","rdl_knee_squat","rdl_drift","rdl_shallow","rdl_fast","pp_chest_forward","pp_dip_deep","pp_no_legs","pp_soft_lockout","pp_lean_back","pp_press_early","curl_swing","curl_elbow_drift","curl_partial","curl_drop","pu_hip_sag","pu_hip_pike","pu_shallow","pu_head_drop"]},{"type":"null"}]},"text":{"type":"string"}},"required":["action","fault_id","text"],"additionalProperties":false},{"type":"null"}]},"summary":{"anyOf":[{"type":"object","properties":{"went_well":{"type":"string"},"next_time":{"type":"string"}},"required":["went_well","next_time"],"additionalProperties":false},{"type":"null"}]}},"required":["speak","text","kind","fault_id","slots","reason","guidance","summary"],"additionalProperties":false};
  function valid(s, v) {
    if (s.anyOf) return s.anyOf.some(x => valid(x, v));
    if (s.enum && !s.enum.includes(v)) return false;
    if (s.type === "null") return v === null;
    if (s.type === "string") return typeof v === "string";
    if (s.type === "boolean") return typeof v === "boolean";
    if (s.type === "number") return typeof v === "number" && Number.isFinite(v);
    if (s.type === "array") return Array.isArray(v) && v.every(x => valid(s.items, x));
    if (s.type === "object") {
      if (!v || typeof v !== "object" || Array.isArray(v)) return false;
      if ((s.required || []).some(k => !(k in v))) return false;
      if (s.additionalProperties === false && Object.keys(v).some(k => !(k in (s.properties || {})))) return false;
      return Object.entries(s.properties || {}).every(([k, p]) => !(k in v) || valid(p, v[k]));
    }
    return true;
  }
  const d = run.outputs && (run.outputs.decision || run.outputs);
  const metadata = (run.extra && run.extra.metadata) || run.metadata || {};
  const rep = metadata.event_type === "rep";
  const count = t => typeof t === "string" && t.trim() ? t.trim().split(/\s+/u).length : 0;
  const schemaValid = valid(schema, d);
  const result = {
    coach_schema_valid: Number(schemaValid && (d.speak ? d.text.trim().length > 0 : d.text === "")),
    coach_inset_word_cap: Number(schemaValid && (!rep || (count(d.text) <= 14 && count(d.guidance && d.guidance.text) <= 14)))
  };
  const ms = Date.parse(run.end_time) - Date.parse(run.start_time);
  result.coach_turn_latency_valid = Number(Number.isFinite(ms) && ms >= 0);
  if (result.coach_turn_latency_valid) {
    result.coach_turn_latency_ms = ms;
    result.coach_turn_under_deadline = Number(ms <= 4000);
  }
  return result;
}
export {perform_eval};
