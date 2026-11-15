export interface Pathway {
  label: string;
  href: string;
  badge: string;
  description?: string;
}

export interface DetectPathwayOptions {
  query: string;
  citations?: Array<{ investigation_id?: string | null; acronym?: string | null }>;
  directAnswer?: string | null;
}

/** Detects relevant in-app pages and deep-links based on user query and RAG citations */
export function detectPathways(opts: DetectPathwayOptions): Pathway[] {
  const q = opts.query.toLowerCase().trim();
  const pathways: Pathway[] = [];
  const seenHrefs = new Set<string>();

  const add = (p: Pathway) => {
    if (!seenHrefs.has(p.href)) {
      seenHrefs.add(p.href);
      pathways.push(p);
    }
  };

  // 1. Direct Investigation pathways from RAG citations or query
  const invMentions = q.match(/psi[- ]?\d+/g) || [];
  for (const m of invMentions) {
    const id = m.replace(" ", "-").toLowerCase();
    add({
      label: `Investigation ${id.toUpperCase()}`,
      href: `/investigations/${id}`,
      badge: "DATASET",
      description: "PSI test records and experimental runs",
    });
  }

  if (opts.citations) {
    for (const c of opts.citations) {
      if (c.investigation_id) {
        const id = c.investigation_id.toLowerCase();
        const label = c.acronym ? `${c.acronym} (${id.toUpperCase()})` : `Investigation ${id.toUpperCase()}`;
        add({
          label,
          href: `/investigations/${id}`,
          badge: "DATASET",
          description: "Ingested PSI record & test matrix",
        });
      }
    }
  }

  // Common investigation acronyms
  if (/\bbass\b/i.test(q)) {
    add({
      label: "BASS (PSI-26)",
      href: "/investigations/psi-26",
      badge: "DATASET",
      description: "Burning and Suppression of Solids (PMMA, cotton/fiberglass)",
    });
  }
  if (/\bsaffire\b/i.test(q)) {
    add({
      label: "Saffire-II (PSI-99)",
      href: "/investigations/psi-99",
      badge: "DATASET",
      description: "Spacecraft Fire Safety large-scale burns",
    });
  }
  if (/\bflex\b/i.test(q)) {
    add({
      label: "FLEX (PSI-39)",
      href: "/investigations/psi-39",
      badge: "DATASET",
      description: "Flame Extinction Experiment droplets",
    });
  }

  // 2. Feature & Exploration pathways
  if (/\b(firelab|fire lab|learning firelab|interactive lab|conduct|hands[- ]on|how data is extracted|spread rate|flame front|video|how experiment is conducted)\b/i.test(q)) {
    add({
      label: "Learning FireLab",
      href: "/firelab",
      badge: "INTERACTIVE LAB",
      description: "Hands-on BASS-II ISS experiment & flame-front data extraction",
    });
  }

  if (/\b(tetra|tetrahedron|triangle|fire dynamic|suppress|extinct|oxidizer|reaction|3d|model)\b/i.test(q)) {
    add({
      label: "3D Fire Dynamics Explorer",
      href: "/fire-dynamics",
      badge: "3D TOOL",
      description: "Interactive Fire Tetrahedron linked to NASA tests",
    });
  }

  if (/\b(compare|comparison|versus|vs|difference|between)\b/i.test(q)) {
    add({
      label: "Compare Investigations",
      href: "/compare",
      badge: "COMPARISON",
      description: "Side-by-side comparison of test matrices & fuels",
    });
  }

  if (/\b(moon|lunar|mars|martian|partial[- ]gravity|regolith)\b/i.test(q)) {
    add({
      label: "Lunar & Martian Partial Gravity",
      href: "/lunar",
      badge: "EVIDENCE",
      description: "Flame behavior under 0.16g and 0.38g gravity",
    });
  }

  if (/\b(search|find|filter|scenario|explorer|material|fuel|pressure|oxygen|airflow)\b/i.test(q) || pathways.length === 0) {
    const searchParam = q.length > 2 && !q.startsWith("where") && !q.startsWith("how") ? `?q=${encodeURIComponent(q)}` : "";
    add({
      label: "Evidence Explorer",
      href: `/explorer${searchParam}`,
      badge: "EXPLORE",
      description: "Filter NASA investigations with SFSRI scenario scoring",
    });
  }

  if (/\b(insight|learned|summary|finding|takeaway)\b/i.test(q)) {
    add({
      label: "Fire Safety Insights",
      href: "/insights",
      badge: "INSIGHTS",
      description: "Key findings from microgravity combustion science",
    });
  }

  // Always offer the deep research Assistant page if not already there
  if (q.length > 5) {
    add({
      label: "Deep Research in Ask Page",
      href: `/assistant`,
      badge: "RESEARCH",
      description: "Full research query with verbatim line citations",
    });
  }

  // Return max 3 most relevant pathways
  return pathways.slice(0, 3);
}
