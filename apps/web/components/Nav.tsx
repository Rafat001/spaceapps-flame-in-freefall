"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/lunar", "Lunar"], ["/explorer", "Catalog"], ["/coverage", "Coverage"], ["/compare", "Compare"],
  ["/insights", "Ranking"], ["/assistant", "Ask"], ["/earth", "Earth"], ["/settings", "Settings"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="nav">
      <ul>
        {LINKS.map(([href, label], i) => {
          const active = path?.startsWith(href) || (href === "/explorer" && path?.startsWith("/investigations"));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}>
                <span className="nav-no" aria-hidden="true">{String(i).padStart(2, "0")}</span>{label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
