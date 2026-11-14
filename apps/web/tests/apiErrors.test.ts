import { describe, expect, it } from "vitest";
import { friendlyError } from "../lib/api";

const RAW = /\bHTTP\b|\b[1-5]\d\d\b|Error\b|Exception|Payment Required|Internal Server/i;

describe("friendly API errors", () => {
  it("never shows status codes, status text or exception names", () => {
    for (const s of [0, 400, 401, 402, 403, 404, 422, 429, 500, 502, 503]) {
      for (const d of [null, "HTTP 402 Payment Required", "HTTPStatusError (HTTP 400)", "Internal Server Error"]) {
        expect(friendlyError(s, d)).not.toMatch(RAW);
      }
    }
  });
  it("passes through plain-language API messages", () => {
    expect(friendlyError(400, "The supplied API key is not in a valid format (it was not used or stored)."))
      .toContain("API key is not in a valid format");
    expect(friendlyError(404, "Investigation not found")).toBe("Investigation not found");
  });
  it("gives actionable text for busy, rate limit and offline", () => {
    expect(friendlyError(503, null)).toMatch(/try again/i);
    expect(friendlyError(429, null)).toMatch(/wait a minute/i);
    expect(friendlyError(0, null)).toMatch(/can't reach/i);
  });
});
