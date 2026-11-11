/** Original monogram: a spherical diffusion flame in microgravity — a soft ember inside a hairline sphere. */
export default function Mark({ size = 30, id = "mk", className = "mark" }: { size?: number; id?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-ember`} cx="50%" cy="54%" r="50%">
          <stop offset="0%" stopColor="#fff1d6" />
          <stop offset="22%" stopColor="#f6c27a" />
          <stop offset="52%" stopColor="#e08a3c" stopOpacity=".85" />
          <stop offset="100%" stopColor="#e08a3c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="62%" stopColor="#e08a3c" stopOpacity="0" />
          <stop offset="86%" stopColor="#e08a3c" stopOpacity=".22" />
          <stop offset="100%" stopColor="#e08a3c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-halo)`} />
      <circle cx="16" cy="16" r="13.25" fill="none" stroke="#c98a52" strokeWidth=".9" strokeOpacity=".75" />
      <circle className="mark-ember" cx="16" cy="16.4" r="9.5" fill={`url(#${id}-ember)`} />
      <circle cx="16" cy="16" r="13.25" fill="none" stroke="#f2cf7a" strokeWidth=".9" strokeDasharray="1.2 5.4" strokeOpacity=".35" />
    </svg>
  );
}
