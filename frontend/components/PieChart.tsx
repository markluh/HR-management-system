"use client";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

const PALETTE = ["#3358d4", "#1a7f4f", "#c2374b", "#8a6116", "#7a3ba8", "#0f7d8c", "#c25e26"];

export function slicesFromCounts(
  entries: [string, number][],
  colors?: Record<string, string>
): PieSlice[] {
  return entries.map(([label, value], i) => ({
    label,
    value,
    color: colors?.[label] ?? PALETTE[i % PALETTE.length],
  }));
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
  const largeArc = end - start > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, end);
  const p2 = polar(cx, cy, rOuter, start);
  const p3 = polar(cx, cy, rInner, start);
  const p4 = polar(cx, cy, rInner, end);
  if (rInner === 0) {
    return `M ${cx} ${cy} L ${p2.x} ${p2.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
  }
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export default function PieChart({
  title,
  data,
  size = 170,
  subtitle,
}: {
  title: string;
  data: PieSlice[];
  size?: number;
  subtitle?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  // Donut geometry
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter - 34;

  let angle = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d, idx, arr) => {
      const isLast = idx === arr.length - 1;
      const sweep = (d.value / total) * 360;
      // A sweep of ~360° makes an SVG arc degenerate (start == end);
      // draw the last slice as a full ring instead.
      const fullRing = isLast && angle + sweep >= 359.99;
      const path = fullRing ? null : arcPath(cx, cy, rOuter, rInner, angle, angle + Math.min(sweep, 359.99));
      // label position: mid-angle of the slice, at the middle of the ring
      const midAngle = angle + sweep / 2;
      const labelPos = polar(cx, cy, (rOuter + rInner) / 2, midAngle);
      angle += sweep;
      return { ...d, path, fullRing, labelPos, sweep };
    });

  return (
    <div className="card pie-card">
      <div className="pie-title">{title}</div>
      {subtitle && <div className="pie-subtitle">{subtitle}</div>}
      {total === 0 ? (
        <div className="empty-state">No data.</div>
      ) : (
        <div className="pie-body">
          <div className="pie-visual" style={{ width: `min(100%, ${size}px)` }}>
            <svg
              className="pie-svg"
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={title}
            >
              {slices.map((a) =>
                a.fullRing ? (
                  // 100% slice: a perfect circle ring, no degenerate arc
                  <circle
                    key={a.label}
                    cx={cx}
                    cy={cy}
                    r={(rOuter + rInner) / 2}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={rOuter - rInner}
                  />
                ) : (
                  <path
                    key={a.label}
                    d={a.path!}
                    fill={a.color}
                    stroke="#1f2833"
                    strokeWidth="1.5"
                  />
                )
              )}
              {/* percentage marks drawn on each sufficiently large portion */}
              {slices
                .filter((a) => a.fullRing || a.sweep > 22)
                .map((a) => (
                  <text
                    key={`mark-${a.label}`}
                    x={a.labelPos.x}
                    y={a.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="12"
                    fontWeight="700"
                    fill="#0b0c10"
                    style={{ pointerEvents: "none" }}
                  >
                    {Math.round((a.value / total) * 100)}%
                  </text>
                ))}
              <text x={cx} y={cy - 2} textAnchor="middle" className="pie-center-value">
                {total}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" className="pie-center-label">
                total
              </text>
            </svg>
          </div>
          <ul className="pie-legend">
            {data.map((d) => (
              <li key={d.label}>
                <span className="dot" style={{ background: d.color }} />
                <span className="legend-label">{d.label}</span>
                <span className="legend-value">
                  {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
