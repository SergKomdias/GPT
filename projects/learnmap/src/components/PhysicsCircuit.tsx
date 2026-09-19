export function PhysicsCircuit({ labels }: { labels: string[] }) {
  return (
    <figure className="physics-graph">
      <svg
        viewBox="0 0 500 190"
        role="img"
        aria-label={`Змішане коло: ${labels[0]} послідовно з паралельними ${labels[1]} та ${labels[2]}`}
      >
        <g stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M20 95H75 M135 95H200V40H275 M335 40H410V150H335 M275 150H200V95 M410 95H470" />
          <rect x="75" y="80" width="60" height="30" />
          <rect x="275" y="25" width="60" height="30" />
          <rect x="275" y="135" width="60" height="30" />
        </g>
        <g fill="currentColor" textAnchor="middle" fontSize="17">
          <text x="105" y="66">
            {labels[0]}
          </text>
          <text x="305" y="17">
            {labels[1]}
          </text>
          <text x="305" y="187">
            {labels[2]}
          </text>
          <circle cx="200" cy="95" r="4" />
          <circle cx="410" cy="95" r="4" />
          <circle cx="20" cy="95" r="4" />
          <circle cx="470" cy="95" r="4" />
        </g>
      </svg>
      <figcaption>
        Зовнішні точки — клеми джерела; крапки всередині — вузли розгалуження.
      </figcaption>
    </figure>
  );
}
