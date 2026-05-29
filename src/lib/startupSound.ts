export function playStartupChime() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

  function note(freq: number, startTime: number, duration: number, volume: number) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    osc2.frequency.setValueAtTime(freq * 2.01, ctx.currentTime + startTime);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(volume * 0.6, ctx.currentTime + startTime + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.start(ctx.currentTime + startTime);
    osc2.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration + 0.05);
    osc2.stop(ctx.currentTime + startTime + duration + 0.05);
  }

  note(523,  0.00, 0.18, 0.22);  // C5
  note(659,  0.16, 0.18, 0.22);  // E5
  note(784,  0.32, 0.18, 0.22);  // G5
  note(1047, 0.48, 0.55, 0.20);  // C6
}
