import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpaceFireGroups, SpaceFireTeaser, SPACEFIRE } from "../components/SpaceFire";

describe("SpaceFire Evolution", () => {
  const html = renderToStaticMarkup(<SpaceFireGroups />);
  it("has exactly the three requested headings, in order", () => {
    const heads = [...html.matchAll(/<h2[^>]*>.*?<\/span>(.*?)<\/h2>/g)].map((m) => m[1]);
    expect(heads).toEqual(["Lessons from Spacecraft Fires", "Development of Fire Safety Technologies", "Guideline"]);
  });
  it("lists the seven official resources with links that open in a new tab", () => {
    const items = SPACEFIRE.groups.flatMap((g) => g.items);
    expect(items.map((i) => i.title)).toEqual(["Apollo 1", "Apollo 13", "25 Years Ago: Fire Aboard Space Station Mir",
      "Fireman’s Air Tanks", "Fire Detector", "New Technology for the Fire Attire",
      "A Researcher’s Guide to International Space Station Combustion Science"]);
    for (const i of items) expect(html).toContain(`href="${i.url}" target="_blank" rel="noreferrer"`);
  });
  it("home teaser links each item to its anchor on /spacefire", () => {
    const t = renderToStaticMarkup(<SpaceFireTeaser />);
    expect(t).toContain('href="/spacefire"');
    expect(t).toContain('href="/spacefire#mir-fire"');
    expect((t.match(/href="\/spacefire#/g) || []).length).toBe(7);
  });
});
