"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Home"], ["/explorer", "Explorer"], ["/coverage", "Has it been done?"], ["/compare", "Compare"],
  ["/insights", "Relevance ranking"], ["/assistant", "Ask the evidence"], ["/settings", "AI settings"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main">
      <ul>
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <Link href={href} aria-current={(href === "/" ? path === "/" : path?.startsWith(href)) ? "page" : undefined}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
