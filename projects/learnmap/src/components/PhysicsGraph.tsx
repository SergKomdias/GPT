export function PhysicsGraph({ graph }: { graph: any }) {
  if (!graph?.points?.length) return null;
  const points = graph.points as [number, number][];
  const xmax = Math.max(1, ...points.map((p) => p[0])),
    ymin = Math.min(0, ...points.map((p) => p[1])),
    ymax = Math.max(1, ...points.map((p) => p[1]));
  const x = (n: number) => 50 + (n / xmax) * 300,
    y = (n: number) => 200 - ((n - ymin) / (ymax - ymin)) * 160;
  return (
    <figure className="physics-graph">
      <svg viewBox="0 0 420 250" role="img" aria-label={graph.caption}>
        <line x1="50" y1={y(0)} x2="365" y2={y(0)} stroke="currentColor" />
        <line x1="50" y1="30" x2="50" y2="210" stroke="currentColor" />
        <polyline
          points={points.map(([a, b]) => `${x(a)},${y(b)}`).join(' ')}
          fill="none"
          stroke="#17634d"
          strokeWidth="3"
        />
        {points.map(([a, b], i) => (
          <g key={i}>
            <circle cx={x(a)} cy={y(b)} r="4" fill="#17634d" />
            <text x={x(a) + 4} y={y(b) - 9} fontSize="12">
              ({a}; {b})
            </text>
          </g>
        ))}
        <text x="305" y="238" fontSize="14">
          {graph.x}
        </text>
        <text x="8" y="18" fontSize="14">
          {graph.y}
        </text>
      </svg>
      <figcaption>{graph.caption}</figcaption>
    </figure>
  );
}
