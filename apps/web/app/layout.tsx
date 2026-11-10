import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flame in Freefall — microgravity combustion evidence explorer",
  description: "Find, compare and question NASA PSI microgravity combustion investigations for fire-safety research.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site">
          <div className="inner">
            <Link href="/" className="brand">Flame <span>in</span> Freefall</Link>
            <Nav />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site">
          <div className="inner">
            NASA Space Apps Challenge 2026 prototype. Data: NASA Physical Sciences Informatics (PSI) public records and
            experimental tables (CC0), plus the official challenge brief. Research relevance only — not a hazard score or safety
            certification. Official challenge resources arrive Friday 13 Nov 2026 and are not yet included.
          </div>
        </footer>
      </body>
    </html>
  );
}
