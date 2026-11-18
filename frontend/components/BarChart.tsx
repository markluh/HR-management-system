"use client";

export interface Bar {
  label: string;
  value: number;
}

/** Simple SVG bar chart, responsive via viewBox. */
export default function BarChart({
  title,
  data,
  color = "#3358d4",
  subtitle,
}: {
  title: string;
  data: Bar[];
  color?: string;
  subtitle?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 56;
  const height = 160;
  const padding = { top: 24, bottom: 30, left: 8 };
  const totalWidth = data.length * width + padding.left * 2;

  return (
    <div className="card pie-card">
      <div className="pie-title">{title}</div>
      {subtitle && <div className="pie-subtitle">{subtitle}</div>}
      <svg
        viewBox={`0 0 ${totalWidth} ${height + padding.top + padding.bottom}`}
        style={{ width: "100%", height: "auto", marginTop: 12 }}
        role="img"
        aria-label={title}
      >
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 10);
          const x = padding.left + i * width + 8;
          const y = padding.top + height - barHeight;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={width - 28}
                height={Math.max(barHeight, d.value > 0 ? 3 : 0)}
                rx="4"
                fill={color}
                opacity={d.value === 0 ? 0.25 : 1}
              />
              {d.value > 0 && (
                <text
                  x={x + (width - 28) / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#c5c6c7"
                  fontWeight="600"
                >
                  {d.value}
                </text>
              )}
              <text
                x={x + (width - 28) / 2}
                y={padding.top + height + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#c5c6c7"
              >
                {d.label}
              </text>
            </g>
          );
        })}
        {/* baseline */}
        <line
          x1={padding.left}
          y1={padding.top + height}
          x2={totalWidth - padding.left}
          y2={padding.top + height}
          stroke="#2e3a46"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
