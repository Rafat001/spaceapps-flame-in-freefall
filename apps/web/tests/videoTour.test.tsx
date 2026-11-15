import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOUR, VideoTour } from "../components/VideoTour";

const pub = (p: string) => fileURLToPath(new URL(`../public${p}`, import.meta.url));

describe("Home video tour", () => {
  const html = renderToStaticMarkup(<VideoTour />);
  it("renders a playable video with poster, captions and a download fallback", () => {
    expect(html).toContain(`<source src="${TOUR.src}" type="video/mp4"/>`);
    expect(html).toContain(`poster="${TOUR.poster}"`);
    expect(html).toMatch(/<track kind="captions" src="\/video\/androflame-tour\.en\.vtt" srcLang="en"/);
    expect(html).toContain(`href="${TOUR.src}"`);
  });
  it("states that the audio and video are SI-generated", () => {
    expect(html).toMatch(/narration voice and the screen recording in this video are SI-generated/);
  });
  it("ships the referenced files", () => {
    for (const p of [TOUR.src, TOUR.poster, TOUR.captions]) expect(existsSync(pub(p))).toBe(true);
    expect(readFileSync(pub(TOUR.captions), "utf8").startsWith("WEBVTT")).toBe(true);
  });
});
