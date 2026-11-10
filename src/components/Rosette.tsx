import { useEffect, useState } from 'react';
import { DIRECTIONS, type Direction } from '../engine/types';
import { angleOf } from './Arrow';

interface Props {
  /** Cycle a lit arrow on its own, as a live preview of a drill. */
  demo?: boolean;
  /** Show a count next to each direction (session summary). */
  counts?: Partial<Record<Direction, number>>;
  className?: string;
}

function useDemoDirection(enabled: boolean): Direction | null {
  const [dir, setDir] = useState<Direction | null>(enabled ? 'up-right' : null);
  useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let prev: Direction = 'up-right';
    const id = window.setInterval(() => {
      const pool = DIRECTIONS.filter((d) => d !== prev);
      prev = pool[Math.floor(Math.random() * pool.length)];
      setDir(prev);
    }, 1150);
    return () => window.clearInterval(id);
  }, [enabled]);
  return dir;
}

/** Eight arrows around a centre circle, like the middle of a court. */
export function Rosette({ demo = false, counts, className }: Props) {
  const lit = useDemoDirection(demo);
  const max = counts ? Math.max(1, ...Object.values(counts).map((n) => n ?? 0)) : 1;

  return (
    <svg viewBox="-118 -118 236 236" className={className} aria-hidden="true">
      <circle r="30" fill="none" stroke="var(--line)" strokeWidth="2.5" />
      <circle r="104" fill="none" stroke="var(--line-faint)" strokeWidth="2" />
      <path d="M-104 0 H-30 M30 0 H104" stroke="var(--line-faint)" strokeWidth="2" />
      {DIRECTIONS.map((d) => {
        const on = d === lit;
        const n = counts?.[d] ?? 0;
        const weight = counts ? 0.35 + (0.65 * n) / max : 1;
        return (
          <g key={d} transform={`rotate(${angleOf(d)})`}>
            <g
              className={on ? 'rosette-arrow is-lit' : 'rosette-arrow'}
              stroke={on || (counts && n > 0) ? 'var(--tape)' : 'var(--line-muted)'}
              strokeWidth={on ? 7 : counts && n > 0 ? 4 + 3 * weight : 5}
              fill="none"
            >
              <path d="M0 -40 V-82" />
              <path d="M-13 -70 L0 -84 L13 -70" />
            </g>
            {counts && (
              <text
                y="-101"
                transform={`rotate(${-angleOf(d)} 0 -101)`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="rosette-count"
              >
                {n}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
