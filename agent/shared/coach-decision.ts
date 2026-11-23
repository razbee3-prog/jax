import { z } from "zod";
import { FaultIdSchema } from "./rep-report";

export const CoachDecisionSchema = z.object({
  speak: z.boolean(), text: z.string(),
  kind: z.enum(["question", "ack", "correction", "reminder", "fixed", "praise", "pace", "transition", "summary", "silence"]),
  fault_id: FaultIdSchema.nullable(),
  slots: z.object({
    focus: z.string().nullable(), duration_min: z.number().nullable(),
    injuries: z.array(z.string()), has_dumbbells: z.boolean().nullable(),
  }).strict().nullable(),
  reason: z.string(),
  guidance: z.object({action:z.enum(["focus","reminder","ack","quiet"]),fault_id:FaultIdSchema.nullable(),text:z.string()}).strict().nullable(),
  summary: z.object({went_well:z.string(),next_time:z.string()}).strict().nullable(),
}).strict();
export type CoachDecision = z.infer<typeof CoachDecisionSchema>;
