"use client";
import { useEffect } from "react";
import { chem } from "@/lib/chem";

const SKIP = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT"]);

function fix(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement;
    if (p && !SKIP.has(p.tagName) && !p.closest("code,pre")) {
      const v = node.nodeValue || "";
      const c = chem(v);
      if (c !== v) node.nodeValue = c;
    }
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE && SKIP.has((node as Element).tagName)) return;
  node.childNodes.forEach(fix);
}

/** Shows chemical formulas in the page (including API and AI text) with subscripts: O2 -> O₂. */
export default function ChemText() {
  useEffect(() => {
    fix(document.body);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") fix(m.target);
        else m.addedNodes.forEach(fix);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
