"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Slim catalog status for the top rail. Reads the existing /api/meta endpoint. */
export default function CatalogStatus() {
  const [c, setC] = useState<{ investigations: number; test_runs: number } | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => { api("/api/meta").then((m: any) => setC(m.counts)).catch(() => setDown(true)); }, []);
  return (
    <p className="rail-status" aria-live="polite">
      <span className={`dot ${down ? "dot-off" : c ? "dot-on" : ""}`} aria-hidden="true" />
      {down ? "Catalog offline" : c ? <>PSI catalog <b>{c.investigations}</b> inv. · <b>{c.test_runs.toLocaleString("en-US")}</b> rows</> : "Reading catalog…"}
    </p>
  );
}
