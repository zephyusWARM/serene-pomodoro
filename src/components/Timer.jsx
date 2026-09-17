import React, { useState, useEffect, useRef } from 'react';
import { FocusIcon, ShortBreakIcon, LongBreakIcon, SparkleIcon } from './Icons';
import './Timer.css';

// SVG params: r=110, circumference = 2π×110 ≈ 691.15
const RADIUS = 110;
const CIRC = 2 * Math.PI * RADIUS;

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

const CATEGORY_ICONS = {
  health: ShortBreakIcon,
  love: SparkleIcon,
  mission: FocusIcon,
  vision: LongBreakIcon,
};

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

  // Refs for rAF loop
  const ringGlowRef = useRef(null);
  const ringCircleRef = useRef(null);
  const orbRef = useRef(null);
  const orbGlowRef = useRef(null);
  const rafRef = useRef(null);
  const displayRemainingRef = useRef(remainingMs);
  const authoritativeRemainingRef = useRef(remainingMs);

  // Always keep authoritative remaining up to date
  useEffect(() => {
    authoritativeRemainingRef.current = remainingMs;
  }, [remainingMs]);

  // ProMotion 60/120fps rendering loop
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = now - lastTime;
      lastTime = now;

      if (isActive) {
        // Linearly decrease visual time
        displayRemainingRef.current = Math.max(0, displayRemainingRef.current - dt);

        // Soft-sync with authoritative React state (useTimer)
        const diff = displayRemainingRef.current - authoritativeRemainingRef.current;
        if (Math.abs(diff) > 500) {
          // Snap if huge jump (e.g. wake from sleep or slider dragged)
          displayRemainingRef.current = authoritativeRemainingRef.current;
        } else {
          // Micro-correction (lerp)
          displayRemainingRef.current -= diff * 0.05;
        }
      } else {
        // Paused -> precisely match
        displayRemainingRef.current = authoritativeRemainingRef.current;
      }

      const p = Math.min(100, Math.max(0, ((totalDuration - displayRemainingRef.current) / totalDuration) * 100));
      const off = CIRC - (CIRC * p) / 100;

      if (ringGlowRef.current) ringGlowRef.current.style.strokeDashoffset = off;
      if (ringCircleRef.current) ringCircleRef.current.style.strokeDashoffset = off;

      // Position leading orb at the moving stroke tip
      if (orbRef.current && orbGlowRef.current) {
        if (p > 0.3 && p < 99.8) {
          const angle = (p / 100) * 2 * Math.PI;
          const orbX = (120 + RADIUS * Math.cos(angle)).toFixed(2);
          const orbY = (120 + RADIUS * Math.sin(angle)).toFixed(2);

          orbRef.current.setAttribute('cx', orbX);
          orbRef.current.setAttribute('cy', orbY);
          orbRef.current.style.opacity = '1';

          orbGlowRef.current.setAttribute('cx', orbX);
          orbGlowRef.current.setAttribute('cy', orbY);
          orbGlowRef.current.style.opacity = isActive ? '0.85' : '0.45';
        } else {
          orbRef.current.style.opacity = '0';
          orbGlowRef.current.style.opacity = '0';
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, totalDuration]);
  
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
  const QuoteIconComponent = CATEGORY_ICONS[quote.category] || SparkleIcon;

  return (
    <div
      className="timer-container"
      data-mode={mode}
      data-active={String(isActive)}
    >
      <svg
        className="progress-ring"
        width="240"
        height="240"
        viewBox="0 0 240 240"
      >
        <defs>
          <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#4facfe" />
          </linearGradient>
          <linearGradient id="focusGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38ef7d" />
            <stop offset="50%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#4facfe" />
          </linearGradient>
          <linearGradient id="shortBreakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe259" />
            <stop offset="100%" stopColor="#ffa751" />
          </linearGradient>
          <linearGradient id="longBreakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b89af5" />
            <stop offset="50%" stopColor="#d1a3ff" />
            <stop offset="100%" stopColor="#00f2fe" />
          </linearGradient>
        </defs>
        <circle
          className="progress-ring-bg"
          cx="120" cy="120" r={RADIUS}
        />
        <circle
          ref={ringGlowRef}
          className="progress-ring-glow"
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
          cx="230" cy="120" r="7"
        />
        <circle
          ref={orbRef}
          className="progress-ring-orb"
          cx="230" cy="120" r="3"
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
            <div className="quote-icon-badge">
              <QuoteIconComponent size={13} />
            </div>
            <div className="quote-main">{quote.main}</div>
            <div className="quote-sub">{quote.sub}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timer;
