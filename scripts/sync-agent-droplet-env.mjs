import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const local=parseEnv(await readFile(`${homedir()}/jax-secrets/.env`,"utf8"));
const names=["LANGSMITH_API_KEY","LANGSMITH_PROJECT","MDA_DEPLOYMENT_URL","MDA_INGRESS_SECRET"];
const values=Object.fromEntries(names.map(name=>[name,name === "LANGSMITH_API_KEY" ? process.env[name] : local[name]]));
for(const name of names)if(!values[name] || /[\r\n]/.test(values[name]))throw new Error(`${name} must be present and single-line`);
if(!process.env.DROPLET_IP)throw new Error("DROPLET_IP is required");
const source=`import json, os, pathlib, stat, subprocess, sys, tempfile, time
values = json.load(sys.stdin)
def inspect():
    return json.loads(subprocess.check_output(["docker", "inspect", "jax-web"]))[0]
before = inspect()
assert before["Config"]["Image"] == "jax-web" and before["HostConfig"]["NetworkMode"] == "noa_edge" and before["HostConfig"]["RestartPolicy"]["Name"] == "unless-stopped" and not before["Mounts"], "Unexpected jax-web runtime configuration; refusing to replace it"
path = pathlib.Path("/opt/jax/.env")
mode = stat.S_IMODE(path.stat().st_mode)
assert mode == 0o600, "Unexpected runtime env permissions"
lines = path.read_text().splitlines()
seen = set()
for i, line in enumerate(lines):
    name = line.partition("=")[0]
    if name in values:
        lines[i] = name + "=" + values[name]
        seen.add(name)
lines.extend(name + "=" + value for name, value in values.items() if name not in seen)
with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, prefix=".env.m1-", delete=False) as f:
    f.write("\\n".join(lines) + "\\n")
    f.flush()
    os.fsync(f.fileno())
    os.chmod(f.name, mode)
    os.replace(f.name, path)
subprocess.run(["docker", "rm", "-f", "jax-web"], check=True, stdout=subprocess.DEVNULL)
subprocess.run(["docker", "run", "-d", "--name", "jax-web", "--network", "noa_edge", "--restart", "unless-stopped", "--env-file", str(path), "jax-web"], check=True, stdout=subprocess.DEVNULL)
after = inspect()
actual = dict(entry.split("=", 1) for entry in after["Config"]["Env"])
assert all(actual.get(name) == value for name, value in values.items()), "Container env readback mismatch"
for attempt in range(30):
    result = subprocess.run(["docker", "exec", "jax-web", "node", "-e", "fetch('http://localhost:3000/api/health').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"], capture_output=True)
    if result.returncode == 0:
        break
    time.sleep(0.3)
else:
    raise RuntimeError("jax-web health check did not become ready")
print("Runtime env: four M1 variables verified; permissions 600 preserved.")
print("jax-web recreated on noa_edge with updated env; no other containers changed.")
print("Container /api/health: HTTP 200")
`;
const quoted="'"+source.replaceAll("'","'\\''")+"'";
const result=spawnSync("ssh",["-i",`${homedir()}/.ssh/id_ed25519`,`root@${process.env.DROPLET_IP}`,`python3 -c ${quoted}`],{input:JSON.stringify(values),encoding:"utf8",timeout:120000});
let output=(result.stdout ?? "")+(result.stderr ?? "");
for(const value of [...Object.values(values),process.env.DROPLET_IP])if(value)output=output.replaceAll(value,"[REDACTED]");
process.stdout.write(output);
if(result.error || result.status !== 0)throw new Error("Droplet env synchronization failed; inspect the redacted output above");
const response=await fetch(`https://jax-${process.env.DROPLET_IP.replaceAll(".","-")}.sslip.io/api/health`).catch(()=>{throw new Error("Public health request failed (hostname redacted)");});
if(!response.ok)throw new Error(`Public health check failed: HTTP ${response.status}`);
console.log(`Public /api/health: HTTP ${response.status} ${await response.text()}`);
