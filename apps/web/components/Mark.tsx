/** Original project monogram (not a Space Apps or NASA mark): a spherical diffusion flame in microgravity —
 *  a soft ember inside a hairline sphere, coloured from the Space Apps palette (guide p.7). */
export default function Mark({ size = 30, id = "mk", className = "mark" }: { size?: number; id?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-ember`} cx="50%" cy="54%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#EAFE07" />
          <stop offset="52%" stopColor="#E43700" stopOpacity=".9" />
          <stop offset="100%" stopColor="#E43700" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="62%" stopColor="#2E96F5" stopOpacity="0" />
          <stop offset="86%" stopColor="#2E96F5" stopOpacity=".22" />
          <stop offset="100%" stopColor="#2E96F5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-halo)`} />
      <circle cx="16" cy="16" r="13.25" fill="none" stroke="#FFFFFF" strokeWidth=".9" strokeOpacity=".75" />
      <circle className="mark-ember" cx="16" cy="16.4" r="9.5" fill={`url(#${id}-ember)`} />
      <circle cx="16" cy="16" r="13.25" fill="none" stroke="#2E96F5" strokeWidth=".9" strokeDasharray="1.2 5.4" strokeOpacity=".35" />
    </svg>
  );
}
