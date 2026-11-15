import { describe, expect, it } from "vitest";
import { citeHref } from "../components/Markdown";
import { cleanQuote, encodeTextDirectiveValue, isPdfUrl, textDirective, withTextFragment } from "../lib/textFragment";

describe("encodeTextDirectiveValue", () => {
  it("percent-encodes reserved text-fragment syntax and spaces", () => {
    expect(encodeTextDirectiveValue("foo-bar")).toBe("foo%2Dbar");
    expect(encodeTextDirectiveValue("a, b & c")).toBe("a%2C%20b%20%26%20c");
    expect(encodeTextDirectiveValue("simple")).toBe("simple");
  });
});

describe("isPdfUrl", () => {
  it("detects pdf paths and query-like pdf links", () => {
    expect(isPdfUrl("https://www.nasa.gov/wp-content/uploads/2016/05/guide.pdf")).toBe(true);
    expect(isPdfUrl("https://www.nasa.gov/wp-content/uploads/2016/05/guide.pdf#page=3")).toBe(true);
    expect(isPdfUrl("https://example.com/file.PDF?download=1")).toBe(true);
    expect(isPdfUrl("https://www.nasa.gov/glenn/combustion-science/")).toBe(false);
  });
});

describe("cleanQuote", () => {
  it("strips markdown, ellipses, ingest prefixes, and a trailing partial word", () => {
    expect(cleanQuote("  [BASS] The two main objectives for BASS are to begin…  ")).toBe(
      "The two main objectives for BASS are to begin",
    );
    expect(cleanQuote("**Fire hazards** are extremely dangerous in space exploration")).toBe(
      "Fire hazards are extremely dangerous in space exploration",
    );
    expect(cleanQuote("… starting mid sentence and ending with combust-")).toBe(
      "starting mid sentence and ending with",
    );
    expect(cleanQuote("[BASS table, CSV record 2, test] Date: 3/30/2012; GMT: 90")).toBe(
      "Date: 3/30/2012; GMT: 90",
    );
  });
});

describe("textDirective", () => {
  it("uses an exact phrase for a short span", () => {
    expect(textDirective("Flames behave differently in microgravity.")).toBe(
      "text=" + encodeTextDirectiveValue("Flames behave differently in microgravity."),
    );
  });
  it("uses textStart,textEnd (first ~5 and last ~5 words) for a long sentence", () => {
    const ex = "For decades, NASA has studied how flames and fire behave in microgravity, gathering a trove of experimental data along the way.";
    const dir = textDirective(ex);
    expect(dir).toBe(
      `text=${encodeTextDirectiveValue("For decades, NASA has studied")},${encodeTextDirectiveValue("experimental data along the way.")}`,
    );
  });
  it("skips concatenated heading tokens and starts at the first real sentence", () => {
    const ex = "Physical Sciences Combustion Science Explore Combustion Science being performed at Glenn Research Center in Cleveland, Ohio. Overview In the United States, combustion processes contribute to about 85% of delivered energy.";
    expect(textDirective(ex)).toBe(
      `text=${encodeTextDirectiveValue("Explore Combustion Science being performed")},${encodeTextDirectiveValue("Research Center in Cleveland, Ohio.")}`,
    );
  });
});

describe("withTextFragment / citeHref", () => {
  const html = "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/";
  const quote = "Explore Combustion Science being performed at Glenn Research Center in Cleveland, Ohio.";

  it("appends #:~:text= to a bare HTML URL", () => {
    const href = withTextFragment(html, quote);
    expect(href.startsWith(html + "#:~:text=")).toBe(true);
    expect(href).toContain(encodeTextDirectiveValue("Explore Combustion Science being performed"));
  });
  it("places the directive after an existing #fragment", () => {
    const href = withTextFragment(html + "#overview", quote);
    expect(href.startsWith(html + "#overview:~:text=")).toBe(true);
  });
  it("leaves PDFs, existing text fragments, and YouTube timestamps alone", () => {
    const pdf = "https://www.nasa.gov/wp-content/uploads/2025/07/acme.pdf#page=1";
    expect(withTextFragment(pdf, quote)).toBe(pdf);
    const already = html + "#:~:text=already";
    expect(withTextFragment(already, quote)).toBe(already);
    const yt = "https://www.youtube.com/watch?v=AVuEiKxOpc0&t=26s";
    expect(withTextFragment(yt, "Tracy Prater: Hi, I'm Tracy")).toBe(yt);
  });
  it("leaves internal investigation links unchanged", () => {
    expect(citeHref({ ref: "S1", investigation_id: "psi-20" })).toBe("/investigations/psi-20");
  });
  it("prefers quote over excerpt, and accepts url as an alias of source_url", () => {
    const href = citeHref({
      ref: "S1",
      url: html,
      excerpt: "This excerpt is long enough to use but should lose to the quote field.",
      quote: "Combustion occurs when fuel and oxygen react.",
    });
    expect(href).toBe(html + "#:~:text=" + encodeTextDirectiveValue("Combustion occurs when fuel and oxygen react."));
  });
  it("returns the bare URL when there is no usable quote", () => {
    expect(citeHref({ ref: "S1", source_url: html })).toBe(html);
    expect(citeHref(undefined)).toBeNull();
  });
});

describe("citeHref anchor", () => {
  const html = "https://www.nasa.gov/glenn/combustion-science/";
  it("deep-links to the passage the answer relied on (anchor) over the chunk's first sentence", () => {
    const href = citeHref({
      ref: "S1",
      source_url: html,
      anchor: "Flames spread slower at reduced oxygen.",
      excerpt: "Overview of the program. Flames spread slower at reduced oxygen.",
    });
    expect(href).toBe(html + "#:~:text=" + encodeTextDirectiveValue("Flames spread slower at reduced oxygen."));
  });
});
