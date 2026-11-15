"use client";
import type { KeyboardEvent } from "react";
import { FACE_INFO, type Face } from "@/lib/fireDynamics";

/* The tetrahedron drawn as its unfolded net: fold the three outer triangles up along the dashed edges and they meet
   above the centre one. Outer vertices A (top), B (bottom-left), C (bottom-right); edge midpoints D (AB), E (AC), F (BC). */
const A = [200, 14], B = [14, 336], C = [386, 336];
const D = [107, 175], E = [293, 175], F = [200, 336];
const pts = (...p: number[][]) => p.map((q) => q.join(",")).join(" ");

const GEOMETRY: Record<Face, { points: string; label: [number, number] }> = {
  heat: { points: pts(A, D, E), label: [200, 128] },
  fuel: { points: pts(D, B, F), label: [107, 286] },
  oxidizer: { points: pts(E, F, C), label: [293, 286] },
  reaction: { points: pts(D, E, F), label: [200, 222] },
};
const ORDER: Face[] = ["heat", "fuel", "oxidizer", "reaction"];

export default function FireTetrahedron({ selected, onToggle }: { selected: Face[]; onToggle: (f: Face) => void }) {
  const key = (f: Face) => (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(f); }
  };
  return (
    <figure className="fd-tetra">
      <svg viewBox="0 0 400 350" role="group" aria-label="Fire Tetrahedron: select one or more faces">
        <defs>
          <linearGradient id="fd-g-heat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FC6A21" /><stop offset="1" stopColor="#E43700" /></linearGradient>
          <linearGradient id="fd-g-fuel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B62A00" /><stop offset="1" stopColor="#8E1100" /></linearGradient>
          <linearGradient id="fd-g-oxidizer" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2E96F5" /><stop offset="1" stopColor="#0960E1" /></linearGradient>
          <linearGradient id="fd-g-reaction" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0042A6" /><stop offset="1" stopColor="#0A3584" /></linearGradient>
        </defs>
        {ORDER.map((f) => {
          const on = selected.includes(f);
          const g = GEOMETRY[f];
          const info = FACE_INFO[f];
          return (
            <g key={f} role="checkbox" aria-checked={on} aria-label={`${info.name}: ${info.meaning}`} tabIndex={0}
              className={`fd-face fd-face-${f}${on ? " on" : ""}`} onClick={() => onToggle(f)} onKeyDown={key(f)}>
              <polygon points={g.points} fill={`url(#fd-g-${f})`} />
              <text x={g.label[0]} y={g.label[1]} textAnchor="middle" className="fd-face-name">{f === "reaction" ? "Chain" : info.short}</text>
              {f === "reaction" && <text x={g.label[0]} y={g.label[1] + 20} textAnchor="middle" className="fd-face-name">reaction</text>}
              {on && <text x={g.label[0]} y={g.label[1] + (f === "reaction" ? 42 : 22)} textAnchor="middle" className="fd-face-tick" aria-hidden="true">● selected</text>}
            </g>
          );
        })}
        <polyline points={pts(D, E, F, D)} className="fd-fold" aria-hidden="true" />
      </svg>
      <figcaption className="muted small">Unfolded view: fold the three outer faces up along the dashed edges and they meet in a tetrahedron. Click or press Space on a face to select it.</figcaption>
    </figure>
  );
}
