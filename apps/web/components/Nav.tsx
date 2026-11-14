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

export default function Nav() {
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

  // Check if current route is one of the grouped research tools
  const isToolActive = RESEARCH_APPS.some((app) => path?.startsWith(app.href)) || path?.startsWith("/investigations");
  const isIntroActive = path?.startsWith("/androflame") || path?.startsWith("/intro");
  const isAskActive = path?.startsWith("/assistant");
  const isConfigActive = path?.startsWith("/settings");

  const [btnHover, setBtnHover] = useState(false);

  return (
    <nav aria-label="Main" className="nav">
      <ul className="nav-primary">
        {/* 1. AndroFlame (Intro) */}
        <li>
          <Link href="/androflame" aria-current={isIntroActive ? "page" : undefined}>
            <span className="nav-no" aria-hidden="true">00</span>AndroFlame
          </Link>
        </li>

        {/* 2. Apps Launcher Waffle Menu */}
        <li className="nav-apps-wrapper" ref={menuRef}>
          <button
            type="button"
            className={`nav-apps-btn ${isToolActive ? "active" : ""} ${open ? "open" : ""}`}
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-haspopup="true"
            aria-label="Research Apps and Tools launcher"
          >
            <span className="waffle-icon" aria-hidden="true">
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
            </span>
            <span>Apps</span>
            <svg className={`chevron ${open ? "rotated" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Popover Flyout Menu with Backdrop */}
          {open && (
            <>
              <div className="apps-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
              <div className="apps-popover" role="dialog" aria-label="Research Tools Menu">
              <div className="apps-popover-head">
                <div>
                  <h3 className="apps-popover-title">Research Apps & Tools</h3>
                  <p className="apps-popover-subtitle">NASA Space Apps 2026 · Microgravity Combustion</p>
                </div>
                <button type="button" className="apps-close-btn" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
              </div>

              <div className="apps-grid">
                {RESEARCH_APPS.map((app) => {
                  const active = path?.startsWith(app.href) || (app.href === "/explorer" && path?.startsWith("/investigations"));
                  return (
                    <Link
                      key={app.href}
                      href={app.href}
                      className={`app-card ${active ? "active" : ""}`}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
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

              <div className="apps-popover-foot">
                <Link href="/androflame" onClick={() => setOpen(false)}>
                  Read full AndroFlame introduction & architecture →
                </Link>
              </div>
            </div>
            </>
          )}
        </li>

        {/* 3. Ask (Assistant) */}
        <li>
          <Link href="/assistant" aria-current={isAskActive ? "page" : undefined}>
            <span className="nav-no" aria-hidden="true">01</span>Ask
          </Link>
        </li>

        {/* 4. AI Config (Settings) */}
        <li>
          <Link href="/settings" aria-current={isConfigActive ? "page" : undefined}>
            <span className="nav-no" aria-hidden="true">02</span>AI Config
          </Link>
        </li>
      </ul>
    </nav>
  );
}
