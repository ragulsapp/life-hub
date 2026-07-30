/**
 * Alarm sound. Plays a user-supplied audio clip on loop when given a Blob,
 * otherwise a generated Web Audio siren — both work fully offline.
 *
 * Autoplay policy (audit H1): browsers may refuse to start audio without a
 * user gesture. We keep ONE shared AudioContext, resumed on the app's first
 * gesture via installAudioUnlock(), and startAlarmSound() reports whether
 * sound is actually audible so the UI can show a "tap for sound" fallback.
 */
let sharedCtx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
let lfoTimer: number | null = null;

let audioEl: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

/**
 * Register once at app start: the first user gesture unlocks the shared
 * AudioContext so scheduler-fired alarms can ring without a fresh gesture.
 */
export function installAudioUnlock(): void {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

async function startSiren(): Promise<boolean> {
  const ctx = getCtx();
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => {});
  }
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.4);
  let high = true;
  lfoTimer = window.setInterval(() => {
    if (!osc || !sharedCtx) return;
    high = !high;
    osc.frequency.setValueAtTime(high ? 880 : 620, sharedCtx.currentTime);
  }, 400);
  return ctx.state === "running";
}

function cleanupAudioEl() {
  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
    audioEl = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
}

/** Loop an audio source. Falls back to the siren if playback is refused. */
async function startFromUrl(url: string, revoke: boolean): Promise<boolean> {
  audioUrl = revoke ? url : null;
  audioEl = new Audio(url);
  audioEl.loop = true;
  audioEl.volume = 1;
  try {
    await audioEl.play();
    return true;
  } catch {
    // Autoplay blocked or unsupported format — fall back to the siren.
    cleanupAudioEl();
    return startSiren();
  }
}

/**
 * Start ringing. An uploaded Blob wins; otherwise a bundled tone if one is
 * chosen; otherwise the generated siren.
 *
 * Resolves true if sound is audibly playing, false if blocked by autoplay
 * policy (caller should surface a tap-to-unmute affordance).
 */
export async function startAlarmSound(
  blob?: Blob | null,
  builtInUrl?: string | null,
): Promise<boolean> {
  if (osc || audioEl) return true; // already ringing

  if (blob) return startFromUrl(URL.createObjectURL(blob), true);
  if (builtInUrl) return startFromUrl(builtInUrl, false);
  return startSiren();
}

export function stopAlarmSound(): void {
  if (lfoTimer) {
    clearInterval(lfoTimer);
    lfoTimer = null;
  }
  try {
    osc?.stop();
  } catch {
    /* already stopped */
  }
  osc?.disconnect();
  gain?.disconnect();
  osc = null;
  gain = null;
  // Keep sharedCtx alive — closing would re-suspend and lose the unlock.
  cleanupAudioEl();
}

/** Preview an audio clip (for the sound picker). Returns a stop fn. */
export function previewSound(blob: Blob): () => void {
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  el.play().catch(() => {});
  return () => {
    el.pause();
    URL.revokeObjectURL(url);
  };
}

/** Play a bundled tone once, so the user can hear what they're picking. */
export function previewUrl(url: string): () => void {
  const el = new Audio(url);
  el.play().catch(() => {});
  return () => el.pause();
}

export function vibrate(): void {
  if ("vibrate" in navigator) {
    navigator.vibrate([400, 200, 400, 200, 400]);
  }
}
