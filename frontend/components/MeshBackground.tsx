"use client";

import { useEffect, useRef } from "react";

// Faint animated "network mesh" background inspired by the reference image.
// Nodes wander with a random walk (direction changes are random), and the
// connecting lines follow them each frame. Rendered behind all content.

interface MeshNode {
  bx: number; // base position
  by: number;
  x: number;
  y: number;
  angle: number; // radians
  speed: number; // px per frame
  turnIn: number; // frames until a new direction is picked
  turnRate: number; // max radians of random turn
}

const NODES: { x: number; y: number; r: number }[] = [
  { x: 30, y: 60, r: 5 },
  { x: 95, y: 130, r: 3.5 },
  { x: 175, y: 45, r: 4 },
  { x: 240, y: 120, r: 5.5 },
  { x: 120, y: 230, r: 4.5 },
  { x: 40, y: 320, r: 6 },
  { x: 210, y: 300, r: 3.5 },
  { x: 310, y: 210, r: 4 },
  { x: 380, y: 95, r: 3 },
  { x: 300, y: 420, r: 5 },
  { x: 170, y: 470, r: 4 },
  { x: 70, y: 560, r: 5.5 },
  { x: 280, y: 580, r: 3.5 },
  { x: 420, y: 500, r: 4.5 },
  { x: 470, y: 360, r: 3.5 },
  { x: 540, y: 250, r: 3 },
  { x: 620, y: 430, r: 4 },
  { x: 720, y: 540, r: 3 },
  { x: 560, y: 660, r: 5 },
  { x: 380, y: 720, r: 3.5 },
  { x: 190, y: 750, r: 4 },
  { x: 700, y: 700, r: 3 },
  { x: 830, y: 620, r: 4.5 },
  { x: 950, y: 700, r: 3 },
  { x: 900, y: 480, r: 3.5 },
  { x: 1020, y: 560, r: 3 },
  { x: 1150, y: 640, r: 4 },
  { x: 1250, y: 540, r: 3 },
  { x: 1330, y: 660, r: 3.5 },
  { x: 1380, y: 420, r: 3 },
  { x: 1240, y: 330, r: 3.5 },
  { x: 1100, y: 240, r: 3 },
  { x: 1350, y: 180, r: 3 },
  { x: 700, y: 150, r: 3.5 },
  { x: 850, y: 260, r: 3 },
  { x: 1000, y: 120, r: 3 },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [1, 3], [1, 4], [0, 4], [3, 7], [4, 6], [6, 7],
  [5, 4], [5, 6], [5, 10], [6, 9], [7, 8], [8, 3], [7, 14], [7, 15], [14, 15],
  [9, 10], [9, 13], [9, 11], [10, 11], [11, 12], [12, 13], [13, 14], [13, 16],
  [16, 17], [13, 18], [18, 19], [19, 20], [17, 18], [16, 22], [22, 17],
  [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28], [28, 29],
  [24, 30], [30, 31], [31, 32], [32, 33], [33, 15], [34, 30], [34, 8],
  [16, 24], [21, 22], [18, 21], [20, 18], [12, 19], [27, 29],
];

const GLOWS: { x: number; y: number; r: number; color: string; dur: number; delay: number }[] = [
  { x: 190, y: 300, r: 150, color: "#2ec4a9", dur: 34, delay: 0 },
  { x: 480, y: 520, r: 130, color: "#66fcf1", dur: 42, delay: 6 },
  { x: 1100, y: 580, r: 170, color: "#3358d4", dur: 50, delay: 12 },
  { x: 300, y: 640, r: 110, color: "#66fcf1", dur: 38, delay: 3 },
];

const W = 1440;
const H = 810;
const MARGIN = 40;

export default function MeshBackground() {
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const mesh = NODES.map((n) => ({
      bx: n.x,
      by: n.y,
      x: n.x,
      y: n.y,
      angle: Math.random() * Math.PI * 2,
      speed: 0.08 + Math.random() * 0.18,
      turnIn: 60 + Math.floor(Math.random() * 240),
      turnRate: 0.3 + Math.random() * 0.9,
    }));

    let raf = 0;
    let frame = 0;

    const step = () => {
      frame++;
      for (let i = 0; i < mesh.length; i++) {
        const n = mesh[i];
        // Random direction change: after a while, turn by a random amount.
        if (n.turnIn-- <= 0) {
          n.angle += (Math.random() * 2 - 1) * n.turnRate * 2;
          // occasionally pick a completely fresh direction
          if (Math.random() < 0.25) n.angle = Math.random() * Math.PI * 2;
          n.speed = 0.08 + Math.random() * 0.18;
          n.turnIn = 60 + Math.floor(Math.random() * 240);
        }
        // Gentle steering back toward base position keeps the layout shape.
        const home = Math.atan2(n.by - n.y, n.bx - n.x);
        const distHome = Math.hypot(n.bx - n.x, n.by - n.y);
        if (distHome > 60) {
          n.angle += (home - n.angle) * 0.03;
        }
        n.x += Math.cos(n.angle) * n.speed;
        n.y += Math.sin(n.angle) * n.speed;
        // soft bounds
        if (n.x < MARGIN) n.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        if (n.x > W - MARGIN) n.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        if (n.y < MARGIN) n.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        if (n.y > H - MARGIN) n.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;

        const el = nodeRefs.current[i];
        if (el) {
          el.setAttribute("cx", n.x.toFixed(2));
          el.setAttribute("cy", n.y.toFixed(2));
        }
      }
      // lines follow their endpoints
      for (let i = 0; i < EDGES.length; i++) {
        const [a, b] = EDGES[i];
        const el = lineRefs.current[i];
        if (el) {
          el.setAttribute("x1", mesh[a].x.toFixed(2));
          el.setAttribute("y1", mesh[a].y.toFixed(2));
          el.setAttribute("x2", mesh[b].x.toFixed(2));
          el.setAttribute("y2", mesh[b].y.toFixed(2));
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      className="mesh-bg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="mesh-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>

      <g>
        {/* soft blurred glows (CSS drift keeps them lively) */}
        {GLOWS.map((g, i) => (
          <circle
            key={`glow-${i}`}
            className="mesh-glow"
            cx={g.x}
            cy={g.y}
            r={g.r}
            fill={g.color}
            filter="url(#mesh-blur)"
            style={{ animationDuration: `${g.dur}s`, animationDelay: `${g.delay}s` }}
          />
        ))}

        {/* connecting lines (positions updated every frame) */}
        {EDGES.map(([a, b], i) => (
          <line
            key={`edge-${i}`}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className="mesh-line"
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke={i % 3 === 0 ? "#3358d4" : "#66fcf1"}
            style={{ animationDelay: `${(i % 12) * 0.9}s` }}
          />
        ))}

        {/* nodes (positions updated every frame) */}
        {NODES.map((n, i) => (
          <circle
            key={`node-${i}`}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            className="mesh-node"
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={i % 4 === 0 ? "#3358d4" : "#66fcf1"}
            style={{ animationDelay: `${(i % 10) * 0.55}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
