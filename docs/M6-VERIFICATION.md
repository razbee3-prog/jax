# M6 remaining full-session verification

Raz approved ignoring camera angle/position before push-ups. The production
floor prompt is non-blocking; the initial standing setup still requires 50–90%
vertical coverage held for 1.5 seconds. `COACH_FULL_SESSION_APPROVED=1` explicitly
opts into the long provider-backed session checks below.

Build first (`npm run build`). The commands below start an isolated local web
server through Playwright; no droplet or hosted-agent configuration is changed.
The environment file stays outside Git. Explicit command-line environment values
override its values, including the deliberately broken URL.

## Healthy agent, after approval

```sh
CI=true COACH_LIVE_E2E=1 COACH_FULL_SESSION_APPROVED=1 \
COACH_EVIDENCE_DIR=/home/ubuntu/jax-evidence/m6/final-agent \
node --env-file=/home/ubuntu/jax-secrets/.env \
node_modules/@playwright/test/cli.js test \
--grep 'real hybrid coach completes forty camera reps'
```

## Deliberately broken agent, after approval

```sh
CI=true COACH_LIVE_E2E=1 COACH_FULL_SESSION_APPROVED=1 \
COACH_EXPECT_FALLBACK=1 MDA_DEPLOYMENT_URL=http://127.0.0.1:1 \
COACH_EVIDENCE_DIR=/home/ubuntu/jax-evidence/m6/final-fallback \
node --env-file=/home/ubuntu/jax-secrets/.env \
node_modules/@playwright/test/cli.js test \
--grep 'real hybrid coach completes forty camera reps'
```

The fallback variant requires that exact loopback URL, uses real STT/TTS and
on-device counting, and asserts 40 reps, fallback cue decisions and exclusively
fallback coach results. It does not intercept `/api/coach` to fake an outage.

For each successful run, use its `session.json` with
`npx tsx scripts/audit-shell.mts <session.json>` (with LangSmith environment loaded).
The persistent `/home/ubuntu/jax-evidence/m6/analyze.mjs <evidence-directory>`
performs latency/source/model/tool readback and writes `measurements.json` and
`readback.json`. Run it with the same server-only environment loaded. Require
nonzero LangSmith fallback-source spans for the broken-URL run. Only a completed
40-rep run supplies the final requested session statistics; partial-run numbers
are not substitutes.

## Independent, short checks (no floor check)

- `CI=true npm run test:e2e -- --grep 'real camera framing|pending rep retention'`
  uses an actual demo webcam, mocked coach responses and aborted network speech.
- `CI=true COACH_PARTIAL_LIVE_E2E=1 node --env-file=/home/ubuntu/jax-secrets/.env node_modules/@playwright/test/cli.js test --grep 'agent debrief and calorie summary'`
  completes one camera-counted RDL set, then explicitly ends during rest. Only
  set-end feedback and summary call the real agent; other coach turns are mocked.
  It verifies evidence forwarding, no duplicate set-end, real summary fields and
  the rounded MET 3.5 / 68 kg calorie calculation. Provider audio is aborted.

Use `COACH_EVIDENCE_DIR` to persist screenshots and JSON outside test artifacts.
These short checks do not satisfy either full-session gate.
