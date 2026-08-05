import { useEffect, useRef } from "react";

/**
 * The Aura orb — a real 3D sphere on a canvas, not a styled div.
 *
 * Points are distributed on an actual sphere and perspective-projected every
 * frame, so depth drives each point's size and brightness and the thing
 * genuinely turns. Three tilted orbital rings are drawn in two passes (behind
 * the sphere dim, in front bright) so they visibly pass around it.
 *
 * This is the surface the assistant will eventually live on: the render already
 * takes a `focus` colour and a spin impulse, which is the same mechanism a
 * listening/thinking/speaking state would drive. Keeping it one canvas means
 * that lands without redesigning the screen around it.
 *
 * Canvas is deliberately much larger than the sphere — see SIZE below.
 */

const PALETTE = ["#4FD8E8", "#7C5CFC", "#C53C98", "#F0A93B"];

/**
 * Sized off the widest PROJECTED orbit, not the sphere radius.
 *
 * Perspective pushes the outer ring to ~115px from centre even though the
 * sphere itself only reaches ~78px. A canvas sized to the sphere clips the
 * rings' outer arc against the bitmap edge — the artwork is simply not there
 * to draw. 280 leaves ~25px of clearance including the travelling sparks.
 */
const SIZE = 280;
const R = 72;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TILT = -0.42;
/** Distance of the virtual camera; smaller = stronger perspective. */
const CAM = 2.6;

interface P3 {
  x: number;
  y: number;
  z: number;
}
interface Ring {
  pts: P3[];
  colour: string;
  weight: number;
  phase: number;
  speed: number;
}

/** Even point distribution via the golden-angle spiral. */
function spherePoints(n: number): (P3 & { colour: string })[] {
  const out: (P3 & { colour: string })[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden;
    out.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      colour: PALETTE[i % PALETTE.length],
    });
  }
  return out;
}

function makeRing(
  tiltX: number,
  tiltZ: number,
  radius: number,
  count: number,
  colour: string,
  weight: number,
): Ring {
  const pts: P3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    // rotate the flat circle out of the XZ plane so the rings cross
    const y2 = -z * Math.sin(tiltX);
    const z2 = z * Math.cos(tiltX);
    pts.push({
      x: x * Math.cos(tiltZ) - y2 * Math.sin(tiltZ),
      y: x * Math.sin(tiltZ) + y2 * Math.cos(tiltZ),
      z: z2,
    });
  }
  return { pts, colour, weight, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.9 };
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function AuraOrb({
  /** 0-100, or null when there is not enough data to score. */
  score,
  /** When set, the whole orb takes this colour — used to focus one pillar. */
  focus,
  label = "Balance",
  className = "",
}: {
  score: number | null;
  focus?: string | null;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read inside the loop rather than captured, so a colour change does not
  // need to tear down and restart the animation.
  const focusRef = useRef<string | null | undefined>(focus);
  focusRef.current = focus;
  const boostRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const points = spherePoints(150);
    const rings = [
      makeRing(1.15, 0.25, 1.26, 120, "#7C5CFC", 1.4),
      makeRing(-0.75, -0.5, 1.36, 120, "#4FD8E8", 1.1),
      makeRing(0.35, 1.1, 1.12, 120, "#C53C98", 0.9),
    ];

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let angle = 0;
    let tick = 0;
    let raf = 0;

    const project = (p: P3) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const ct = Math.cos(TILT);
      const st = Math.sin(TILT);
      const x = p.x * ca - p.z * sa;
      const zr = p.x * sa + p.z * ca;
      const y = p.y * ct - zr * st;
      const depth = p.y * st + zr * ct;
      const persp = 1 / (CAM - depth);
      return {
        sx: CX + x * R * persp * CAM,
        sy: CY + y * R * persp * CAM,
        depth,
      };
    };

    const draw = () => {
      tick += 1;
      angle += 0.0035 + boostRef.current;
      boostRef.current *= 0.94;

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.globalCompositeOperation = "lighter";

      // lit core — the sphere reads as a body, not a cloud of dots
      const core = ctx.createRadialGradient(
        CX - R * 0.3, CY - R * 0.34, R * 0.06,
        CX, CY, R * 1.02,
      );
      core.addColorStop(0, "rgba(150,130,255,0.55)");
      core.addColorStop(0.34, "rgba(76,60,180,0.30)");
      core.addColorStop(0.72, "rgba(30,18,70,0.22)");
      core.addColorStop(1, "rgba(8,4,20,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.05, 0, Math.PI * 2);
      ctx.fill();

      for (const ring of rings) {
        const colour = focusRef.current || ring.colour;
        // pass 0 = the half behind the sphere (dim), pass 1 = in front (bright)
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          let started = false;
          for (const pt of ring.pts) {
            const pr = project(pt);
            const inFront = pr.depth > 0;
            if ((pass === 0 && inFront) || (pass === 1 && !inFront)) {
              started = false;
              continue;
            }
            if (!started) {
              ctx.moveTo(pr.sx, pr.sy);
              started = true;
            } else {
              ctx.lineTo(pr.sx, pr.sy);
            }
          }
          ctx.strokeStyle = rgba(colour, pass === 0 ? 0.14 : 0.55);
          ctx.lineWidth = ring.weight * (pass === 0 ? 0.8 : 1);
          ctx.stroke();
        }

        // a spark travelling the orbit — reads as motion even at a glance
        const idx = Math.floor(
          (((tick * ring.speed * 0.006 + ring.phase) % 1) + 1) % 1 * ring.pts.length,
        );
        const sp = project(ring.pts[idx]);
        if (sp.depth > -0.2) {
          const g = ctx.createRadialGradient(sp.sx, sp.sy, 0, sp.sx, sp.sy, 7);
          g.addColorStop(0, rgba(colour, 0.95));
          g.addColorStop(1, rgba(colour, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sp.sx, sp.sy, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of points) {
        const pr = project(p);
        const d = (pr.depth + 1) / 2; // 0 back .. 1 front
        ctx.fillStyle = rgba(focusRef.current || p.colour, 0.06 + d * d * 0.72);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 0.5 + d * 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // specular — the highlight is what makes it read as a lit object
      ctx.globalCompositeOperation = "source-over";
      const spec = ctx.createRadialGradient(
        CX - R * 0.34, CY - R * 0.4, 0,
        CX - R * 0.34, CY - R * 0.4, R * 0.85,
      );
      spec.addColorStop(0, "rgba(255,255,255,0.30)");
      spec.addColorStop(0.35, "rgba(255,255,255,0.05)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.1, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: SIZE, height: SIZE }}
      onClick={() => {
        boostRef.current = 0.075;
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: "14%",
          background:
            "radial-gradient(circle, rgba(124,92,252,.30) 0%, rgba(197,60,152,.13) 45%, transparent 68%)",
          filter: "blur(18px)",
        }}
      />
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={score === null ? `${label}: not enough data yet` : `${label}: ${score} out of 100`}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[46px] font-semibold leading-none tracking-[-0.045em] text-white tabular-nums"
          style={{ textShadow: "0 2px 26px rgba(8,4,20,.75)" }}
        >
          {score === null ? "—" : score}
        </span>
        <span
          className="mt-[7px] text-[9px] font-bold uppercase tracking-[0.24em] text-white/80"
          style={{ textShadow: "0 1px 10px rgba(8,4,20,.8)" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
