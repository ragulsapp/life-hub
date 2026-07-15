/**
 * Alarm sound. Plays a user-supplied audio clip on loop when given a Blob,
 * otherwise falls back to a generated Web Audio siren — both work offline.
 */
let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
let lfoTimer: number | null = null;

let audioEl: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

function startSiren() {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  ctx = new AudioCtx();
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
    if (!osc || !ctx) return;
    high = !high;
    osc.frequency.setValueAtTime(high ? 880 : 620, ctx.currentTime);
  }, 400);
}

/** Start ringing. Pass a Blob to play custom audio, or omit for the siren. */
export function startAlarmSound(blob?: Blob | null) {
  if (osc || audioEl) return; // already ringing

  if (blob) {
    audioUrl = URL.createObjectURL(blob);
    audioEl = new Audio(audioUrl);
    audioEl.loop = true;
    audioEl.volume = 1;
    audioEl.play().catch(() => {
      // Autoplay blocked or unsupported format — fall back to the siren.
      stopAlarmSound();
      startSiren();
    });
    return;
  }

  startSiren();
}

export function stopAlarmSound() {
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
  if (ctx) {
    ctx.close();
    ctx = null;
  }
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

/** Preview an audio clip once (for the sound picker). Returns a stop fn. */
export function previewSound(blob: Blob): () => void {
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  el.play().catch(() => {});
  return () => {
    el.pause();
    URL.revokeObjectURL(url);
  };
}

export function vibrate() {
  if ("vibrate" in navigator) {
    navigator.vibrate([400, 200, 400, 200, 400]);
  }
}
