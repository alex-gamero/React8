import { DIRECTIONS, type Direction } from '../engine/types';

export const angleOf = (d: Direction) => DIRECTIONS.indexOf(d) * 45;

interface Props {
  direction: Direction;
  tone?: 'tape' | 'hold' | 'line' | 'faint';
  className?: string;
  title?: string;
}

const TONES = {
  tape: 'var(--tape)',
  hold: 'var(--hold)',
  line: 'var(--line)',
  faint: 'var(--line-faint)',
};

/** A line-paint arrow: flat-ended tape strokes, mitred head. */
export function Arrow({ direction, tone = 'tape', className, title }: Props) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g transform={`rotate(${angleOf(direction)})`} stroke={TONES[tone]} strokeWidth="11" fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        <path d="M0 40 V-30" />
        <path d="M-26 -6 L0 -33 L26 -6" />
      </g>
    </svg>
  );
}
