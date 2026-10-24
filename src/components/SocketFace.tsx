import { useId } from 'react';
import type { Mood } from '@/logic/panic';

export type FaceMood = Mood | 'loading' | 'dead';

interface Props {
  mood: FaceMood;
  poked?: boolean;
  size?: number;
  /** Mr. Grey's grey tie. */
  tie?: boolean;
  /** Where the eyes look, each axis −1 … 1. */
  look?: { x: number; y: number };
}

const HOLE = '#2b2f31';

/** A German Schuko socket with feelings. The two pin holes are the eyes. */
export function SocketFace({ mood, poked = false, size = 200, tie = false, look }: Props) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const wide = mood === 'panic';
  const r = wide ? 13 : 11;
  const lx = look ? Math.max(-1, Math.min(1, look.x)) * 4.5 : 0;
  const ly = look ? Math.max(-1, Math.min(1, look.y)) * 3.5 : 0;
  const height = tie ? size * 1.25 : size;
  return (
    <svg
      className={`socket${poked ? ' poked' : ''}`}
      data-mood={mood}
      width={size}
      height={height}
      viewBox={`0 0 200 ${tie ? 250 : 200}`}
      role="img"
      aria-label={`Mr. Grey, die Steckdose, Stimmung: ${MOOD_LABEL[mood]}`}
    >
      <defs>
        <linearGradient id={id('plate')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfcf8" />
          <stop offset="1" stopColor="#e6e3da" />
        </linearGradient>
        <radialGradient id={id('recess')} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#ebe8df" />
          <stop offset="1" stopColor="#d2cec3" />
        </radialGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d9398" />
          <stop offset="0.5" stopColor="#e3e6e8" />
          <stop offset="1" stopColor="#8d9398" />
        </linearGradient>
        <pattern id={id('tie')} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="9" height="9" fill="#6f767a" />
          <rect width="3" height="9" fill="#5a6064" />
        </pattern>
      </defs>

      {/* tie (behind the plate's lower edge) */}
      {tie && (
        <g>
          <path d="M94 199 L106 199 L116 236 L100 249 L84 236 Z" fill={`url(#${id('tie')})`} stroke="#41464a" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M89 186 L111 186 L106 201 L94 201 Z" fill="#62686c" stroke="#41464a" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}

      {/* plate + recess */}
      <rect x="8" y="10" width="184" height="184" rx="34" fill="#b9b6ac" />
      <rect x="8" y="6" width="184" height="184" rx="34" fill={`url(#${id('plate')})`} stroke="#c4c1b7" strokeWidth="1.5" />
      {tie && <path d="M89 186 L111 186 L106 196 L94 196 Z" fill="#62686c" stroke="#41464a" strokeWidth="1.5" strokeLinejoin="round" />}
      <circle cx="100" cy="100" r="68" fill={`url(#${id('recess')})`} />
      <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="3" />

      {/* earthing clips (top and bottom, like the real thing) */}
      <rect x="86" y="36" width="28" height="11" rx="3" fill={`url(#${id('metal')})`} stroke="#7d8287" strokeWidth="0.8" />
      <rect x="86" y="153" width="28" height="11" rx="3" fill={`url(#${id('metal')})`} stroke="#7d8287" strokeWidth="0.8" />

      {/* cheeks – the more excited, the redder */}
      {mood !== 'dead' && mood !== 'loading' && (
        <g fill="#e9928a" opacity={BLUSH[mood]}>
          <ellipse cx="57" cy="121" rx="10" ry="6" />
          <ellipse cx="143" cy="121" rx="10" ry="6" />
        </g>
      )}

      {/* eyes = pin holes */}
      {mood === 'dead' ? (
        <g stroke={HOLE} strokeWidth="5" strokeLinecap="round">
          <path d="M63 89 L81 107 M81 89 L63 107" />
          <path d="M119 89 L137 107 M137 89 L119 107" />
        </g>
      ) : (
        <g className="eyes">
          <circle cx="72" cy="98" r={r} fill={HOLE} />
          <circle cx="128" cy="98" r={r} fill={HOLE} />
          <g transform={`translate(${lx.toFixed(2)} ${ly.toFixed(2)})`}>
            <g className={`pupils${look ? '' : ' wander'}`} fill="#fff">
              <circle cx={wide ? 72 : 74} cy={wide ? 98 : 95} r={wide ? 2.2 : 3.4} />
              <circle cx={wide ? 128 : 130} cy={wide ? 98 : 95} r={wide ? 2.2 : 3.4} />
            </g>
          </g>
          {mood === 'zen' && (
            <g fill="#ddd9cf" stroke={HOLE} strokeWidth="2.5" strokeLinecap="round">
              <path d="M59 98 A13 13 0 0 1 85 98 Z" />
              <path d="M115 98 A13 13 0 0 1 141 98 Z" />
            </g>
          )}
        </g>
      )}

      {/* brows */}
      <g stroke={HOLE} strokeWidth="4" strokeLinecap="round" fill="none">
        {mood === 'nervous' && (
          <>
            <path d="M60 78 Q72 72 84 76" />
            <path d="M116 76 Q128 72 140 78" />
          </>
        )}
        {(mood === 'sweaty' || mood === 'panic') && (
          <>
            <path d="M60 80 L83 71" />
            <path d="M117 71 L140 80" />
          </>
        )}
      </g>

      {/* mouth */}
      <g stroke={HOLE} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {mood === 'zen' && <path d="M85 129 Q100 139 115 129" />}
        {mood === 'chill' && <path d="M80 125 Q100 146 120 125" />}
        {mood === 'nervous' && <path d="M82 133 q6 -5 12 0 t12 0 t12 0" />}
        {mood === 'sweaty' && <path d="M82 138 Q100 124 118 138" />}
        {mood === 'loading' && <circle cx="100" cy="133" r="5" />}
        {mood === 'dead' && <path d="M86 134 L114 134" />}
      </g>
      {mood === 'panic' && <ellipse cx="100" cy="134" rx="10" ry="13" fill={HOLE} />}

      {/* sweat */}
      {(mood === 'nervous' || mood === 'sweaty' || mood === 'panic') && (
        <path className="drop" d="M156 58 q-7 10 0 14 q7 -4 0 -14 Z" fill="#7cc0e6" stroke="#3f88b5" strokeWidth="1.2" />
      )}
      {mood === 'sweaty' && <path className="drop" d="M44 66 q-6 9 0 12 q6 -3 0 -12 Z" fill="#7cc0e6" stroke="#3f88b5" strokeWidth="1.2" />}

      {/* sparks */}
      {mood === 'panic' && (
        <g className="spark" fill="#f2a900" stroke="#9c6d00" strokeWidth="1" strokeLinejoin="round">
          <path d="M28 30 L40 30 L33 42 L44 42 L26 62 L31 47 L22 47 Z" />
          <path d="M170 132 L180 132 L174 142 L184 142 L168 160 L172 147 L164 147 Z" />
        </g>
      )}
    </svg>
  );
}

const MOOD_LABEL: Record<FaceMood, string> = {
  zen: 'tiefenentspannt',
  chill: 'entspannt',
  nervous: 'leicht erregt',
  sweaty: 'ganz schön heiß',
  panic: 'außer Kontrolle',
  loading: 'wartet auf Daten',
  dead: 'keine Daten',
};

const BLUSH: Record<Mood, number> = { zen: 0.3, chill: 0.35, nervous: 0.55, sweaty: 0.7, panic: 0.85 };
