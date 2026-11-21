# Jax status

## M1 resumed — deployed, latency gate FAILED

- Branch `devin/1795212712-m1-agent`; merged M3 first (`de76408`). The prior Anthropic-key blocker is resolved: explicit org binding and `claude-haiku-5-5` returned HTTP 200. Every new Anthropic call, including isolated API probes, used only that model. No larger/fallback model or LLM judge was used.
- Read the installed `managed-deepagents@0.10.5` README and scaffolded `jax-coach` with `--no-sandbox`, moved into `agent/`. Native structured `CoachDecision` schema lives in `shared/` and is synced. The Anthropic JSON-schema subset rejected integer bounds, so the wire schema uses plain numbers; the client parser additionally enforces positive whole-minute duration, nonempty reasons and coherent speech/text.
- Backend-only ingress uses the two MDA headers, explicitly suppressing workspace-key forwarding. Per-user injury memory is `/memories/user/AGENTS.md`, with the SDK's supported (deprecated) `allow` opt-in for direct backend calls. No agent-shared memory. An injury answer must complete a write before the structured final reply; the model initially promised persistence without writing, caught by the new-session smoke test and fixed with a required onboarding write phase. Rep tools are removed and guarded at execution too.
- Instructions implement PLAN 9.1, include all 19 faults and the cue bank, and forbid provisional/synthetic-only speech eligibility. Baseline and compact sources are retained; compact uses one phrase per cue kind and current-set-only model context. No counting, thresholds, perception evidence or cue acknowledgment/cap behavior changed.
- Selected server: https://jax-coach-dedicated-3a2af49f980e52d586bcfd9b83a5026c.us.langgraph.app . Project: `jax-coach-dedicated-production`, ID `01a1fb80-0ac8-7811-8ba3-fb4377f4e01d`. `npm run agent:deploy` targets this dedicated server. Profile `trim` is the best observed MDA configuration, but **does not pass** p95 <=1.8 s (or p50 <=0.9 s).

All measurements below are 50 sequential synthetic clean rep turns on one UUID-v7 thread, after separate onboarding sessions, without excluding slow turns. They measure full SDK wait/parse latency from this VM, not TTS or iPhone latency. Quantiles use nearest rank. The same small report payload was used in all trials; this is not a representative faulty/large-keyframe workload.

| Configuration, in PLAN 5.6 order | p50 seconds | p95 seconds | Gate |
|---|---:|---:|---|
| Serverless baseline | 3.239 | 5.025 | FAIL |
| Dedicated baseline | 2.679 | 5.065 | FAIL |
| Dedicated, shorter prompt/current-set history | 3.013 | 4.715 | FAIL |
| Dedicated, trimmed harness and exit-only rep checkpoints | 1.874 | 2.403 | FAIL |
| Selected trim, compatible LangChain 1.6.6, final redeploy | 1.808 | 2.210 | FAIL |

- Trim excludes optional planning/async delegation/parent notification/steering middleware and related tools, retaining required filesystem/subagent scaffolding, memory, cache and tool guards. Only tool-free rep requests use exit-only checkpoints; intermediate rep state can be lost on a mid-run crash, but successful final state is committed and onboarding retains default durability. API comparison showed 50 each of parent-notifier, async-before-model and steering-before-model spans in the short trial, zero in trim. Evidence: `/home/ubuntu/jax-evidence/m1/harness-comparison.json`.
- Every trial parsed all 50 decisions and all three onboarding replies. Same user/new thread recalled the synthetic knee injury; different user returned no injuries. LangSmith API verified 51 roots in one project/thread (50 exact rep event IDs plus local `traceable`), with no errors or rep tool calls in the dedicated trials. Trim thread: `01a1fb96-e431-711b-bc13-0d8788c67a45`. Raw decisions, latencies and API proof: `/home/ubuntu/jax-evidence/m1/{serverless-baseline,dedicated-baseline,dedicated-short,dedicated-trim}.json`.
- Last option, **prototype only, not adopted**: existing local `CuePolicy` + schema parsing over 50 synthetic reports took p50 0.000011 s / p95 0.000323 s, spoke 15/50. Mock validated flags exercise cached correction/reminder/fixed branches; they are not real precision evidence. This is not an MDA or audio latency measurement and does not make the M1 gate pass. Evidence: `/home/ubuntu/jax-evidence/m1/hybrid-prototype.json`. **Raz must approve hybrid in-set coaching before routing changes**; onboarding, set-end feedback and summaries would remain MDA-owned.
- Chrome reached the LangSmith login/signup gate; no thread screenshot was possible. Login evidence: `/home/ubuntu/jax-evidence/m1/langsmith-login-required.png`. API thread proof is saved instead. No API keys were put in the browser.
- Keys/ingress secret are in gitignored `agent/.env` and mode-600 `/home/ubuntu/jax-secrets/.env`; ingress generated with openssl. The platform owns its tracing project; the project variable is intentionally omitted from deploy env and retained locally for app traces. A stale SDK deprecation warning was removed by using its current run-query/URL API, after verifying Node/environment and API behavior. Generated `.mda` output is excluded from lint/agent typechecking; source remains checked.
- Original serverless spike is retained at https://jax-coach-0461fad529a05da6a65542fe14d4b741.us.langgraph.app (not selected); no hosted resource was deleted. Dedicated hosting was created for the explicitly requested mitigation and may incur its usual cost.
- Runtime sync completed: four M1 values verified inside `jax-web`, `/opt/jax/.env` mode 600 preserved, only `jax-web` recreated on `noa_edge`. Container and public health returned HTTP 200. No droplet IP or credential values printed.
- Local verification: lint clean, web + agent typechecks passed, **95 tests in 5 files passed**, shared copies match, production build passed. A middleware type conflict exposed the SDK's exact nested LangChain 1.6.6/core pin; aligning the authored LangChain dependency to 1.6.6 deduplicated middleware types without a cast or changing required MDA/Anthropic/deepagents versions. No UI change; existing browser/real-phone verification was not rerun.
- Final redeployed compatible build: `/home/ubuntu/jax-evidence/m1/selected-trim.json`, thread `01a1fba4-24d3-7059-ac40-04df80fa1c61`, exact 51 roots, zero rep tools, memory isolation and all schema/word-count checks passed; the smoke exits 1 solely for latency. API model readback over its rep/onboarding threads found **55/55 LLM spans using claude-haiku-5-5**, saved in `model-verification.json`. An intermediate trim rerun before dependency alignment measured 1.824/2.146 s; retained as `selected-trim-langchain-1.6.7.json`, not the shipped dependency build. All these repeated samples still failed the gate; no slow sample was dropped.


## M3 — fault detectors and perception evals

- Review follow-up: degenerate derived angles now reduce tracking quality instead of leaking NaN into reports; non-finite optional neck metrics are omitted. Both tiers require real-clip validation for speech. An off-profile decisive peak suppresses form claims even when average view passes. All original demo peaks failed the profile gate, so the revised synthetic positive/clean suite explicitly projects shoulders to side-on and sets visibility to 1; it is not raw model output or new accuracy evidence. An unmodified off-profile RDL window is retained as an additional quality negative. The revised suite below has 24 examples; earlier 23-example experiments remain historical in LangSmith.
- Push-press phase labels now match curl direction: ascent to maximum wrist height is lifting, return is lowering. Dip/early-press predicates use explicit pre-lockout timestamps/knee angles, not these phase labels; their thresholds are unchanged. All four review fixes had a targeted failing-first test; final lint/typecheck, 83 tests in 4 files, shared-sync check and production build passed. The rejected cue acknowledgment/cap behavior was not changed.
- Branch `devin/1795214320-m3-faults`, based on M2; M2 review fixes merged from its separate worktree. M1 remains paused; this work needs no Anthropic calls.
- Added all 19 PLAN 7.2 detectors in `web/lib/pose/faults.ts`, using filtered aspect-correct near-side image landmarks and the existing `view_ok` check. Starting fault thresholds are unchanged. Rep-window timing, knee/arm excursion, ear/torso proxies, signed hip sag/pike, and wrist/shin/shoulder distances are evaluated without an LLM.
- Added shared Zod `RepReport`/rep-window schemas, catalog and cue bank (three variants each of first/reminder/fixed for every fault), synced to `agent/shared/`. Added `RepReporter` (quality gates, consecutive-B streaks, separately logged observations) and one-fault correction/reminder/fixed selection with a two-cue cap. No actual voice/agent/UI events are emitted by M3.
- All faults are **speech-ineligible**: there are zero real labeled clips. Tier A results with synthetic precision >=0.85 retain a **provisional research status only**; `RepReporter` requires real precision >=0.85 for either tier. There is no dev override. Default report construction without explicit evidence fails closed. The caller must provide bounded rep/attempt windows and standing baseline where appropriate; live session wiring is deferred to M6.
- Generated 19 single-target synthetic profile perturbations, four projected presumed-clean demo negatives and one unmodified off-profile quality negative; documented exact operators per JSON and limitations in `evals/fixtures/faults/README.md`. Labels are not inferred from detector predictions. Only the intended positive fault is labeled on a perturbation; other fault truth is masked. All faults for the exercise are evaluated on clean/quality negatives. Severe translations, synthetic profile projection and compressed timestamps are predicate smoke tests, not realistic validation footage.
- Dataset builders/evaluators now back `npm run evals` (perception subset; coach/session evals remain M7). LangSmith authentication succeeded with the explicitly bound secret. Revised v2 datasets uploaded and both experiments completed. Counting: **16/16 exact, total absolute error 0**. Faults: 24 examples, every targeted synthetic fault detected; four false positives on projected presumed-clean demos are retained. Each fault has one positive and one projected clean negative; RDL faults also have an off-profile quality negative. All 19 are speech-ineligible; no statistical accuracy claims.

Experiments (SDK-generated URLs):
- Rep counting: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/48de20a7-848b-4d7c-8564-f4c568e32518
- Form faults: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/4e455a1e-9324-4fe2-a528-9c132daaa964

### Per-fault synthetic results

Real precision/recall are N/A for **every** row. Provisional does not mean real-clip unlocked.

| Fault | Tier | Precision | Recall | Research evidence status (all speech-ineligible) |
|---|---|---:|---:|---|
| rdl_back_round | B | 0.50 | 1.00 | locked |
| rdl_knee_squat | A | 1.00 | 1.00 | provisional |
| rdl_drift | A | 1.00 | 1.00 | provisional |
| rdl_shallow | A | 0.50 | 1.00 | locked |
| rdl_fast | A | 1.00 | 1.00 | provisional |
| pp_chest_forward | A | 1.00 | 1.00 | provisional |
| pp_dip_deep | A | 1.00 | 1.00 | provisional |
| pp_no_legs | A | 1.00 | 1.00 | provisional |
| pp_soft_lockout | A | 1.00 | 1.00 | provisional |
| pp_lean_back | B | 1.00 | 1.00 | locked |
| pp_press_early | B | 0.50 | 1.00 | locked |
| curl_swing | A | 1.00 | 1.00 | provisional |
| curl_elbow_drift | A | 1.00 | 1.00 | provisional |
| curl_partial | A | 1.00 | 1.00 | provisional |
| curl_drop | A | 1.00 | 1.00 | provisional |
| pu_hip_sag | A | 1.00 | 1.00 | provisional |
| pu_hip_pike | A | 1.00 | 1.00 | provisional |
| pu_shallow | A | 1.00 | 1.00 | provisional |
| pu_head_drop | B | 0.50 | 1.00 | locked |

- Results artifact: `evals/results/m3-perception.json`, suite `m3-perception-v2`, includes all 16/24 rows and explicit `speech_eligible: false` for every detector. The first v1 aggregation incorrectly iterated the already-consumed SDK experiment iterator; the runner now reads `.results` and asserts exact row counts. Earlier experiments remain in LangSmith; links above are the revised v2 pair.
- M3 checks: 4 files / 78 tests passed; shared copies match; lint/typecheck exit 0; production build passed; final Playwright suite 3 passed (17.2s), including fake webcam and rewind/export. Initial cue-loop regression exposed an inconsistent-input fixed acknowledgment after two nudges; corrected to check both eligible faults and observed faults before acknowledging a fix. Report arguments are validated before streak state can mutate.
- No M3 visual surface changed: pure detector/report APIs and offline experiments only. `/lab` retains its M2 fault placeholder until live wiring; no new visual verification was requested/performed. Real fault clips, side-on/45-degree comparison, iPhone camera/framing, and real precision remain open. Received a PR #2 failed-check notification; CI-loop ownership was not delegated with the four review findings, so its remote failure has not been investigated here.

## M2 — pose engine and rep counting

### Review follow-up

- CI investigation: PR #2 job `136619497084` and PR #3 job `136621527420` both fail the fake-webcam assertion (expected 2, received 1 within 20 seconds). Reproduced with `CI=true taskset -c 0,1 npm run test:e2e`: two tests pass and camera counting fails. An instrumented local camera capture shows automatic full-to-lite switching during setup; the first hinge has a minimum measured hip angle around 137 degrees and never reaches the unchanged 125-degree RDL gate. The same demo's full-model fixture reaches about 114 degrees. CI artifacts/logs do not show the backend, so the corresponding model switch on the hosted runners remains unverified. Two camera warm-up experiments did not fix the constrained test; both changes were reverted. No threshold, timeout, or test expectation was relaxed. Resolving model-dependent counting versus making this test explicitly target a selected model needs a decision; no CI fix has been pushed.
- Approved CI follow-up: `/lab` now exposes Auto/full/lite model selection, default Auto; the fake-webcam test explicitly selects full/CPU and verifies the backend. Auto can switch only during initial setup, before any movement phase has started; that latch stays set even after an aborted rep or between reps, and resets only for a new recording. Explicit full/lite never adapt. No counting thresholds or test timeouts changed.
- Open M9 risk: lite never reaches the 125-degree hip gate on the first demo hinge in the constrained reproduction (minimum about 137 degrees), so only one of the two reps counts. Pinning this full-model smoke test does not resolve or validate lite accuracy; test/calibrate lite separately before relying on it for phone fallback.
- Follow-up local verification: lint/typecheck exit 0; Vitest 3 files / 46 tests passed; production build passed; constrained `CI=true taskset -c 0,1 npm run test:e2e` passed all 3 tests in 18.9 seconds. The changed model selector/full-CPU count-2 state was visually inspected at 390x844 (`/home/ubuntu/jax-evidence/m2/full-model-camera-count.png`).
- Fixed all four review findings with regressions: delayed right-only arrival after two seconds of empty frames now counts three curls; Stop retains capture/count/dimensions for export; a rewind to a nonzero timestamp starts a fresh monotonic recording; curl/push-up travel is measured from the last start pose, including the initial movement interval.
- Per-finding commits: delayed arrival `8d116e5`; stop/export `22ee1a0`; rewind `ca6a6ea`; start-pose travel `acf05d0`. The final combined browser suite exposed an initial-video-load race in the rewind test; follow-up `26139e4` waits for decoded data before calling play. All are pushed to M2 and merged into M3.
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

## M1 started — blocked on Anthropic authentication

- Branch `devin/1795212712-m1-agent` created from the M0 branch. Installed pinned M1 packages and verified `managed-deepagents@0.10.5` (not 0.0.2); read the installed README and init CLI help. Zod pinned to 4.6.7 after npm audit flagged 4.3.6; updated install reports 0 vulnerabilities.
- Anthropic `GET /v1/models` returned HTTP 401, `authentication_error: invalid x-api-key`, both with the inherited environment and an explicitly bound org ANTHROPIC_API_KEY. Request ID for explicit binding: `req_011ChEwvL9KCh3GpFxpwWi8R`. This blocks model selection, real agent turns, memory tests and the latency gate. No model fallback can resolve authentication failure.
- LANGSMITH_API_KEY was explicitly bound; LangSmith `/info` returned HTTP 200 (this endpoint alone does not establish workspace authorization).
- Per the standing missing-secret rule, stopped before scaffolding/deployment rather than incurring deployment changes with an unusable model credential. No ingress secret generated, no agent deployment, no droplet changes, no smoke measurements, and no commit or push yet. Dependency and status changes remain local pending a working Anthropic credential.

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

## M4 — Voice

Implemented on `devin/1795223903-m4-voice`, based on M1. The existing M1 latency
gate remains failed and unchanged; M4 makes no Anthropic calls.

- `/api/tts`: authenticated streaming PCM proxy, configured voice/model, model-error
  fallback to `eleven_flash_v2_5`. SHA-256(text, voice, actual model) cache:
  process-local 16 MiB LRU, 24-hour sliding retention; partial/failed streams are
  not cached. Model fallback resolution is remembered for five minutes.
- `/api/stt-token`: authenticated, no-store, single-use `realtime_scribe` token;
  provider contract expires unused tokens after 900 seconds.
- Invite success now issues a signed HttpOnly, SameSite=Strict cookie (Secure in
  production), using the existing `SESSION_SECRET`. Billable voice routes require
  it and reject cross-origin browser requests. Local HTTP E2E seeds the returned
  signed cookie without its HTTPS-only flag; deployed cookies retain Secure.
- One shared AudioContext, unlocked by the invite tap or lab Enable audio gesture;
  gain and output analyser, mic analyser, track-level half-duplex, playback session
  type after setup, silent looping HTML audio fallback where audioSession is absent.
  Scribe uses `@elevenlabs/react@1.23.1` with VAD, `scribe_v3_live`, and a fresh-token
  `scribe_v2_realtime` fallback on model errors. Its manual-audio mode receives
  16 kHz PCM from the SDK worklet in the existing context, avoiding a second context.
- One real ElevenLabs Orb, manual volumes from both analysers; idle, thinking,
  listening (only after capture opens), talking. `/lab/voice` provides text speech,
  live/committed transcript, countdown, meters, TTFA, and an event ledger.
- Speech queue: one active and one pending item; 3.5-second end-to-start in-set
  gap, 14-word cap, >3-second stale drop, newer-rep fault-clear drop. Freshness is
  checked again before scheduling first PCM after network preparation. Priority
  wins pending arbitration; newest replaces within equal priority. Active lines,
  including fixed countdown/milestones, are never interrupted by another line.
- Fixed onboarding/setup/transition/milestone lines are prefetched. Countdown clips
  are scheduled one second apart on the AudioContext clock, with matching screen
  numerals; clips longer than 0.95 s are time-compressed to avoid overlap.
- `/api/voice-events` traces utterance outcomes/reasons/TTFA and committed transcripts
  with the UUID-v7 lab session ID, then flushes. The client ledger tracks server
  acknowledgments. `scripts/audit-voice.mts` independently checks LangSmith run IDs.

### Desktop evidence

Real generated WAV (`evals/fixtures/voice/known-phrase.wav`), fake microphone capture,
real single-use token and real Scribe WebSocket; no transcript mocking:

```text
Expected: I would like a full body workout.
Actual:   I would like a full body workout.
Voice trace audit: PASS (7/7 event IDs, 7 root runs).
```

Session: `01a1fbca-bc9c-773c-8811-18f65a5a4ff4`, six played utterances and one VAD
commit. The browser test also verifies one AudioContext and ended mic tracks after
Setup. An intentionally absent eighth ID produces the expected negative audit:
`FAIL (7/8 event IDs, 7 root runs)` with the missing sentinel explicitly listed.

TTFA is TTS-play invocation to first nonzero output-analyser samples, not an
acoustic speaker measurement. Desktop headless Chrome against the local production
Next server and real ElevenLabs, after fixed prefetch; three samples per cache state:

| Server cache | p50 | Maximum |
|---|---:|---:|
| Miss | 337.8 ms | 350.3 ms |
| Hit | 53.9 ms | 54.8 ms |

Evidence under `/home/ubuntu/jax-evidence/m4/`: `voice-results.json`,
`trace-audit.json`, `trace-audit-negative.json`, `voice-lab-390x844.png` (visually
inspected, 390×844). No audio is sent to LangSmith.

### Checks

Lint and web/agent typechecks exited 0. Unit tests cover governor, queue, token,
stream/cache/fallback, invite access, microphone lifetime, and trace acknowledgment.

```text
Test Files  8 passed (8)
     Tests  121 passed (121)
✓ Compiled successfully in 1587ms
✓ Generating static pages using 7 workers (9/9) in 164ms
```

The full E2E run passed existing invite, rewind, and fake-camera regressions. Both
new voice tests initially exposed a test-harness bug reading innerText from a closed
details element; fixed to textContent. Final focused voice rerun:

```text
✓ voice lab uses actual Web Audio and one orb; cached countdown is uninterrupted (7.5s)
✓ real realtime Scribe transcribes fake WAV; streaming TTS reports miss/hit TTFA (42.7s)
2 passed (51.0s)
Browser secret scan: PASS (17 static assets; no bound ElevenLabs/LangSmith or local key/secret bytes).
```

Live E2E is explicitly skipped without ElevenLabs AND LangSmith credentials; the
offline Web Audio/countdown test always runs. Dependency check verified MDA 0.10.5
and React voice SDK 1.23.1. All new direct dependencies are exact-pinned.

### Deployment

Rebuilt/recreated only `jax-web` on `noa_edge`, restart `unless-stopped`. Refreshed
the three existing ElevenLabs variables using the explicitly bound org credential;
no new variable names were needed. Preserved `/opt/jax/.env` mode 600 and all other
variables, including M1. Other container IDs were unchanged. Verification from VM:

```text
Container /api/health: HTTP 200
Public /api/health: HTTP 200 {"status":"ok"}
Public /lab/voice: HTTP 200, Voice lab present
Public unauthenticated /api/tts: HTTP 401
Public invited /api/tts: HTTP 200, PCM bytes=30720, model=eleven_v4_turbo
Public /api/stt-token: HTTP 200, single-use token present, expires_in=900
strongr: HTTP 200
```

### Deviations / remaining QA

- Shadcn init cannot detect the nonstandard `web/` layout: used its documented
  manual configuration. ElevenLabs CLI was invoked but its registry returned 429;
  installed the same official MIT Orb from upstream commit
  `1909af6b522dc97f2ec8f49230be2e9a1a7f6e7e`, with licenses/provenance. Adapted
  imperative scene ownership for existing React lint rules; no rules disabled.
- Cache is in-process, not distributed or persistent across restarts. TTFA above
  is local-proxy desktop timing, not the deployed droplet or iPhone audio route.
- Agent wiring and agent-timeout fallback (PLAN 9.4) belong to M6; full-session
  ledger/audit integration remains M7. This milestone has a voice-specific audit.
- iPhone silent switch, earpiece/speaker routing, Bluetooth, interruptions and
  real permission prompts remain unverified and require Raz's M9 checklist.
- The upstream Orb shader retains five trailing-whitespace warnings; first-party
  diff whitespace checks are clean. Shader bytes were otherwise preserved.

### PR #5 review follow-up

Confirmed review baseline HEAD `231f8bb3`; all three findings reproduced with
failing-first tests and were fixed in separate commits:

- Failed AudioWorklet downloads now clear the rejected cached promise. Regression
  covers failure releasing tracks, a successful retry, and reuse of that success.
- Voice Lab now displays committed history plus the current partial, rather than
  hiding all later partials. Browser regression drives mocked Scribe WebSocket
  messages through the real hook and checks empty, committed, partial and next
  committed states. Before the fix it received only `Full body please.` instead
  of `Full body please. My shoulder`.
- Each TTS playback owns its fetch AbortController, forwards caller cancellation,
  cancels/releases its response reader and aborts its request in finally. A stale
  pre-audio rejection retains the original drop reason and does not abort the
  caller or shared prefetch. Tests cover stale rejection, empty stream, caller
  cancellation and reuse of cached clips. Before the fix reader cancellation was
  never called, its lock remained held, and the request signal was not aborted.

Lint and web/agent typechecks exited 0; final local checks:

```text
Test Files  9 passed (9)
     Tests  126 passed (126)
✓ Compiled successfully in 1537ms
✓ Generating static pages using 7 workers (9/9) in 163ms
2 passed (8.9s)
1 skipped
```

The focused voice E2E run skips the live-provider case without credentials, just
as CI does; no new real-provider measurements were made in this review loop.
Partial transcript screenshot visually inspected at 390×844:
`/home/ubuntu/jax-evidence/m4-review/partial-transcript-390x844.png`.
Review fixes are pushed for CI only, not redeployed. Real-device QA remains open.
