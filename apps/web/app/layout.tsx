import type { Metadata } from "next";
import { Fira_Code, Fira_Sans, Overpass } from "next/font/google";
import Link from "next/link";
import Mark from "@/components/Mark";
import Nav from "@/components/Nav";
import "./globals.css";

// NASA Space Apps Brand Guidelines (June 25, 2026), p.11: Fira Sans (titles & headings), Overpass (body copy),
// Fira Code (code & pre-formatted text). All SIL OFL, served via Google Fonts.
const display = Fira_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["700", "900"], display: "swap" });
const sans = Overpass({ subsets: ["latin"], variable: "--font-sans", weight: ["300", "400", "600", "700"], style: ["normal", "italic"], display: "swap" });
const mono = Fira_Code({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Flame in Freefall: SI-Powered Fire Safety Insights — microgravity combustion evidence explorer",
  description: "Find, compare and question microgravity combustion investigations from NASA Physical Sciences Informatics (PSI) for fire-safety research. An independent team project for the 2026 NASA Space Apps Challenge; not endorsed by NASA.",
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
              <div><dt>Built for</dt><dd>The 2026 NASA Space Apps Challenge — <i>Flame in Freefall</i> challenge. Prototype. <span className="hashtag">#SpaceApps</span></dd></div>
              <div><dt>Sources</dt><dd>NASA Physical Sciences Informatics (PSI) public records and experimental tables (CC0), plus the official challenge brief.</dd></div>
              <div><dt>Scope</dt><dd>Research relevance only — not a hazard score or safety certification. Answers stay within the official challenge resources and the references they cite.</dd></div>
              <div><dt>Independence</dt><dd>An independent participant project. It is not affiliated with, sponsored by, or endorsed by NASA or the NASA Space Apps Challenge; NASA names appear only to describe our participation and to cite NASA data.</dd></div>
            </dl>
          </div>
        </footer>
      </body>
    </html>
  );
}
