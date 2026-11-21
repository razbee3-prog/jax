# jax-coach

Jax M1 uses `managed-deepagents@0.10.5`, no sandbox, and only
`claude-haiku-5-5` (thinking disabled, low effort, 300 output tokens).
LangChain is pinned to the SDK's own `1.6.6` to avoid incompatible middleware
types from duplicate LangChain/core versions.

## Configure and run

From the repository root, with explicitly bound `ANTHROPIC_API_KEY` and
`LANGSMITH_API_KEY`, run `node scripts/configure-agent-env.mjs`.
It generates an ingress secret with openssl and writes mode-600
`~/jax-secrets/.env` and gitignored `agent/.env`. Never print their values.
Set `MDA_DEPLOYMENT_URL` and `LANGSMITH_PROJECT` when configuring an existing
deployment. LangSmith owns the deployment's tracing project; the local app
project must match the production project in `docs/STATUS.md`.

- `npm run agent:dev`: local MDA development server.
- `npm run agent:deploy`: shared sync, generated instructions, hosted deployment
  to `jax-coach-dedicated` (requires explicit deployment approval).
- `npm run smoke:agent`: three onboarding replies, 50 synthetic rep turns,
  schema/memory/trace checks and latency gate. Evidence is saved outside Git.
- `tsx scripts/benchmark-local-coach.mts`: local-policy prototype only.
- `node scripts/sync-agent-droplet-env.mjs`: updates four M1 runtime variables
  and recreates only `jax-web`; requires the droplet IP and bound LangSmith key.

## Contract

Backend ingress uses `x-mda-ingress-secret` and `x-mda-user-id`, never a
browser/workspace API key. User memory is private to that identity at
`/memories/user/AGENTS.md`. Injury answers use `question: "injuries"` and
must complete a memory write before the structured final decision; recalls
use `question: "injury_recall"`. File tools are unavailable on rep turns.
The root shared schema is copied into `agent/shared/`; do not edit the copy.

Edit coaching sources, not generated `instructions.md`. The selected profile
is `trim`; `JAX_AGENT_PROFILE=baseline|short|trim` selects the source/behavior
when configuring env files. Compact profiles retain all fault IDs and one
phrase per cue kind. Trim removes optional planning/delegation/steering
middleware; required filesystem/subagent scaffolding remains. Tool-free rep
calls use `repRunConfig` with `durability: "exit"`; onboarding keeps default
checkpoint durability. Intermediate rep state may be lost on a mid-run crash.

Latency, memory isolation, URLs and trace evidence are in `docs/STATUS.md`.
The remote latency gate remains failed. The standalone local benchmark is not
hybrid adoption: Raz must approve changing in-set coaching before any UI/server
routing changes. There is no browser or phone verification in this milestone.
