# Synthetic microphone fixture

`known-phrase.wav` says **I would like a full body workout.** It is generated
speech, not a recording of a user. Voice `SYXbTJsLE7zmSjr1DchT`, model
`eleven_v4_turbo`; 16 kHz mono PCM WAV, two seconds of leading silence and four
seconds of trailing silence to exercise server-side VAD commitment.

Regenerate with `ELEVENLABS_API_KEY` explicitly bound, then
`node scripts/generate-voice-fixture.mjs`. The script prints no credentials.
The live Playwright test compares words ignoring punctuation and case; it does
not mock the microphone, token endpoint, WebSocket, or transcription result.
Without ElevenLabs and LangSmith credentials that test is explicitly skipped;
the offline Web Audio/queue test still runs.
