import {z} from "zod";
import {ExerciseSchema,RepReportSchema} from "./rep-report";
export const CoachEventSchema=z.object({
  type:z.enum(["session_start","onboarding_answer","brief","set_start","rep","stall","set_end","session_end"]),
  question:z.string().max(40).optional(),transcript:z.string().max(1000).optional(),next_question:z.string().max(1000).optional(),
  known_injuries:z.array(z.string().max(200)).max(20).optional(),returning:z.boolean().optional(),
  exercise:ExerciseSchema.optional(),target_reps:z.literal(10).optional(),set_id:z.string().max(100).optional(),
  report:RepReportSchema.optional(),reports:z.array(RepReportSchema).min(1).max(10).optional(),
  totals:z.object({reps:z.number().int().min(0).max(40),elapsed_ms:z.number().nonnegative(),kcal:z.number().nonnegative(),weight_kg:z.literal(68),met:z.literal(3.5)}).strict().optional(),
}).strict().superRefine((event,ctx)=>{
  if(event.type==="rep" && (!event.report || !event.reports || event.reports.at(-1)?.rep!==event.report.rep || event.reports.some(r=>r.exercise!==event.report!.exercise)))ctx.addIssue({code:"custom",message:"Rep event requires a consistent batch"});
  if(event.type==="onboarding_answer" && (!event.question || !event.transcript))ctx.addIssue({code:"custom",message:"Onboarding requires question and transcript"});
});
export type CoachEvent=z.infer<typeof CoachEventSchema>;
