import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import CatalogStatus from "@/components/CatalogStatus";
import Mark from "@/components/Mark";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"], display: "swap" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Flame in Freefall — microgravity combustion evidence explorer",
  description: "Find, compare and question NASA PSI microgravity combustion investigations for fire-safety research.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="rail">
          <div className="rail-inner">
            <Link href="/" className="wordmark" aria-label="Flame in Freefall — home">
              <Mark id="rail-mark" />
              <span className="wordmark-text">Flame <i>in</i> Freefall</span>
            </Link>
            <CatalogStatus />
            <Nav />
          </div>
        </header>
        <main id="main" className="frame">{children}</main>
        <footer className="colophon">
          <div className="colophon-inner">
            <div className="colophon-mark">
              <Mark id="foot-mark" size={22} />
              <span>Flame <i>in</i> Freefall</span>
            </div>
            <dl className="colophon-notes">
              <div><dt>Prepared for</dt><dd>NASA Space Apps Challenge 2026 — prototype</dd></div>
              <div><dt>Sources</dt><dd>NASA Physical Sciences Informatics (PSI) public records and experimental tables (CC0), plus the official challenge brief.</dd></div>
              <div><dt>Scope</dt><dd>Research relevance only — not a hazard score or safety certification. Official challenge resources arrive Friday 13 Nov 2026 and are not yet included.</dd></div>
            </dl>
          </div>
        </footer>
      </body>
    </html>
  );
}
