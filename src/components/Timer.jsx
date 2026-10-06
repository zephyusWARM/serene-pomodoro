import React, { useState, useEffect, useRef } from 'react';
import useWindowVisible from '../hooks/useWindowVisible';
import './Timer.css';

// SVG params (viewBox 240, drawn at 224px): r=110, circumference = 2π×110 ≈ 691.15
const RADIUS = 110;
const CIRC = 2 * Math.PI * RADIUS;
// Redraw once the arc tip has moved this far (in device pixels): below what anti-aliasing can show.
const RING_STEP_DEVICE_PX = 0.1;
const FRAME_MS = 1000 / 60;

// ── Curated Health & Life Quotes ──
const BREAK_QUOTES = [
  // Health & Longevity
  { category: 'health', main: 'Your body is the vessel for every dream you\'ll ever chase.', sub: 'Treat it like the miracle it is.' },
  { category: 'health', main: 'Health is the crown only the sick can see.', sub: 'Guard it fiercely.' },
  { category: 'health', main: 'Sleep, water, movement, sunlight.', sub: 'The four pillars of a life well-lived.' },
  { category: 'health', main: 'You can\'t pour from an empty cup.', sub: 'Rest is not laziness — it\'s strategy.' },

  // Loved Ones & Connection
  { category: 'love', main: 'The people who love you need you healthy, present, and alive.', sub: 'Show up for them by caring for yourself.' },
  { category: 'love', main: 'No success is worth the price of a broken relationship.', sub: 'Nurture your bonds.' },
  { category: 'love', main: 'One day you\'ll look back and the small moments were the big ones.', sub: 'Be present for your people.' },
  { category: 'love', main: 'Your energy is a gift to everyone around you.', sub: 'Protect it. Recharge it.' },

  // Mission & Flow
  { category: 'mission', main: 'Deep work is the superpower of the 21st century.', sub: 'Protect your focus like your most precious asset.' },
  { category: 'mission', main: 'The magic you\'re looking for is in the work you\'re avoiding.', sub: 'But first, breathe.' },
  { category: 'mission', main: 'Flow state is where genius lives.', sub: 'Build the conditions. Trust the process.' },
  { category: 'mission', main: 'Discipline equals freedom.', sub: 'This break is part of the system.' },

  // Long-term Thinking
  { category: 'vision', main: 'The compound effect: small daily choices create extraordinary results.', sub: 'Play the long game.' },
  { category: 'vision', main: 'In 10 years, today is the day you\'ll wish you started.', sub: 'You already did. Keep going.' },
  { category: 'vision', main: 'Think in decades. Act in days.', sub: 'This moment is an investment in your future self.' },
  { category: 'vision', main: 'The best time to plant a tree was 20 years ago. The second best is now.', sub: 'Every break fuels the next breakthrough.' },
];


const getRandomQuote = (excludeIndex) => {
  let idx;
  do {
    idx = Math.floor(Math.random() * BREAK_QUOTES.length);
  } while (idx === excludeIndex && BREAK_QUOTES.length > 1);
  return idx;
};

const Timer = ({ minutes, seconds, mode, isActive, totalDuration, remainingMs }) => {
  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');

  const ringCircleRef = useRef(null);
  const orbRef = useRef(null);
  const orbGlowRef = useRef(null);
  const windowVisible = useWindowVisible();

  // When the latest authoritative value arrived (or counting started from it). Effects re-run for
  // other reasons (visibility, duration) must not re-date it.
  const anchorRef = useRef({ remaining: remainingMs, at: 0 });
  useEffect(() => {
    anchorRef.current = { remaining: remainingMs, at: performance.now() };
  }, [remainingMs, isActive]);

  // Progress ring renderer.
  // Previously a requestAnimationFrame loop ran forever — paused, idle or hidden in the tray — which
  // on its own kept the window producing a new frame every display refresh. The ring position is now
  // extrapolated from the latest authoritative countdown value (exact at any instant instead of eased
  // toward it) and written only when the arc tip has moved by a sub-perceptual step, a fraction of a
  // device pixel: a 25-minute session advances the tip ~0.03 px per frame. Short sessions move faster
  // and fall back to every animation frame. Paused or hidden, a single draw per change keeps it correct.
  useEffect(() => {
    const { remaining: anchorRemaining, at: anchorTime } = anchorRef.current;
    let rafId = 0;
    let timeoutId = 0;
    let lastOffset = null;
    let lastOrb = null;

    const draw = () => {
      rafId = 0;
      const display = isActive
        ? Math.max(0, anchorRemaining - (performance.now() - anchorTime))
        : anchorRemaining;

      const p = Math.min(100, Math.max(0, ((totalDuration - display) / totalDuration) * 100));
      const off = CIRC - (CIRC * p) / 100;

      if (off !== lastOffset) {
        lastOffset = off;
        if (ringCircleRef.current) ringCircleRef.current.style.strokeDashoffset = off;
      }

      // Position leading orb at the moving stroke tip
      if (orbRef.current && orbGlowRef.current) {
        if (p < 99.8) {
          const angle = (p / 100) * 2 * Math.PI;
          const orbX = (120 + RADIUS * Math.cos(angle)).toFixed(2);
          const orbY = (120 + RADIUS * Math.sin(angle)).toFixed(2);
          const orbKey = `${orbX},${orbY},${isActive}`;
          if (orbKey !== lastOrb) {
            lastOrb = orbKey;
            orbRef.current.setAttribute('cx', orbX);
            orbRef.current.setAttribute('cy', orbY);
            orbRef.current.style.opacity = '1';

            orbGlowRef.current.setAttribute('cx', orbX);
            orbGlowRef.current.setAttribute('cy', orbY);
            orbGlowRef.current.style.opacity = isActive ? '1' : '0.55';
          }
        } else if (lastOrb !== 'hidden') {
          lastOrb = 'hidden';
          orbRef.current.style.opacity = '0';
          orbGlowRef.current.style.opacity = '0';
        }
      }

      // Hidden: one draw per countdown tick keeps the ring current for the moment it is shown again,
      // without any sub-second redraws.
      if (isActive && windowVisible && display > 0) schedule();
    };

    const schedule = () => {
      const devicePxPerMs = (CIRC / totalDuration) * (window.devicePixelRatio || 1);
      const wait = RING_STEP_DEVICE_PX / devicePxPerMs;
      if (wait <= FRAME_MS) {
        rafId = requestAnimationFrame(draw);
      } else {
        timeoutId = setTimeout(() => { rafId = requestAnimationFrame(draw); }, wait);
      }
    };

    draw();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isActive, totalDuration, remainingMs, windowVisible]);

  const [quoteIndex, setQuoteIndex] = useState(() => getRandomQuote(-1));
  const [fadeState, setFadeState] = useState('in'); // 'in' | 'out'
  const [prevMode, setPrevMode] = useState(mode);
  const rotationRef = useRef(null);

  // Pick new quote when entering break mode during render
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (mode !== 'focus' && prevMode === 'focus') {
      setQuoteIndex(getRandomQuote(-1));
      setFadeState('in');
    }
  }

  // Rotate quotes every 30 seconds during break
  useEffect(() => {
    if (mode !== 'focus' && isActive) {
      rotationRef.current = setInterval(() => {
        setFadeState('out');
        setTimeout(() => {
          setQuoteIndex(prev => getRandomQuote(prev));
          setFadeState('in');
        }, 500); // wait for fade-out, then switch
      }, 30000);
    }

    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [mode, isActive]);

  const quote = BREAK_QUOTES[quoteIndex];

  return (
    <div
      className="timer-container"
      data-mode={mode}
      data-active={String(isActive)}
    >
      <svg
        className="progress-ring"
        width="224"
        height="224"
        viewBox="0 0 240 240"
        aria-hidden="true"
      >
        <defs>
          {/* The light that travels with the countdown: accent at the core, nothing at the edge. */}
          <radialGradient id="tipLight">
            <stop className="tip-light-core" offset="0%" />
            <stop className="tip-light-edge" offset="100%" />
          </radialGradient>
        </defs>
        <circle
          className="progress-ring-bg"
          cx="120" cy="120" r={RADIUS}
        />
        <circle
          ref={ringCircleRef}
          className="progress-ring-circle"
          cx="120" cy="120" r={RADIUS}
        />
        <circle
          ref={orbGlowRef}
          className="progress-ring-orb-glow"
          cx="230" cy="120" r="50"
          fill="url(#tipLight)"
        />
        <circle
          ref={orbRef}
          className="progress-ring-orb"
          cx="230" cy="120" r="5"
        />
      </svg>

      <div className="timer-display">
        <div className="time">
          <span className="time-digits">{minStr}</span>
          <span className={`time-colon ${isActive ? 'is-pulsing' : ''}`}>:</span>
          <span className="time-digits">{secStr}</span>
        </div>
        {mode !== 'focus' && (
          <div className={`break-quote quote-${fadeState}`} key={quoteIndex}>
            <div className="quote-main">{quote.main}</div>
            <div className="quote-sub">{quote.sub}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timer;
