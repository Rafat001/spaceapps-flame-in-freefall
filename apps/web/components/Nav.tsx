"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface AppItem {
  href: string;
  title: string;
  desc: string;
  category: string;
  color: string;
  icon: React.ReactNode;
}

const NEW_IN_SPACE_FIRE_APPS: AppItem[] = [
  {
    href: "/firelab",
    title: "Learning FireLab",
    desc: "Hands-on BASS-II ISS experiment & flame-front extraction",
    category: "Interactive Lab",
    color: "#EAFE07",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" />
      </svg>
    ),
  },
  {
    href: "/fire-dynamics",
    title: "Fire Dynamics Explorer",
    desc: "Fire Tetrahedron → NASA experiment evidence",
    category: "Science",
    color: "#E43700",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 2.5 20h19Z" /><path d="M7.25 11.5h9.5" /><path d="M7.25 11.5 12 20l4.75-8.5" />
      </svg>
    ),
  },
];

const RESEARCH_APPS: AppItem[] = [
  {
    href: "/explorer",
    title: "Catalog Explorer",
    desc: "24 NASA flight investigations & tables",
    category: "Data",
    color: "#2E96F5",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" /><path d="M6 10h10" />
      </svg>
    ),
  },
  {
    href: "/coverage",
    title: "Coverage Matrix",
    desc: "Test target O₂, pressure & airflow coverage",
    category: "Analysis",
    color: "#EAFE07",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
  },
  {
    href: "/compare",
    title: "Compare Studies",
    desc: "Side-by-side multi-study data comparison",
    category: "Synthesis",
    color: "#0960E1",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="9" height="18" rx="2" /><rect x="13" y="3" width="9" height="18" rx="2" />
      </svg>
    ),
  },
  {
    href: "/insights",
    title: "Scenario Ranking",
    desc: "Relevance scores for Lunar, Mars & ISS",
    category: "Scenarios",
    color: "#E43700",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    href: "/spacefire",
    title: "SpaceFire Evolution",
    desc: "50-year spacecraft fire safety test timeline",
    category: "History",
    color: "#EAFE07",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    href: "/beyond-psi",
    title: "Beyond PSI",
    desc: "Extended flight programs & external research",
    category: "Programs",
    color: "#C9D4EC",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 15 2 2 4-4" /><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M12 17v4" /><path d="M8 21h8" />
      </svg>
    ),
  },
];

interface NavDropdownProps {
  label: string;
  ariaLabel: string;
  title: string;
  subtitle: string;
  apps: AppItem[];
  icon: React.ReactNode;
  active: boolean;
  popoverClassName?: string;
  footer?: { href: string; label: string };
}

function NavDropdown({ label, ariaLabel, title, subtitle, apps, icon, active, popoverClassName, footer }: NavDropdownProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  // Close menu on click outside or Esc
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Close when the route changes
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <li className="nav-apps-wrapper" ref={menuRef}>
      <button
        type="button"
        className={`nav-apps-btn ${active ? "active" : ""} ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
      >
        <span className="waffle-icon" aria-hidden="true">{icon}</span>
        <span>{label}</span>
        <svg className={`chevron ${open ? "rotated" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Popover Flyout Menu with Backdrop */}
      {open && (
        <>
          <div className="apps-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`apps-popover ${popoverClassName ?? ""}`} role="dialog" aria-label={title}>
            <div className="apps-popover-head">
              <div>
                <h3 className="apps-popover-title">{title}</h3>
                <p className="apps-popover-subtitle">{subtitle}</p>
              </div>
              <button type="button" className="apps-close-btn" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
            </div>

            <div className="apps-grid">
              {apps.map((app) => {
                const appActive = path?.startsWith(app.href) || (app.href === "/explorer" && path?.startsWith("/investigations"));
                return (
                  <Link
                    key={app.href}
                    href={app.href}
                    className={`app-card ${appActive ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                    aria-current={appActive ? "page" : undefined}
                  >
                    <div className="app-card-icon" style={{ color: app.color, borderColor: app.color }}>
                      {app.icon}
                    </div>
                    <div className="app-card-content">
                      <div className="app-card-header">
                        <span className="app-card-title">{app.title}</span>
                        <span className="app-card-category">{app.category}</span>
                      </div>
                      <p className="app-card-desc">{app.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {footer && (
              <div className="apps-popover-foot">
                <Link href={footer.href} onClick={() => setOpen(false)}>
                  {footer.label}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );
}

const WAFFLE_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="3.5" cy="3.5" r="2.2" />
    <circle cx="10" cy="3.5" r="2.2" />
    <circle cx="16.5" cy="3.5" r="2.2" />
    <circle cx="3.5" cy="10" r="2.2" />
    <circle cx="10" cy="10" r="2.2" />
    <circle cx="16.5" cy="10" r="2.2" />
    <circle cx="3.5" cy="16.5" r="2.2" />
    <circle cx="10" cy="16.5" r="2.2" />
    <circle cx="16.5" cy="16.5" r="2.2" />
  </svg>
);

const SPARK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

export default function Nav() {
  const path = usePathname();

  const isToolActive =
    RESEARCH_APPS.some((app) => path?.startsWith(app.href)) || !!path?.startsWith("/investigations");
  const isNewActive = path?.startsWith("/fire-dynamics") ?? false;
  const isIntroActive = path?.startsWith("/androflame") || path?.startsWith("/intro");
  const isFirelabActive = path?.startsWith("/firelab");
  const isAskActive = path?.startsWith("/assistant");

  return (
    <nav aria-label="Main" className="nav">
      <ul className="nav-primary">
        {/* 1. AndroFlame (Intro) */}
        <li>
          <Link href="/androflame" aria-current={isIntroActive ? "page" : undefined}>
            <span className="nav-no" aria-hidden="true">00</span>AndroFlame
          </Link>
        </li>

        {/* Learning FireLab */}
        <li>
          <Link href="/firelab" aria-current={isFirelabActive ? "page" : undefined} style={{ color: isFirelabActive ? "var(--accent)" : undefined }}>
            <span className="nav-no" aria-hidden="true" style={{ color: "var(--accent)" }}>🔥</span>FireLab
          </Link>
        </li>

        {/* 2. Research Apps Launcher */}
        <NavDropdown
          label="Apps"
          ariaLabel="Research Apps and Tools launcher"
          title="Research Apps & Tools"
          subtitle="NASA Space Apps 2026 · Microgravity Combustion"
          apps={RESEARCH_APPS}
          icon={WAFFLE_ICON}
          active={isToolActive}
          footer={{ href: "/androflame", label: "Read full AndroFlame introduction & architecture →" }}
        />

        {/* 3. New in Space Fire? — beginner entry points */}
        <NavDropdown
          label="New in Space Fire?"
          ariaLabel="New in Space Fire? beginner tools"
          title="New in Space Fire?"
          subtitle="Start here · hands-on labs & fire science basics"
          apps={NEW_IN_SPACE_FIRE_APPS}
          icon={SPARK_ICON}
          active={isNewActive}
          popoverClassName="apps-popover--end"
        />

        {/* 4. Ask (Assistant) */}
        <li>
          <Link href="/assistant" aria-current={isAskActive ? "page" : undefined}>
            <span className="nav-no" aria-hidden="true">01</span>Ask
          </Link>
        </li>
      </ul>
    </nav>
  );
}
