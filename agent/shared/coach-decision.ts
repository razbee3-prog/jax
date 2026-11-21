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
}).strict();
export type CoachDecision = z.infer<typeof CoachDecisionSchema>;
