import { z } from "zod";
import { FAULT_IDS } from "./faults";

export const ExerciseSchema = z.enum(["rdl", "push-press", "curl", "push-up"]);
export const FaultIdSchema = z.enum(FAULT_IDS);
export const LandmarkSchema = z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite().optional(), visibility: z.number().min(0).max(1) });
export const FrameSchema = z.object({ t: z.number().finite().nonnegative(), landmarks: z.array(LandmarkSchema).length(33).or(z.array(LandmarkSchema).length(0)) });
export const RepWindowSchema = z.object({
  exercise: ExerciseSchema, width: z.number().positive(), height: z.number().positive(),
  frames: z.array(FrameSchema), baselineTorsoLength: z.number().positive().optional(),
});
export type RepWindow = z.infer<typeof RepWindowSchema>;
export const ReportFaultSchema = z.object({
  id: FaultIdSchema, value: z.number().finite(), threshold: z.number().finite(), tier: z.enum(["A", "B"]),
  streak: z.number().int().positive(), validation: z.enum(["provisional", "validated"]),
});
export const RepReportSchema = z.object({
  exercise: ExerciseSchema, rep: z.number().int().positive(), target: z.number().int().positive(),
  ms: z.object({ total: z.number().nonnegative(), lowering: z.number().nonnegative(), lifting: z.number().nonnegative(), since_last_rep: z.number().nonnegative() }),
  metrics: z.record(z.string(), z.number().finite()), faults: z.array(ReportFaultSchema),
  quality: z.object({ visibility: z.number().min(0).max(1), fps: z.number().nonnegative(), view_ok: z.boolean() }),
  keyframes: z.array(z.object({ t: z.enum(["top", "bottom", "end"]), lm: z.record(z.string(), z.tuple([z.number().finite(), z.number().finite()])) })).max(3),
});
export type RepReport = z.infer<typeof RepReportSchema>;
