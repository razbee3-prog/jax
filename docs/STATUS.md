# Jax status

## M2 — pose engine and rep counting

### Review follow-up

- Fixed all four review findings with regressions: delayed right-only arrival after two seconds of empty frames now counts three curls; Stop retains capture/count/dimensions for export; a rewind to a nonzero timestamp starts a fresh monotonic recording; curl/push-up travel is measured from the last start pose, including the initial movement interval.
- Focused browser checks passed for stop/export and nonzero rewind; final lint/typecheck exit 0 and Vitest 3 files / 46 tests passed. No counting thresholds changed. Post-Stop retained UI state is behavior-tested, not newly visually inspected.

- Branch `devin/1795212767-m2-pose`, based on `devin/1795211338-m0`, independent of the paused M1 branch. M1 dependency/blocker WIP was committed and pushed separately as `b18d805` on `devin/1795212712-m1-agent`; M1 still needs a valid Anthropic key.
- Added exact `@mediapipe/tasks-vision@1.2.3`, self-hosted full/lite models and matching package WASM (sources/hashes in their READMEs), GPU initialization with CPU fallback, strictly increasing inference timestamps, and model disposal. The lab starts full and switches to lite after 30 measured inferences if inference alone averages below 20/s. Actual iPhone sustained throughput is not verified.
- Added aspect-correct 2D angles, near-side selection during setup, visibility >= 0.5, per-coordinate 1 Euro filters (min cutoff 1 Hz, beta 0.01), deterministic exercise hysteresis/timing/tracking-loss gates, and four exercise configurations. No language model or server receives camera frames.
- `/lab` accepts uploads, demos and camera input; shows skeleton, angles, phase, count, inference rate and an explicit M3 fault-flag placeholder; exports landmark JSON. Added wake-lock acquisition/reacquisition. No actual form-fault detectors are implemented in M2.
- `scripts/extract-landmarks` extracts raw landmark fixtures using headless local Chromium and 30 Hz video seeks. `scripts/generate-negative-fixtures.mts` generates deterministic negatives. `scripts/record-lab.mjs` records the visible lab at 390x844.

### Truth labels and results

Truth was determined by visually reviewing ffmpeg frame grabs at one-second intervals, not by trusting the counter. Montages: `/home/ubuntu/jax-evidence/m2/{exercise}-frames.jpg`. The visible cycles are stand/hinge/stand for RDL (approximately 0–5 and 6–12 seconds), rack/overhead/rack for push press (0–4 and 4–8), down/curl/down for curls (0–4, 4–8, 8–12), and top/bottom/top for push-ups (0–3, 3–6, 6–9). Detailed extraction provenance and limitations are in `evals/fixtures/README.md`.

| Demo | Expected | Fixture replay | Live `/lab` recording |
|---|---:|---:|---:|
| rdl | 2 | 2 | 2 |
| push-press | 2 | 2 | 2 |
| curl | 3 | 3 | 3 |
| push-up | 3 | 3 | 3 |

Standing-still, walking-in and setup/picking-up synthetic fixtures each count **0 for all four exercises** (12 negative assertions). Empty and low-visibility sequences also count zero. These are not real-world false-positive measurements.

### Evidence-backed tuning

- Push press: rack/start threshold is now <= 0.35 torso lengths (PLAN <= 0.2), completion <= 0.35 (PLAN <= 0.3), and overhead >= 0.8 (PLAN >= 0.9). `variants/push-press-cpu.json` preserves a visible rack around 0.33 with the opposite setup-side selection; the GPU demo fixture peaks around 0.87 overhead. Both fixtures now replay to the two-rep visual truth. Elbow and torso gates are unchanged.
- RDL: use the selected near wrist/hip for wrists-below-hips, not the occluded far wrist. The raw RDL fixture exposed a missed second rep with the both-wrists gate; selected-side gating restores the two frame-labelled reps.
- Corrected the 250 ms return-phase timer to start at entry to `UP_PHASE`, not at the far threshold. Added a regression case for a long bottom hold followed by a too-fast return. Other exercise angle/travel thresholds and filter parameters are unchanged.

### Verification and evidence

- `npm run lint` and `npm run typecheck`: exit 0. `npm test`: 3 files / 43 tests passed, including four demo fixtures, CPU push-press variant, all negative/exercise combinations, timing/visibility/tracking-loss regressions and mocked landmarker GPU/CPU/error/close cases.
- Final production `npm run build`: compiled successfully; routes include `/lab`. Final `npm run test:e2e`: 2 passed (17.5s); fake-webcam RDL reached count 2 (16.1s test duration). The fake webcam is a real ffmpeg-generated 640px y4m RDL clip, with three seconds of initial standing pose before movement; no counting is mocked.
- Playwright now starts the built standalone server, not the dev server. `npm run build` is required before `npm run test:e2e`; `scripts/start-web.mjs` copies public/static assets into standalone output before launching it. CI installs ffmpeg for y4m generation. ESLint excludes vendor WASM runtime JavaScript.
- First-party staged diff passes whitespace checks. The byte-for-byte copied upstream WASM JavaScript has trailing whitespace/blank EOF warnings from `git diff --check`; it is intentionally not reformatted so its recorded hashes still match the package.
- CPU was selected for recordings and fake webcam because this VM's software GPU is not representative of phone acceleration and initially dropped reps in real-time playback. Default app delegate remains GPU with CPU creation fallback. Canonical fixtures were extracted with GPU/SwiftShader; this is deliberately separate from the CPU real-time check.
- Animated recordings (each < 1 MB, below the requested 10 MB): `/home/ubuntu/jax-evidence/m2/rdl-lab.webp`, `push-press-lab.webp`, `curl-lab.webp`, `push-up-lab.webp` in that same directory. Source `.webm`, final 390x844 `.png`, raw `*-live.json`, truth montages and `fake-camera-count.png` are alongside them. Lab screenshots were visually inspected for skeleton/metrics/count; demo counts are 2/2/3/3.
- Side-on versus 45-degree comparison is explicitly deferred until Raz supplies comparison clips. The generated demos change apparent angle and do not validate camera placement. No real iPhone, portrait-upload camera framing, sustained phone performance, or wake-lock behavior on iOS has been verified. M2 was not deployed; remote CI for this branch has not been checked.

## Follow-up: authorized DigitalOcean deployment

- PR #1 head a5c9d9b passed bootstrap and Devin Review before deployment work. Added `web/Dockerfile` (build from repository root with `docker build -f web/Dockerfile -t jax-web .`), root `.dockerignore`, and standalone Next output with repository tracing root.
- Deployed to `/opt/jax/app`; Node 22 multi-stage image runs as non-root `node`, container `jax-web` on `noa_edge`, restart `unless-stopped`. Secrets are runtime-only in `/opt/jax/.env`, mode 600. ELEVENLABS_API_KEY was present; LANGSMITH_API_KEY remained missing in fresh shells and is not configured. No values logged.
- Backed up Caddyfile before adding the Jax sslip.io hostnames. Caddy config validated and reloaded; existing strongr homepage still HTTP 200. No other application containers changed.
- Live HTTPS checks: health 200 with `{"status":"ok"}`, homepage 200 containing Jax, lowercase invite 200, wrong invite 401. Live 390x844 screenshot visually inspected: `/home/ubuntu/jax-evidence/live-invite-390x844.png`.
- Deployment follow-up checks: lint/typecheck exit 0, 9 Vitest tests passed, standalone build passed locally and in Docker, Playwright 1 passed. Real iPhone verification remains open. The earlier no-deployment note below describes the original bootstrap task, superseded by this explicit deployment authorization.

## Implemented

- Node v22.23.3; npm worktree at repository root; Next.js 16.4.6 App Router, TypeScript, Tailwind.
- Section 4 directories scaffolded. Agent remains a README and synced shared copy, with no M1 agent implementation or dependencies installed.
- S0 invite copy, visual tokens, reduced-motion shake, gesture-created audio context, server-only case-insensitive invite check, health endpoint. Accepted invites show an explicit bootstrap placeholder, not S1.
- Root Commands from AGENTS.md; agent and smoke-agent stubs fail with M1 message, smoke-session with M6, evals with M7.
- Shared sync and drift-rejecting check; GitHub Actions lint, typecheck, unit tests, shared check, build and Chromium Playwright.
- PLAN and AGENTS copied without wrapper titles (source headings are content); AGENTS is 8,796 bytes.

## Verification

- Local lint and typecheck exit 0; Vitest: 1 file, 9 tests passed; build produces /, /api/invite and /api/health; Playwright: 1 passed at 390 x 844 (wrong and mixed-case correct codes).
- Shared copies match; deliberately divergent temporary copy rejected with exit 1.
- Screenshot visually inspected: `/home/ubuntu/jax-evidence/invite-390x844.png`. CI uploads browser test results.
- npm install audit: 0 vulnerabilities. Initial ESLint entities error and Playwright dev-origin/ambiguous-alert failures fixed. One transient slow-filesystem warning on the successful browser run.
- Remote GitHub Actions bootstrap job passed (commit bc66755, job 136591589786): 1 passed, 0 failed, 0 pending. Next.js generated `web/AGENTS.md` is retained as framework guidance.
- No real iPhone check, deployment, or hosted URL: explicitly prohibited by this task. Full PLAN M0 deployment/phone acceptance remains open.

## Versions

All versioned entries in the PLAN stack table were verified on npm and exist exactly: next 16.4.6, @mediapipe/tasks-vision 1.2.3, @elevenlabs/react 1.23.1, managed-deepagents 0.10.5, deepagents 1.17.0, @langchain/anthropic 1.6.6, @langchain/langgraph-sdk 1.17.0, langsmith 0.13.1. Only bootstrap dependencies installed; pose, voice, agent, tracing, shadcn and motion deferred to their milestones. The S0 idle orb is a CSS placeholder pending the real ElevenLabs Orb in the voice UI milestone. No substituted stack versions.

## Demo assets

ffprobe results (bytes); every output is H.264, yuv420p, no audio, faststart MP4. All four needed conversion for codec or size. Encoded with libx264 CRF 26, width 1280, aspect ratio preserved.

| Asset | Input codec / bytes | Output bytes | Output dimensions | Duration |
|---|---|---:|---|---|
| rdl | H.264 / 14,063,326 | 787,041 | 1280x732 | 12.250 s |
| push-press | HEVC / 1,659,118 | 466,569 | 1280x720 | 8.042 s |
| curl | HEVC / 2,609,748 | 681,343 | 1280x720 | 12.042 s |
| push-up | H.264 / 16,377,659 | 982,708 | 1280x720 | 10.000 s |

## Environment check (names only)

```text
ANTHROPIC_API_KEY: present
LANGSMITH_API_KEY: missing
LANGSMITH_TRACING: missing
LANGSMITH_PROJECT: missing
MDA_DEPLOYMENT_URL: missing
MDA_INGRESS_SECRET: missing
ELEVENLABS_API_KEY: missing
ELEVENLABS_VOICE_ID: missing
ELEVENLABS_TTS_MODEL: missing
INVITE_CODE: missing
SESSION_SECRET: missing
ADMIN_KEY: missing
ALERT_WEBHOOK_URL: missing
VERCEL_TOKEN: missing
```

Missing secrets do not block bootstrap: no external services are invoked, and an unset INVITE_CODE fails closed with HTTP 503. Playwright supplies a synthetic invite only. Real invite value and service configuration are needed before integration/deployment. No secret values committed or printed.
