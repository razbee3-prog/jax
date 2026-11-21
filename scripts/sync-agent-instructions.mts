import { readFile, writeFile } from "node:fs/promises";
import { CUES } from "../shared/cues";
import { FAULTS } from "../shared/faults";
import { parseEnv } from "node:util";

const env=parseEnv(await readFile("agent/.env","utf8"));
const compact=["short","trim"].includes(env.JAX_AGENT_PROFILE);
const rules=await readFile(compact ? "agent/coaching-short.md" : "agent/coaching.md","utf8");
const bank=compact ? Object.fromEntries(Object.entries(CUES).map(([id,c])=>[id,{first:[c.first[1]],reminder:[c.reminder[1]],fixed:[c.fixed[0]]}])) : CUES;
await writeFile("agent/instructions.md",rules+"\n## Fault catalog\n\n"+JSON.stringify(FAULTS)+"\n\n## Cue bank\n\n"+JSON.stringify(bank)+"\n");
console.log("Agent instructions include the shared fault catalog and cue bank.");
