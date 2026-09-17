import { useApp } from '../hooks/useApp';
import type { Skill } from '../types';
import { masteryStatus } from '../utils/format';
export function KnowledgeGraph({
  skills,
  onSelect,
  compact = false,
  selected,
}: {
  skills: Skill[];
  onSelect?: (s: Skill) => void;
  compact?: boolean;
  selected?: string;
}) {
  const { lang, t } = useApp();
  const preview = ['arithmetic', 'expressions', 'linear', 'quadratic', 'functions'];
  const nodes = compact
    ? (preview.map((id) => skills.find((s) => s.id === id)).filter(Boolean) as Skill[])
    : skills;
  const level = (s: Skill, seen: string[] = []): number =>
    seen.includes(s.id)
      ? 0
      : Math.max(
          0,
          ...s.prerequisites.map((p) => {
            const parent = nodes.find((n) => n.id === p);
            return parent ? 1 + level(parent, [...seen, s.id]) : 0;
          }),
        );
  const levels = nodes.map((s) => level(s));
  const max = Math.max(0, ...levels);
  const width = compact ? 400 : Math.max(750, (max + 1) * 210);
  const counts = Array.from({ length: max + 1 }, (_, l) => levels.filter((n) => n === l).length);
  const height = compact ? 450 : Math.max(470, Math.max(...counts) * 115 + 70);
  const pos = (s: Skill) => {
    const i = nodes.indexOf(s);
    if (compact)
      return [
        [196, 56],
        [196, 161],
        [196, 266],
        [102, 385],
        [299, 385],
      ][i];
    const peers = nodes.filter((_, j) => levels[j] === levels[i]);
    return [95 + levels[i] * 210, 60 + peers.indexOf(s) * 115];
  };
  return (
    <div className={'graph-scroll ' + (compact ? 'compact' : '')}>
      <svg
        className="knowledge-graph"
        viewBox={`0 0 ${width} ${height}`}
        style={compact ? undefined : { minWidth: width, minHeight: height }}
        role="group"
        aria-label={t('Knowledge dependency map', 'Карта залежностей знань')}
      >
        <defs>
          <pattern
            id={compact ? 'dots-mini' : 'dots-map'}
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".7" fill="#d6e2db" />
          </pattern>
          <marker
            id={compact ? 'arrow-mini' : 'arrow-map'}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0L6 3L0 6" fill="#52876a" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${compact ? 'dots-mini' : 'dots-map'})`} />
        {nodes.flatMap((s) =>
          s.prerequisites
            .filter((p) => nodes.some((n) => n.id === p))
            .map((p) => {
              const from = pos(nodes.find((n) => n.id === p)!);
              const to = pos(s);
              return (
                <path
                  key={p + s.id}
                  d={
                    compact
                      ? `M ${from[0]} ${from[1] + 26} C ${from[0]} ${from[1] + 72}, ${to[0]} ${to[1] - 70}, ${to[0]} ${to[1] - 28}`
                      : `M ${from[0] + 30} ${from[1]} C ${from[0] + 105} ${from[1]}, ${to[0] - 90} ${to[1]}, ${to[0] - 30} ${to[1]}`
                  }
                  fill="none"
                  stroke="#82a38f"
                  strokeWidth="1.4"
                  markerEnd={`url(#${compact ? 'arrow-mini' : 'arrow-map'})`}
                />
              );
            }),
        )}
        {nodes.map((s, i) => {
          const [x, y] = pos(s);
          return (
            <g
              key={s.id}
              className={`graph-node ${s.confidence_score === 0 ? 'unknown' : masteryStatus(s.mastery_score)} ${selected === s.id ? 'selected' : ''}`}
            >
              <circle cx={x} cy={y} r="31" className="node-halo" />
              <circle cx={x} cy={y} r="25" className="node-circle" />
              <text x={x} y={y + 6} textAnchor="middle" className="node-score">
                {s.confidence_score === 0 ? '?' : Math.round(s.mastery_score)}
              </text>
              <foreignObject
                x={compact && i < 3 ? x + 38 : x - 88}
                y={compact && i < 3 ? y - 16 : y + 32}
                width={compact && i < 3 ? 160 : 176}
                height="55"
              >
                <button
                  className={'node-label ' + (compact && i < 3 ? 'align-left' : '')}
                  onClick={() => onSelect?.(s)}
                >
                  {s.title[lang]}
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
