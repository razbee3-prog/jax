# Jax status — M0 bootstrap

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
