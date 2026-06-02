"use client";

import { useEffect, useRef } from "react";

const W = 1200;
const H = 760;
const G = 40; // grid pitch

// Deterministic PRNG so the dim and glow layers draw the exact same board.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Trace = { d: string; live: boolean };
type Pad = { x: number; y: number; r: number; fill: boolean };

// Turn a list of axis-aligned points into a path with 45° chamfered corners —
// the detail that makes it read as a real PCB rather than a plain grid.
function chamfer(pts: number[][]): string {
  if (pts.length < 3) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    return `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
  }
  const c = 7;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const idx = Math.sign(x - px);
    const idy = Math.sign(y - py);
    const odx = Math.sign(nx - x);
    const ody = Math.sign(ny - y);
    d += ` L${x - idx * c} ${y - idy * c} L${x + odx * c} ${y + ody * c}`;
  }
  const l = pts[pts.length - 1];
  d += ` L${l[0]} ${l[1]}`;
  return d;
}

function buildBoard() {
  const rnd = mulberry32(0x5f3759df);
  const traces: Trace[] = [];
  const pads: Pad[] = [];
  const cols = Math.floor(W / G);
  const rows = Math.floor(H / G);

  for (let i = 0; i < 150; i++) {
    let x = Math.round(rnd() * cols) * G;
    let y = Math.round(rnd() * rows) * G;
    const sx = x;
    const sy = y;
    const pts: number[][] = [[x, y]];
    const steps = 2 + Math.floor(rnd() * 3);
    let horiz = rnd() < 0.5;
    for (let s = 0; s < steps; s++) {
      const len = (1 + Math.floor(rnd() * 4)) * G;
      if (horiz) x += rnd() < 0.5 ? len : -len;
      else y += rnd() < 0.5 ? len : -len;
      x = Math.max(0, Math.min(W, x));
      y = Math.max(0, Math.min(H, y));
      pts.push([x, y]);
      horiz = !horiz;
    }
    traces.push({ d: chamfer(pts), live: rnd() < 0.2 });
    if (rnd() < 0.55)
      pads.push({ x, y, r: rnd() < 0.5 ? 2.6 : 4.2, fill: rnd() < 0.6 });
    if (rnd() < 0.35) pads.push({ x: sx, y: sy, r: 2.6, fill: true });
  }
  return { traces, pads };
}

const BOARD = buildBoard();

function CircuitSvg({ animate }: { animate: boolean }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {BOARD.traces.map((t, i) => (
          <path
            key={i}
            d={t.d}
            className={animate && t.live ? "trace-live" : undefined}
            style={
              animate && t.live
                ? { animationDelay: `${(i % 9) * 0.18}s` }
                : undefined
            }
          />
        ))}
      </g>
      <g>
        {BOARD.pads.map((p, i) =>
          p.fill ? (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="currentColor" />
          ) : (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
            />
          ),
        )}
      </g>
    </svg>
  );
}

export default function CircuitField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        el.style.setProperty("--on", "1");
      });
    };
    const leave = () => el.style.setProperty("--on", "0");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("blur", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="circuit-field" aria-hidden>
      <div className="circuit-layer circuit-dim">
        <CircuitSvg animate={false} />
      </div>
      <div className="circuit-spot" />
      <div className="circuit-layer circuit-glow">
        <CircuitSvg animate />
      </div>
    </div>
  );
}
