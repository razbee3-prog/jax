export async function holdWakeLock() {
  let lock: WakeLockSentinel | undefined;
  let stopped = false;
  const acquire = async () => {
    if (stopped || document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
    try { lock = await navigator.wakeLock.request("screen"); if (stopped) await lock.release(); } catch {}
  };
  document.addEventListener("visibilitychange", acquire);
  await acquire();
  return () => { stopped = true; document.removeEventListener("visibilitychange", acquire); void lock?.release(); };
}
