import { readdir, readFile } from "node:fs/promises";
import { z } from "zod";
import { FAULT_IDS, type FaultId } from "../../shared/faults";
import { FaultIdSchema, RepWindowSchema } from "../../shared/rep-report";
import { PosePipeline } from "../../web/lib/pose/pipeline";
import { analyzeRep } from "../../web/lib/pose/faults";

export const FaultFixtureSchema = z.object({
  version:z.literal(1),id:z.string(),provenance:z.enum(["synthetic","real"]),source:z.string(),perturbation:z.string(),
  expected:z.array(FaultIdSchema),evaluated:z.array(FaultIdSchema).min(1),window:RepWindowSchema,
});
export type FaultFixture = z.infer<typeof FaultFixtureSchema>;
export type DatasetRow = { inputs:Record<string,unknown>; outputs:Record<string,unknown>; metadata:Record<string,unknown> };
export async function loadFaultFixtures(folder="evals/fixtures/faults"):Promise<FaultFixture[]> {
  const fixtures:FaultFixture[]=[];
  for(const file of (await readdir(folder)).filter(f=>f.endsWith(".json")).sort()) fixtures.push(FaultFixtureSchema.parse(JSON.parse(await readFile(`${folder}/${file}`,"utf8"))));
  if (!fixtures.length) throw new Error("No fault fixtures found");
  return fixtures;
}
export async function buildCountingRows():Promise<DatasetRow[]> {
  const rows:DatasetRow[]=[];
  for(const exercise of ["rdl","push-press","curl","push-up"] as const){
    const f=JSON.parse(await readFile(`evals/fixtures/${exercise}.json`,"utf8"));
    rows.push({inputs:RepWindowSchema.parse(f),outputs:{count:f.expected},metadata:{id:exercise,provenance:"demo",truth:"manual frame review"}});
    for(const name of ["standing-still","walking-in","setup-picking-up"]){
      const negative=JSON.parse(await readFile(`evals/fixtures/negative/${name}.json`,"utf8"));
      rows.push({inputs:RepWindowSchema.parse({...negative,exercise}),outputs:{count:0},metadata:{id:exercise+"-"+name,provenance:"synthetic"}});
    }
  }
  return rows;
}
export async function buildFaultRows():Promise<DatasetRow[]> {
  return (await loadFaultFixtures()).map(f=>({inputs:{window:f.window},outputs:{faults:f.expected,evaluated:f.evaluated},metadata:{id:f.id,provenance:f.provenance,source:f.source,perturbation:f.perturbation}}));
}
export function countTarget(input:unknown) {
  const f=RepWindowSchema.parse(input),p=new PosePipeline(f.exercise,f.width,f.height);
  for(const frame of f.frames) p.process(frame);
  return {count:p.counter.count};
}
export function faultTarget(input:{window:unknown}):{faults:FaultId[]} {
  return {faults:analyzeRep(RepWindowSchema.parse(input.window)).observations.map(f=>f.id)};
}
export const allFaultIds = FAULT_IDS;
