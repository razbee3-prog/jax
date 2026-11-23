import {z} from "zod";
import {CoachDecisionSchema} from "../../shared/coach-decision";

export function onlineCode(){
  const schema=JSON.stringify(z.toJSONSchema(CoachDecisionSchema));
  return `function perform_eval(run) {
  const schema = ${schema};
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
  const count = t => typeof t === "string" && t.trim() ? t.trim().split(/\\s+/u).length : 0;
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
}`;
}
