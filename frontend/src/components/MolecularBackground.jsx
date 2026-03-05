import React, { useMemo } from 'react';

// Generate a stable network of nodes and edges for the molecular background
function generateNetwork(seed = 42) {
  const nodes = [];
  const edges = [];

  // Grid-based placement with jitter for organic feel
  const cols = 12;
  const rows = 10;
  const spacingX = 100 / cols;
  const spacingY = 100 / rows;

  // Simple seeded random
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (rand() - 0.5) * spacingX * 0.6;
      const jitterY = (rand() - 0.5) * spacingY * 0.6;
      nodes.push({
        x: spacingX * (c + 0.5) + jitterX,
        y: spacingY * (r + 0.5) + jitterY,
        r: 1 + rand() * 2,
        delay: rand() * 4,
        duration: 2 + rand() * 3,
      });
    }
  }

  // Connect nearby nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < spacingX * 1.6 && rand() > 0.35) {
        edges.push({
          x1: nodes[i].x,
          y1: nodes[i].y,
          x2: nodes[j].x,
          y2: nodes[j].y,
          delay: rand() * 3,
          duration: 1.5 + rand() * 2,
        });
      }
    }
  }

  // Add some hexagonal structures
  const hexCenters = [
    { cx: 25, cy: 30 }, { cx: 60, cy: 20 }, { cx: 80, cy: 60 },
    { cx: 35, cy: 70 }, { cx: 15, cy: 55 }, { cx: 70, cy: 85 },
    { cx: 50, cy: 50 }, { cx: 90, cy: 35 },
  ];

  hexCenters.forEach(({ cx, cy }) => {
    const hexR = 4 + rand() * 3;
    const hexNodes = [];
    for (let k = 0; k < 6; k++) {
      const angle = (Math.PI / 3) * k - Math.PI / 6;
      hexNodes.push({
        x: cx + hexR * Math.cos(angle),
        y: cy + hexR * Math.sin(angle),
        r: 1.2,
        delay: rand() * 4,
        duration: 2 + rand() * 2,
      });
    }
    nodes.push(...hexNodes);
    for (let k = 0; k < 6; k++) {
      const next = (k + 1) % 6;
      edges.push({
        x1: hexNodes[k].x,
        y1: hexNodes[k].y,
        x2: hexNodes[next].x,
        y2: hexNodes[next].y,
        delay: rand() * 2,
        duration: 1.5 + rand() * 2,
      });
    }
  });

  return { nodes, edges };
}

export function MolecularBackground() {
  const { nodes, edges } = useMemo(() => generateNetwork(), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @keyframes nodePulse {
              0%, 100% { opacity: 0.15; r: var(--base-r); }
              50% { opacity: 0.4; r: calc(var(--base-r) + 0.5px); }
            }
            @keyframes edgeDraw {
              0%, 100% { opacity: 0.06; }
              50% { opacity: 0.18; }
            }
          `}</style>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#0f172a"
            strokeWidth="0.15"
            opacity="0.1"
          >
            <animate
              attributeName="opacity"
              values="0.06;0.18;0.06"
              dur={`${e.duration}s`}
              begin={`${e.delay}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill="#0f172a"
            opacity="0.2"
          >
            <animate
              attributeName="opacity"
              values="0.12;0.35;0.12"
              dur={`${n.duration}s`}
              begin={`${n.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values={`${n.r};${n.r + 0.4};${n.r}`}
              dur={`${n.duration}s`}
              begin={`${n.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
