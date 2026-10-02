import { useEffect, useRef } from "react";

/**
 * The Aura orb — a geodesic lattice on a canvas, not a styled div.
 *
 * Nodes are distributed on an actual sphere, joined to their nearest
 * neighbours by struts, and perspective-projected every frame, so depth drives
 * each node's size and brightness and the thing genuinely turns. You see
 * through it: the far half of the lattice is visible behind the near half,
 * which is what makes it read as a structure rather than a ball.
 *
 * It replaced a solid shaded sphere with a particle skin. That version had two
 * problems this one does not. The ball was opaque, so its own detail sat on a
 * flat surface and washed out in light mode; and the readout sat ON the ball,
 * which meant the body gradient had to be tuned around the text's contrast.
 * The number now sits against the page, where it has roughly 16:1 in either
 * theme and the artwork is free to be whatever it wants.
 *
 * This is the surface the assistant will eventually live on: the render
 * already takes a `focus` colour and a spin impulse, which is the same
 * mechanism a listening/thinking/speaking state would drive.
 */

/**
 * Node colours, and they are not arbitrary: these are the four pillar hues
 * plus the brand violet. The lattice is literally made of the things the
 * score is made of, which is also why tapping a pillar can tint the whole orb.
 */
const PALETTE = ["#7C5CFC", "#4FD8E8", "#3fd9a4", "#ff8a73", "#a98bff"];

const SIZE = 280;
/** Bigger than the old sphere: with no outer orbits to clear, the lattice
 *  itself can fill the box, so the orb has more presence at the same size. */
const R = 104;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TILT = -0.42;
/** Distance of the virtual camera; smaller = stronger perspective. */
const CAM = 2.6;
const NODES = 56;
/** Struts per node. 5 gives the triangulated look without turning to mesh. */
const LINKS = 5;

interface P3 {
  x: number;
  y: number;
  z: number;
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

/**
 * Join each node to its nearest neighbours.
 *
 * Nearest-k rather than an angular cutoff: the golden-angle spiral does not
 * space points perfectly evenly, so a fixed cutoff leaves some nodes isolated
 * and others over-connected. k guarantees every node is part of the structure
 * whatever the count.
 */
function buildEdges(pts: P3[], k: number): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const near = pts
      .map((q, j) => ({
        j,
        d: pts[i].x * q.x + pts[i].y * q.y + pts[i].z * q.z,
      }))
      .filter((e) => e.j !== i)
      .sort((a, b) => b.d - a.d)
      .slice(0, k);
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }
  return edges;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The same hue pushed toward black — light mode needs marks DARKER than the
 *  page, which is the inverse of the dark theme's glow, not a dimmer copy. */
function shade(hex: string, amount: number, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const k = 1 - amount;
  return `rgba(${Math.round(((n >> 16) & 255) * k)},${Math.round(
    ((n >> 8) & 255) * k,
  )},${Math.round((n & 255) * k)},${a})`;
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

    const nodes = spherePoints(NODES);
    const edges = buildEdges(nodes, LINKS);

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let angle = 0;
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
        scale: persp * CAM,
      };
    };

    /**
     * How much of a mark survives near the middle.
     *
     * The lattice is see-through, so without this the far half's struts run
     * straight across the readout. Rather than put a plate behind the number —
     * which read as a disc stuck on the artwork last time it was tried — the
     * structure itself thins toward the centre. It looks like depth of field
     * and costs nothing, because the detail that makes a sphere read as round
     * lives at the rim.
     */
    const clearOfReadout = (sx: number, sy: number) => {
      const d = Math.hypot(sx - CX, sy - CY) / R;
      return Math.min(1, Math.max(0, (d - 0.3) / 0.28));
    };

    // Paints exactly one frame and schedules nothing. Keeping "render" and
    // "keep rendering" separate is what lets the theme observer below repaint
    // safely — calling a self-scheduling draw() from there would start a
    // second concurrent rAF loop and double the spin speed.
    const renderFrame = () => {
      angle += 0.0035 + boostRef.current;
      boostRef.current *= 0.94;

      // Read the theme per frame rather than capturing it: the toggle can flip
      // while this is mounted, and one cheap classList check is far less work
      // than tearing the loop down and restarting it.
      const dark = document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, SIZE, SIZE);
      // Additive blending is what makes the lattice read as lit, but it only
      // works against darkness — on white every channel saturates. The light
      // theme draws the same geometry as dark ink instead.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      const pr = nodes.map(project);

      // Struts first so nodes sit on top of their own connections.
      ctx.lineCap = "round";
      for (const [a, b] of edges) {
        const pa = pr[a];
        const pb = pr[b];
        const d = (pa.depth + pb.depth) / 2;
        const t = (d + 1) / 2; // 0 back .. 1 front
        const clear =
          clearOfReadout((pa.sx + pb.sx) / 2, (pa.sy + pb.sy) / 2);
        const alpha = (dark ? 0.05 + t * 0.3 : 0.06 + t * 0.26) * clear;
        if (alpha <= 0.004) continue;
        const colour = focusRef.current || nodes[a].colour;
        ctx.strokeStyle = dark
          ? rgba(colour, alpha)
          : shade(colour, 0.55, alpha);
        ctx.lineWidth = 0.45 + t * 0.85;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Nodes back-to-front so the near ones genuinely occlude the far ones.
      const order = pr
        .map((p, i) => ({ i, depth: p.depth }))
        .sort((a, b) => a.depth - b.depth);

      for (const { i } of order) {
        const p = pr[i];
        const t = (p.depth + 1) / 2;
        const clear = clearOfReadout(p.sx, p.sy);
        const alpha = (dark ? 0.12 + t * t * 0.8 : 0.18 + t * t * 0.62) * clear;
        if (alpha <= 0.004) continue;
        const colour = focusRef.current || nodes[i].colour;
        // Radius follows perspective, so the near face carries bigger balls —
        // the single strongest depth cue in the whole render.
        const radius = (1.5 + t * 2.9) * p.scale * 0.72;

        if (dark) {
          const glow = ctx.createRadialGradient(
            p.sx, p.sy, 0,
            p.sx, p.sy, radius * 2.0,
          );
          glow.addColorStop(0, rgba(colour, alpha * 0.5));
          glow.addColorStop(1, rgba(colour, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius * 2.0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = dark
          ? rgba(colour, alpha)
          : shade(colour, 0.32, alpha);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        ctx.fill();

        // A highlight on the near face only — what turns a filled circle into
        // a ball. Skipped on the far half, where it would read as noise.
        if (t > 0.55) {
          ctx.globalCompositeOperation = "source-over";
          // `clear` applies here too. Without it the specular — which is very
          // nearly opaque white at the near pole — ignored the readout safe
          // zone and could land directly behind the number, measured at
          // 1.00:1 against white text. Every mark the lattice draws has to
          // respect the same zone, not just the ones that were obvious.
          ctx.fillStyle = `rgba(255,255,255,${
            (t - 0.55) * (dark ? 0.9 : 0.55) * clear
          })`;
          ctx.beginPath();
          ctx.arc(
            p.sx - radius * 0.3,
            p.sy - radius * 0.34,
            radius * 0.34,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
        }
      }

      /**
       * Readout scrim.
       *
       * The lattice is see-through, so whatever is behind the number is
       * whatever happens to be rotating past — and in dark mode an additive
       * node glow drifting through measured 1.57:1 against white text.
       * Thinning the structure alone could not fix it without hollowing out
       * the middle of the sphere.
       *
       * This is a radial wash of the PAGE's own colour, so it has no edge and
       * reads as depth of field rather than a plate. An earlier attempt at a
       * plate failed because it was a DARK disc drawn on the light theme,
       * where it showed up as a black ring; painting the page colour in each
       * theme is the version of that idea that actually works.
       */
      ctx.globalCompositeOperation = "source-over";
      const pageRGB = dark ? "13,10,24" : "246,244,252";
      // Elliptical, not circular: the readout is a wide, short block, and a
      // circle big enough to cover it also washes out the sphere's whole
      // interior. The ellipse hugs the text band — number AND label; sizing
      // it to the number alone left the 9px label at 2.38:1 with the lattice
      // running behind it.
      const RX = R * 0.86;
      const RY = R * 0.64;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.scale(1, RY / RX);
      const scrim = ctx.createRadialGradient(0, 0, 0, 0, 0, RX);
      scrim.addColorStop(0, `rgba(${pageRGB},0.95)`);
      scrim.addColorStop(0.72, `rgba(${pageRGB},0.9)`);
      scrim.addColorStop(1, `rgba(${pageRGB},0)`);
      ctx.fillStyle = scrim;
      ctx.beginPath();
      ctx.arc(0, 0, RX, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      renderFrame();
      raf = requestAnimationFrame(loop);
    };

    if (reduced) renderFrame();
    else loop();

    /**
     * Repaint when the theme flips.
     *
     * The dark and light renders are different materials, and the choice is
     * made per frame. With the loop running that self-corrects immediately —
     * but under prefers-reduced-motion only one frame is ever drawn, so a
     * theme toggle would otherwise strand the orb in the wrong material for
     * the life of the mount. It also covers the first frame landing before
     * the theme has resolved.
     */
    const themeObserver = new MutationObserver(renderFrame);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`relative select-none ${className}`}
      /*
        The canvas is always drawn at SIZE and stretched to fill this box, so
        shrinking the box costs nothing in the drawing maths and gains
        sharpness — a 280px render shown at 200px is supersampled.

        It is viewport-relative because on a 667px phone (iPhone SE, still
        common) a fixed 280px orb took 42% of the screen and pushed every
        single mission row below the fold: you had to scroll to see one thing
        you were meant to do today. The hero may dominate the screen; it may
        not displace the plan.
      */
      style={
        {
          "--orb": `min(${SIZE}px, 30vh)`,
          width: "var(--orb)",
          height: "var(--orb)",
        } as React.CSSProperties
      }
      onClick={() => {
        boostRef.current = 0.075;
      }}
    >
      {/* Ambient bloom. Subtle on light, where there is no longer a solid body
          to sit behind — it only has to suggest the lattice is lit. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full opacity-40 dark:opacity-100"
        style={{
          inset: "16%",
          background:
            "radial-gradient(circle, rgba(124,92,252,.26) 0%, rgba(79,216,232,.10) 48%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={
          score === null
            ? `${label}: not enough data yet`
            : `${label}: ${score} out of 100`
        }
      />
      {/*
        The readout sits in the middle of the lattice, against the page rather
        than against a painted body — so it is simply the page's own text
        colour, and measures ~16:1 in both themes instead of needing a
        gradient tuned around it.
      */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          style={{ fontSize: "calc(var(--orb) * 0.2)" }}
          className="font-semibold leading-none tracking-[-0.045em] tabular-nums text-slate-900 dark:text-white"
        >
          {score === null ? "—" : score}
        </span>
        <span
          /* Floored. Proportional alone put this at 6.7px once the orb became
             viewport-relative, which is too small to read at any distance. */
          style={{ fontSize: "max(9px, calc(var(--orb) * 0.044))" }}
          className="mt-[7px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-white/70"
        >
          {label}
        </span>
      </div>
    </div>
  );
}
