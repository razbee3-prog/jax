"use client";
import { useRef, useState } from "react";
export default function Home() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!audio.current) audio.current = new AudioContext();
    void audio.current.resume().catch(() => {});
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (response.ok) setAccepted(true);
      else { setAttempt(n => n + 1); setError(response.status === 401 ? "That code didn't work." : "Jax is unavailable. Please try again."); }
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <main><section aria-labelledby="title">
    <div className="orb" aria-hidden="true" />
    <h1 id="title">Jax</h1><p className="subtitle">Your AI personal trainer</p>
    {accepted ? <p role="status">You&apos;re on the list. Coaching is coming soon.</p> :
    <form onSubmit={submit}>
      <label htmlFor="invite">Enter invite code to get started</label>
      <input key={attempt} className={error ? "shake" : ""} id="invite" name="code" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Invite code" required aria-invalid={!!error} aria-describedby="error" />
      <button disabled={busy}>{busy ? "Checking…" : "Get started"}</button>
      <p id="error" className="error" role="alert">{error}</p>
    </form>}
    <p className="disclaimer">Jax is not medical advice. Stop if anything hurts.</p>
  </section></main>;
}
