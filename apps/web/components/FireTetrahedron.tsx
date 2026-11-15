"use client";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { FACE_INFO, FACES, type Face } from "@/lib/fireDynamics";

/* A real 3D tetrahedron, projected to SVG by hand (no WebGL dependency): four faces lit by a fixed light, depth-sorted
   each frame (painter's algorithm; exact for a convex solid). It idles in a slow spin, can be dragged to rotate, and
   turns to face the current selection. The SVG is decorative for assistive tech; the toggle buttons below it are the
   accessible controls, because faces of a rotating solid have no stable keyboard order. */

type V3 = [number, number, number];
// Regular tetrahedron standing on its base like a pyramid (apex up, centroid at the origin); circumradius √3.
const R3 = Math.sqrt(3);
const VERTS: V3[] = [
  [R3 * Math.sqrt(8 / 9), -R3 / 3, 0], [-R3 * Math.sqrt(2 / 9), -R3 / 3, R3 * Math.sqrt(2 / 3)],
  [-R3 * Math.sqrt(2 / 9), -R3 / 3, -R3 * Math.sqrt(2 / 3)], [0, R3, 0],
];
// Each face is the triangle opposite one vertex; the base (opposite the apex) is the chain reaction.
const FACE_VERTS: Record<Face, [number, number, number]> = { heat: [1, 2, 3], fuel: [0, 2, 3], oxidizer: [0, 1, 3], reaction: [0, 1, 2] };
const OPPOSITE: Record<Face, number> = { heat: 0, fuel: 1, oxidizer: 2, reaction: 3 };
const COLORS: Record<Face, [string, string]> = {
  heat: ["#FC6A21", "#E43700"], fuel: ["#C7340A", "#8E1100"], oxidizer: ["#2E96F5", "#0960E1"], reaction: ["#1F5FCF", "#0A3584"],
};
const LIGHT: V3 = norm([-0.45, 0.7, 0.85]); // upper-left-front, model space (+y up)
const CX = 200, CY = 190, SCALE = 92, CAMERA = 7;

function norm(v: V3): V3 { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Outward unit normal of a face in model space (points away from the opposite vertex). */
export function faceNormal(f: Face): V3 { const o = VERTS[OPPOSITE[f]]; return norm([-o[0], -o[1], -o[2]]); }

/** Rotate by yaw (about y) then pitch (about x). Screen y grows downward, so model +y is drawn up. */
function rotate([x, y, z]: V3, yaw: number, pitch: number): V3 {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return [x1, y * Math.cos(pitch) - z1 * Math.sin(pitch), y * Math.sin(pitch) + z1 * Math.cos(pitch)];
}

/** Yaw/pitch that turn direction n straight toward the viewer (+z). */
export function orientationFacing(n: V3): { yaw: number; pitch: number } {
  const yaw = Math.atan2(-n[0], n[2]);
  return { yaw, pitch: Math.atan2(n[1], Math.hypot(n[0], n[2])) };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export default function FireTetrahedron({ selected, onToggle }: { selected: Face[]; onToggle: (f: Face) => void }) {
  const [rot, setRot] = useState({ yaw: 0.5, pitch: -0.5 });
  const rotRef = useRef(rot);
  const target = useRef<{ yaw: number; pitch: number } | null>(null);
  const spinning = useRef(true);
  const drag = useRef<{ x: number; y: number; moved: boolean; face: Face | null } | null>(null);
  const reduced = useRef(false);

  // Turn the selection toward the viewer: the mean normal of the selected faces (all four cancel out → keep spinning).
  const selKey = selected.join(",");
  useEffect(() => {
    if (!selected.length) { target.current = null; return; }
    const s = selected.map(faceNormal).reduce<V3>((a, n) => [a[0] + n[0], a[1] + n[1], a[2] + n[2]], [0, 0, 0]);
    if (Math.hypot(...s) < 1e-6) { target.current = null; spinning.current = true; return; }
    const t = orientationFacing(norm(s));
    // Tilt slightly so the solid still reads as 3D rather than a flat triangle.
    target.current = { yaw: t.yaw + (selected.length === 1 ? 0.45 : 0), pitch: t.pitch - 0.3 };
    spinning.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  useEffect(() => {
    reduced.current = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const cur = rotRef.current;
      let next = cur;
      const t = target.current;
      if (drag.current?.moved) { /* the pointer drives rotation */ }
      else if (t) {
        const k = reduced.current ? 1 : 1 - Math.pow(0.002, dt);
        const dy = wrap(t.yaw - cur.yaw), dp = t.pitch - cur.pitch;
        if (Math.abs(dy) > 1e-4 || Math.abs(dp) > 1e-4) next = { yaw: cur.yaw + dy * k, pitch: cur.pitch + dp * k };
      } else if (spinning.current && !reduced.current) next = { yaw: cur.yaw + dt * 0.35, pitch: cur.pitch };
      if (next !== cur) { rotRef.current = next; setRot(next); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    const face = ((e.target as Element).closest("[data-face]") as HTMLElement | null)?.dataset.face as Face | undefined;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, face: face ?? null };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true; d.x = e.clientX; d.y = e.clientY;
    target.current = null; spinning.current = false;
    const cur = rotRef.current;
    const next = { yaw: cur.yaw + dx * 0.012, pitch: Math.max(-1.4, Math.min(1.4, cur.pitch - dy * 0.012)) };
    rotRef.current = next; setRot(next);
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (d && !d.moved && d.face) onToggle(d.face);
  };

  const faces = FACES.map((f) => {
    const pts = FACE_VERTS[f].map((i) => rotate(VERTS[i], rot.yaw, rot.pitch));
    const n = rotate(faceNormal(f), rot.yaw, rot.pitch);
    const proj = pts.map(([x, y, z]) => { const s = SCALE * CAMERA / (CAMERA - z); return [CX + x * s, CY - y * s] as const; });
    const depth = (pts[0][2] + pts[1][2] + pts[2][2]) / 3;
    const c = [(proj[0][0] + proj[1][0] + proj[2][0]) / 3, (proj[0][1] + proj[1][1] + proj[2][1]) / 3];
    const facing = n[2];
    const light = 0.35 + 0.65 * Math.max(0, dot(n, LIGHT));
    return { f, proj, depth, c, facing, light };
  }).sort((a, b) => a.depth - b.depth);

  return (
    <figure className="fd-tetra">
      <svg viewBox="0 0 400 370" aria-hidden="true" className="fd-tetra-3d"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}>
        <defs>
          {FACES.map((f) => (
            <linearGradient key={f} id={`fd3-${f}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={COLORS[f][0]} /><stop offset="1" stopColor={COLORS[f][1]} />
            </linearGradient>))}
          <radialGradient id="fd3-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#E43700" stopOpacity=".28" /><stop offset="1" stopColor="#E43700" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fd3-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#000" stopOpacity=".45" /><stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r="170" fill="url(#fd3-glow)" />
        <ellipse cx={CX} cy="352" rx="110" ry="12" fill="url(#fd3-shadow)" opacity=".6" />
        {faces.map(({ f, proj, facing, light }) => {
          const on = selected.includes(f);
          const points = proj.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
          return (
            <g key={f} data-face={f} className={`fd3-face${on ? " on" : ""}${facing < 0 ? " back" : ""}`}>
              <polygon points={points} fill={`url(#fd3-${f})`} />
              <polygon points={points} fill="#000" opacity={(1 - light) * 0.75} className="fd3-shade" />
              <polygon points={points} className="fd3-edge" />
            </g>
          );
        })}
        {faces.filter((x) => x.facing > 0.2).map(({ f, c, facing }) => {
          const on = selected.includes(f);
          const size = 13 + 9 * facing;
          return (
            <g key={`l-${f}`} className="fd3-label" opacity={Math.min(1, (facing - 0.2) * 2.5)}>
              {f === "reaction" ? (
                <text x={c[0]} y={c[1] - size * 0.15} textAnchor="middle" fontSize={size}>
                  <tspan x={c[0]}>Chain</tspan><tspan x={c[0]} dy={size}>reaction</tspan></text>
              ) : <text x={c[0]} y={c[1] + size * 0.35} textAnchor="middle" fontSize={size}>{FACE_INFO[f].short}</text>}
              {on && <text x={c[0]} y={c[1] + size * (f === "reaction" ? 1.9 : 1.4)} textAnchor="middle" className="fd3-tick">●</text>}
            </g>
          );
        })}
      </svg>
      <div className="fd-face-buttons" role="group" aria-label="Fire Tetrahedron faces">
        {FACES.map((f) => (
          <button key={f} type="button" aria-pressed={selected.includes(f)} className={`fd-face-btn fd-face-btn-${f}${selected.includes(f) ? " on" : ""}`}
            onClick={() => onToggle(f)} title={FACE_INFO[f].meaning}>{FACE_INFO[f].name}</button>
        ))}
      </div>
      <figcaption className="muted small">Drag to rotate. Click a face, or use the buttons, to select it; selected faces turn toward you.</figcaption>
    </figure>
  );
}
