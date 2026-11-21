# ElevenLabs UI Orb

Source: https://github.com/elevenlabs/ui, commit
`1909af6b522dc97f2ec8f49230be2e9a1a7f6e7e`,
`apps/www/registry/elevenlabs-ui/ui/orb.tsx`, MIT (license alongside).
Compatibility changes: self-hosted noise texture URL; deterministic default
seed; initial colors held in state; an owned/disposed texture instead of
mutating the loader's shared texture; imperative material updates extracted
to `orbAnimation.ts`. These satisfy the existing React hooks lint rules without
disabling them. The upstream shader and volume-driven behavior are retained.

The CLI registry returned HTTP 429. This is the same official component, copied
from the upstream repository using its registry dependency list. Shadcn is
manually configured because its initializer does not detect this repository's
nonstandard `web/` app layout.

The Scribe microphone worklet in `public/audio/` comes from MIT-licensed
`@elevenlabs/client@1.37.1` (resolved by `@elevenlabs/react@1.23.1`). It is unchanged
apart from an ESLint browser-global declaration. It runs in the app's existing
AudioContext, with PCM supplied to `useScribe`'s manual-audio mode; the SDK's
default microphone path would create a second AudioContext.
