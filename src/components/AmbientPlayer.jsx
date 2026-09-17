import { useEffect, useRef } from 'react';

/**
 * AmbientPlayer — Web Audio API synthesis
 * Rain  : low-pass white noise
 * Forest: brownian noise + bandpass
 * Café  : mid-range bandpass noise
 *
 * To swap in real MP3s later, replace createNoiseNodes()
 * with: audio.src = '/sounds/rain.mp3'; audio.loop = true;
 */

const FADE_MS = 900;

function createNoiseNodes(ctx, type) {
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'rain') {
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'forest') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else { // cafe
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);

  if (type === 'rain') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1600; lp.Q.value = 0.3;
    src.connect(lp); lp.connect(gain);
  } else if (type === 'forest') {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    src.connect(bp); bp.connect(lp); lp.connect(gain);
  } else { // cafe — warmer band
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 1.0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    src.connect(bp); bp.connect(lp); lp.connect(gain);
  }

  return { src, gain };
}

const TARGET_VOL = { rain: 0.22, forest: 0.18, cafe: 0.14 };

const AmbientPlayer = ({ sound }) => {
  // Single ref holds all live audio state
  const stateRef = useRef({ ctx: null, src: null, gain: null, fadeTimer: null });

  useEffect(() => {
    const s = stateRef.current;

    // — Cancel any pending fade timer —
    if (s.fadeTimer) { clearTimeout(s.fadeTimer); s.fadeTimer = null; }

    // — Stop previous node (hard stop after fade) —
    if (s.gain && s.ctx) {
      const now = s.ctx.currentTime;
      s.gain.gain.cancelScheduledValues(now);
      s.gain.gain.setValueAtTime(s.gain.gain.value, now);
      s.gain.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
      const prevSrc = s.src;
      s.fadeTimer = setTimeout(() => {
        try {
          prevSrc.stop();
        } catch {
          // ignore already stopped audio
        }
      }, FADE_MS + 50);
    }
    s.src = null; s.gain = null;

    // — Silence mode: just fade out above, done —
    if (!sound || sound === 'none') return;

    // — Create / resume AudioContext —
    if (!s.ctx || s.ctx.state === 'closed') {
      s.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = s.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    // — Build new noise node —
    const { src, gain } = createNoiseNodes(ctx, sound);
    gain.connect(ctx.destination);
    src.start(0, Math.random() * 2);

    // Fade in
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(TARGET_VOL[sound] ?? 0.18, now + FADE_MS / 1000);

    s.src = src; s.gain = gain;

    // Cleanup runs when sound changes or component unmounts
    return () => {
      if (s.fadeTimer) {
        clearTimeout(s.fadeTimer);
        s.fadeTimer = null;
      }
      if (s.gain && s.ctx) {
        const t = s.ctx.currentTime;
        s.gain.gain.cancelScheduledValues(t);
        s.gain.gain.setValueAtTime(s.gain.gain.value, t);
        s.gain.gain.linearRampToValueAtTime(0, t + 0.5);
        const dying = s.src;
        setTimeout(() => {
          try {
            dying.stop();
          } catch {
            // ignore
          }
        }, 600);
      }
    };
  }, [sound]);

  return null;
};

export default AmbientPlayer;
