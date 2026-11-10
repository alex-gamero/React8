import type { Zone } from '../engine/types';

interface Props {
  active?: Zone | null;
  dimFront?: boolean;
  className?: string;
}

// Player's view facing the net: front row 4-3-2, back row 5-6-1.
const LAYOUT: { zone: Zone; col: number; row: number }[] = [
  { zone: 4, col: 0, row: 0 },
  { zone: 3, col: 1, row: 0 },
  { zone: 2, col: 2, row: 0 },
  { zone: 5, col: 0, row: 1 },
  { zone: 6, col: 1, row: 1 },
  { zone: 1, col: 2, row: 1 },
];

const W = 300;
const FRONT = 100; // 3 m attack zone
const BACK = 200; // 6 m back zone
const COL = W / 3;

/** Half a volleyball court, drawn in line paint. The active zone gets taped. */
export function CourtZones({ active = null, dimFront = false, className }: Props) {
  return (
    <svg viewBox={`-6 -14 ${W + 12} ${FRONT + BACK + 22}`} className={className} role="img" aria-label={active ? `Zone ${active}` : 'Volleyball half court'}>
      {LAYOUT.map(({ zone, col, row }) => {
        const x = col * COL;
        const y = row === 0 ? 0 : FRONT;
        const h = row === 0 ? FRONT : BACK;
        const on = zone === active;
        const off = dimFront && row === 0;
        return (
          <g key={zone} opacity={off ? 0.3 : 1}>
            <rect x={x} y={y} width={COL} height={h} fill={on ? 'var(--tape)' : 'transparent'} className={on ? 'zone-fill is-on' : 'zone-fill'} />
            <text
              x={x + COL / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="zone-number"
              fill={on ? 'var(--tape-ink)' : 'var(--line-dim)'}
              fontSize={on ? 76 : 40}
            >
              {zone}
            </text>
          </g>
        );
      })}
      {/* Zone dividers: dashed, like the guide lines coaches tape down */}
      <g stroke="var(--line-faint)" strokeWidth="2" strokeDasharray="6 8">
        <path d={`M${COL} 0 V${FRONT + BACK} M${COL * 2} 0 V${FRONT + BACK}`} />
      </g>
      {/* Court boundary and attack line */}
      <g stroke="var(--line)" strokeWidth="4" fill="none">
        <rect x="0" y="0" width={W} height={FRONT + BACK} />
        <path d={`M0 ${FRONT} H${W}`} />
      </g>
      {/* Net */}
      <path d={`M-6 -6 H${W + 6}`} stroke="var(--line)" strokeWidth="6" />
    </svg>
  );
}
