import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VideoFacade from "../components/VideoFacade";
import NasaSummary, { citeName } from "../components/NasaSummary";

const glenn = { label: "NASA Combustion Science page", title: "Combustion Science (NASA Glenn)", locator: "Archived Combustion Experiments",
  url: "https://www.nasa.gov/glenn/x/combustion-science/#archived" };
const sheet = { label: "NASA fact sheet", title: "FLEX fact sheet (NASA GRC)", locator: "p. 2", url: "https://x/flex.pdf#page=2" };

describe("Home video facade", () => {
  const html = renderToStaticMarkup(<VideoFacade id="W1oXykoz9zg" title="NASA ScienceCasts" />);
  it("is a keyboard-focusable button with an accessible name", () => {
    expect(html).toMatch(/^<button type="button"/);
    expect(html).toContain('aria-label="Play video: NASA ScienceCasts"');
  });
  it("shows only the i.ytimg.com still until clicked (no player, no YouTube cookies)", () => {
    expect(html).toContain("https://i.ytimg.com/vi/W1oXykoz9zg/maxresdefault.jpg");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube.com/embed");
  });
});

describe("NASA program summary", () => {
  it("renders nothing when the API has no curated summary", () => {
    expect(renderToStaticMarkup(<NasaSummary s={null} acronym="CFI" />)).toBe("");
  });
  it("shows each quote with its source link", () => {
    const s = { lead: { quote: "Lead text.", citation: glenn },
      facts: [{ kind: "objective", label: "Objective", quote: "Fact text.", citation: sheet }],
      notes: [{ kind: "compare", text: "Counts differ.", quotes: [{ quote: "89 test points", citation: sheet }], psi_value: "122 rows" }],
      program: null, note: "Quoted verbatim." };
    const html = renderToStaticMarkup(<NasaSummary s={s} acronym="FLEX" />);
    expect(html).toContain("What NASA says about FLEX");
    expect(html).toContain("Lead text.");
    expect(html).toContain('href="https://x/flex.pdf#page=2"');
    expect(html).toContain("FLEX fact sheet, p. 2");
    expect(html).toContain("122 rows");
  });
  it("names sources compactly", () => {
    expect(citeName(glenn)).toBe("NASA Combustion Science page, Archived Combustion Experiments");
    expect(citeName({ ...glenn, label: "NASA Glenn experiment page", title: "FLARE (NASA GRC)", locator: "page text" })).toBe("FLARE page");
  });
});
