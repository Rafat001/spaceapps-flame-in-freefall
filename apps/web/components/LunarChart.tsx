"use client";
// O2 (% by volume) vs absolute pressure (kPa), log-x. The lunar target box is O2 >= 30 % and P <= 10.2 psi.
export default function LunarChart({ data }: { data: any }) {
  const W = 680, H = 360, L = 56, R = 16, T = 16, B = 46;
  const pts = data.points as any[];
  const pMin = 1, pMax = Math.max(1100, ...pts.map((p) => p.p_max || p.p_min));
  const lx = (p: number) => L + ((Math.log10(Math.max(p, pMin)) - Math.log10(pMin)) / (Math.log10(pMax) - Math.log10(pMin))) * (W - L - R);
  const ly = (o: number) => H - B - (Math.min(o, 100) / 100) * (H - T - B);
  const t = data.target;
  const ticksP = [1, 10, 70.33, 101.3, 1000].filter((x) => x <= pMax);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Scatter of ${pts.length} PSI rows: oxygen percent against pressure, with the lunar habitat target box`}>
        <rect x={lx(pMin)} y={ly(100)} width={lx(t.pressure_kpa_max) - lx(pMin)} height={ly(t.oxygen_pct_min) - ly(100)} className="chart-box" />
        <text x={lx(pMin) + 6} y={ly(100) + 16} className="chart-box-label">Lunar habitat target (brief): O2 ≥ 30 %, ≤ 10.2 psi</text>
        {ticksP.map((x) => (<g key={x}><line x1={lx(x)} x2={lx(x)} y1={T} y2={H - B} className="chart-grid" />
          <text x={lx(x)} y={H - B + 16} textAnchor="middle" className="chart-tick">{x === 70.33 ? "70.3 (10.2 psi)" : x === 101.3 ? "101.3 (1 atm)" : x}</text></g>))}
        {[0, 21, 30, 50, 85, 100].map((o) => (<g key={o}><line x1={L} x2={W - R} y1={ly(o)} y2={ly(o)} className="chart-grid" />
          <text x={L - 6} y={ly(o) + 4} textAnchor="end" className="chart-tick">{o}</text></g>))}
        {pts.map((p, i) => (
          <circle key={i} cx={lx(p.p_min)} cy={ly(p.o2_max)} r={p.in_target ? 3.6 : 2.2}
            className={p.in_target ? (p.stream ? "pt pt-stream" : p.matrix ? "pt pt-matrix" : "pt pt-hit") : "pt"}>
            <title>{`${p.acronym} ${p.subtable || ""} CSV record ${p.row}: O2 ${p.o2_max.toFixed(1)} %, ${p.p_min.toFixed(1)} kPa${p.stream ? " (burner oxidizer stream)" : ""}`}</title>
          </circle>))}
        <text x={(W + L) / 2} y={H - 8} textAnchor="middle" className="chart-axis">Pressure, kPa (log scale; lowest value of each row)</text>
        <text x={14} y={(H - B) / 2} transform={`rotate(-90 14 ${(H - B) / 2})`} textAnchor="middle" className="chart-axis">O2, % by volume (highest value of each row)</text>
      </svg>
      <figcaption>{pts.length} PSI rows with both O2 and pressure reported. Filled dots meet the target on the same row:
        <span className="key key-hit">ambient</span> <span className="key key-stream">burner oxidizer stream (inverse flames)</span> <span className="key key-matrix">planned test matrix</span>. {data.note}</figcaption>
    </figure>
  );
}
