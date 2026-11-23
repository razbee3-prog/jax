# Jax M8 evals

Requires Node 22+, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `ANTHROPIC_API_KEY`, `JAX_BASE_URL` (HTTPS outside localhost), and `INVITE_CODE`. Keep credentials in the environment, never in dataset inputs or command arguments.

```sh
npm run evals
npm run evals -- --suite=coach --label=baseline
npm run evals -- --suite=coach --label=targeted --case=rdl_knee_squat-third
npm run evals -- --suite=sessions --label=desktop-proof
npm run evals:online
```

Default `evals` runs the existing perception experiments plus both M8 datasets. A subset is labeled incomplete coverage and cannot satisfy the final bar. Failed bars set a nonzero exit status. Summary JSON lives in `evals/results/m8`; detailed candidates, browser ledgers and screenshots live under `~/jax-evidence/m8/<label>` (`EVAL_OUTPUT_DIR` and `EVAL_EVIDENCE_DIR` override these locations). Screenshots mask inputs and are taken only after invitation succeeds.

## Scope and safety

- `jax-coach-decisions`: 78 synthetic contract examples covering all 15 potential Tier-A faults, every Tier-B fault, provisional and poor-quality reports, priorities, caps, corrected faults, clean streaks, spoken rest/summary, injury memory and messy onboarding. Counterfactual `validation=validated` flags test the contract; they **do not** validate a detector or unlock speech. Detector evidence and thresholds are unchanged.
- The target authenticates via `/api/invite`, uses the signed identity and `/api/coach`, and replays real history against the deployed agent. Injury seed/healed/recall scenarios use real onboarding writes and the same identity across distinct threads, never direct memory injection. Every evaluation thread closes a fixture ledger and audits it, avoiding abandoned evaluation threads in the daily sweep.
- Raw rep decisions must be silent. Recorded responses are also replayed through the real `HybridCoach`, `SerialCoach` and `SpeechQueue` to check immediate/future cue behavior and caps. Playback in this **offline policy replay** is simulated at an 8-second cadence; it is not a voice latency measurement. Real asynchronous deadlines, coalescing and stale guidance are exercised by existing hybrid tests and the full-session target.
- The third-cue cap counts effective corrective speech, not an unspoken focus directive. Prose and fault IDs remain gated to validated Tier-A reports even at set end; a flagged but ineligible fault is not permission to name it.
- In-set wording is closed to the approved bank, an eligible flagged ID and a single focus. Non-rep prose checks use explicit fault-name/claim aliases; they distinguish a generic setup instruction from claiming an observed error. They are deterministic checks, not a proof of arbitrary natural-language semantics. The written judge rubric complements them; inspect failed examples rather than weakening the checks.
- The judge uses **`claude-haiku-5-5`**, not a stronger model. Silence is not penalized. All four 1–5 dimensions and explanations are recorded; the bar is mean ≥4 with every example judged.
- `jax-session-sim`: two complete 40-rep production-client sessions with demo clips as a local webcam, scripted chip input, real ElevenLabs playback/cache/governor, real telemetry and real LangSmith audit. The outage case intercepts only `/api/coach` with HTTP 502. It does not fake TTS, telemetry or the audit. STT is explicitly excluded from chip-input sessions.
- Session gates use **played**, not merely proposed, cues; every set must be 25–55%. Latency uses actual browser output-volume-meter onset minus local rep completion, including queue delay; missing samples cannot pass. No second in-set line may start until at least 3.5 seconds after the previous line ended. A real thumb click is independently read back on the actual `session.end` run.
- Desktop output-meter latency is **not iPhone acoustic latency**. PLAN §2 criterion 4's real-phone claim stays unverified until Raz performs phone QA. Neither the M1 gate nor device routing is declared fixed by these experiments.

## Online evaluation

`npm run evals:online` uses the published LangSmith run-rule API, idempotently scoped to this tracing project and `coach.request`. It installs self-contained JavaScript generated from the current decision JSON Schema, word-cap checks and latency scores. The four-second score is the hybrid turn deadline, **not** the 2.5-second rep-to-audio bar. No model or network call runs inside an online evaluator. It saves the exact code, payload and any API blocker in the results directory; a blocked API must be reported, not silently treated as installed. Existing `coaching_helpful` feedback remains on `/api/session/feedback` and is verified by session simulation.

The saved `.mjs` artifact adds a named export for local inspection; the hosted payload contains the plain `perform_eval` function, as required by the online sandbox.

Agent tuning edits `agent/coaching-short.md` (the deployed trim profile) and its full-profile counterpart as needed; run `npm run agent:deploy` to sync source/catalog/bank and redeploy. Record each before/after experiment and reason in STATUS. Do not alter detector thresholds or Tier-B gates to improve scores.
