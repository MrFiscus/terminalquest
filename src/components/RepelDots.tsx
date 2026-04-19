import { useEffect, useRef } from "react";

interface DotData {
  homeX: number; // px
  homeY: number; // px
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface RepelDotsProps {
  count?: number;
}

// Deterministic pseudo-random spread so dots don't cluster
function spread(i: number, total: number): { x: number; y: number } {
  // Golden-ratio-based grid with jitter for even distribution
  const phi = (1 + Math.sqrt(5)) / 2;
  const x = ((i / phi) % 1) * 100;
  const y = (i / total) * 100 + ((i * 7.3) % 8) - 4;
  return { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
}

const REPEL_RADIUS = 120;
const REPEL_STRENGTH = 18;
const SPRING = 0.06;
const DAMPING = 0.72;

export function RepelDots({ count = 80 }: RepelDotsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsPhysics = useRef<DotData[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const elRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;

    dotsPhysics.current = Array.from({ length: count }, (_, i) => {
      const { x, y } = spread(i, count);
      const homeX = x / 100 * W;
      const homeY = y / 100 * H;
      return { homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0 };
    });

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    const tick = () => {
      const { x: mx, y: my } = mouseRef.current;

      dotsPhysics.current.forEach((dot, i) => {
        const el = elRefs.current[i];
        if (!el) return;

        // Repulsion from cursor
        const dx = dot.x - mx;
        const dy = dot.y - my;
        const distSq = dx * dx + dy * dy;
        if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) ** 2;
          dot.vx += (dx / dist) * force * REPEL_STRENGTH;
          dot.vy += (dy / dist) * force * REPEL_STRENGTH;
        }

        // Spring back to home
        dot.vx += (dot.homeX - dot.x) * SPRING;
        dot.vy += (dot.homeY - dot.y) * SPRING;

        // Damping
        dot.vx *= DAMPING;
        dot.vy *= DAMPING;

        // Integrate
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Apply as transform offset from home position
        el.style.transform = `translate(${dot.x - dot.homeX}px, ${dot.y - dot.homeY}px)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [count]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0" style={{ zIndex: 2 }}>
      {Array.from({ length: count }, (_, i) => {
        const { x, y } = spread(i, count);
        const size = i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4;
        const duration = `${6 + (i % 4) * 1.2}s`;
        const delay = `${(i * 0.9) % 7}s`;

        return (
          // Outer: physics moves this via transform
          <div
            key={i}
            ref={el => { elRefs.current[i] = el; }}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              willChange: "transform",
            }}
          >
            {/* Inner: owns only the opacity animation */}
            <div
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: "hsl(40 100% 70%)",
                boxShadow: "0 0 6px 2px hsl(30 100% 55% / 0.7)",
                animation: `dot-blink ${duration} linear infinite`,
                animationDelay: delay,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
