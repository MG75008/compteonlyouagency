"use client";

type ChartProps = {
  points: { label: string; value: number }[];
  color: string;
};

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export default function Chart({ points, color }: ChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-brand-muted">
        Aucune donnée
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + plotHeight - ((p.value - min) / range) * plotHeight,
  }));

  let linePath = "";
  coords.forEach((c, i) => {
    if (i === 0) {
      linePath += `M ${c.x} ${c.y}`;
    } else {
      const prev = coords[i - 1];
      const cp1x = prev.x + stepX / 2;
      const cp2x = c.x - stepX / 2;
      linePath += ` C ${cp1x} ${prev.y}, ${cp2x} ${c.y}, ${c.x} ${c.y}`;
    }
  });

  const zeroY = PAD_TOP + plotHeight - ((0 - min) / range) * plotHeight;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${zeroY} L ${coords[0].x} ${zeroY} Z`;

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const y = PAD_TOP + (plotHeight / gridCount) * i;
    const value = max - (range / gridCount) * i;
    return { y, value };
  });

  const maxLabels = 7;
  const labelStride = Math.max(1, Math.ceil(points.length / maxLabels));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: HEIGHT }}
    >
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={PAD_X}
            y1={g.y}
            x2={WIDTH - PAD_X}
            y2={g.y}
            stroke="#4a3a32"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text x={0} y={g.y - 4} fontSize={9} fill="#b6a693">
            {Math.round(g.value)}
          </text>
        </g>
      ))}

      <path d={areaPath} fill={color} opacity={0.12} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />
      ))}

      {points.map((p, i) =>
        i % labelStride === 0 ? (
          <text
            key={i}
            x={coords[i].x}
            y={HEIGHT - 8}
            fontSize={9}
            fill="#b6a693"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
