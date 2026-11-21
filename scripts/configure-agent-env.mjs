import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { parseEnv } from "node:util";

const directory = `${homedir()}/jax-secrets`, path = `${directory}/.env`;
await mkdir(directory, { recursive: true, mode: 0o700 });
const existing = await readFile(path, "utf8").then(parseEnv).catch(error=>{if(error.code === "ENOENT")return {};throw error;});
for (const name of ["ANTHROPIC_API_KEY", "LANGSMITH_API_KEY"]) if(!process.env[name]) throw new Error(`${name} is required`);
const env = { ...existing, ANTHROPIC_API_KEY:process.env.ANTHROPIC_API_KEY, LANGSMITH_API_KEY:process.env.LANGSMITH_API_KEY,
  JAX_AGENT_PROFILE:process.env.JAX_AGENT_PROFILE || existing.JAX_AGENT_PROFILE || "trim",
  MDA_INGRESS_SECRET:existing.MDA_INGRESS_SECRET || execFileSync("openssl",["rand","-hex","32"],{encoding:"utf8"}).trim(),
  ...(process.env.MDA_DEPLOYMENT_URL ? {MDA_DEPLOYMENT_URL:process.env.MDA_DEPLOYMENT_URL} : {}),
  LANGSMITH_TRACING:"true", LANGSMITH_PROJECT:process.env.LANGSMITH_PROJECT || existing.LANGSMITH_PROJECT || "jax-coach" };
if(!["baseline","short","trim"].includes(env.JAX_AGENT_PROFILE))throw new Error("Unknown JAX_AGENT_PROFILE");
for(const file of [path,"agent/.env"]){
  const content=Object.entries(env).filter(([name])=>file !== "agent/.env" || !["LANGSMITH_PROJECT","MDA_DEPLOYMENT_URL"].includes(name)).map(([name,value])=>`${name}=${JSON.stringify(value)}`).join("\n")+"\n";
  await writeFile(file,content,{mode:0o600});await chmod(file,0o600);
}
console.log("Agent and persistent local env files configured (mode 600); no secret values printed.");
