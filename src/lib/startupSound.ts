// Short generated chime via WebAudio. No asset needed.
export async function playStartupChime() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* autoplay blocked */ }
    }
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.5);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // silent
  }
}
