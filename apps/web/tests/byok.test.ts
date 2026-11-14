import { describe, expect, it } from "vitest";
import { assistantHeaders, clearByok, getByok, maskKey, safeTransport, setByok } from "../lib/byok";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const FAKE = "gsk_test" + "C".repeat(40);

describe("BYOK", () => {
  it("stores, reads and clears only the given (session) store", () => {
    const s = mem();
    setByok({ provider: "gemini", key: ` ${FAKE} ` }, s);
    expect(getByok(s)).toEqual({ provider: "gemini", key: FAKE, model: undefined });
    clearByok(s);
    expect(getByok(s)).toBeNull();
    expect(s.m.size).toBe(0);
  });
  it("only sends over https or to a local API", () => {
    expect(safeTransport("https://api.example.onrender.com")).toBe(true);
    expect(safeTransport("http://localhost:8000")).toBe(true);
    expect(safeTransport("http://api.example.com")).toBe(false);
    expect(safeTransport("not a url")).toBe(false);
  });
  it("builds assistant headers only when a key is set and transport is safe", () => {
    const s = mem();
    expect(assistantHeaders("https://x.test", s)).toEqual({});
    setByok({ provider: "gemini", key: FAKE, model: "gemini-3.8-flash" }, s);
    expect(assistantHeaders("https://x.test", s)).toEqual({ "X-LLM-Provider": "gemini", "X-LLM-Key": FAKE, "X-LLM-Model": "gemini-3.8-flash" });
    expect(assistantHeaders("http://evil.test", s)).toEqual({});
  });
  it("offers only Gemini 3.8 Flash, and ignores stale provider selections", async () => {
    const { PROVIDERS, GEMINI_FREE_MODELS } = await import("../lib/byok");
    expect(PROVIDERS.map((p) => p.id)).toEqual(["gemini"]);
    expect(PROVIDERS[0].defaultModel).toBe("gemini-3.8-flash");
    expect([...GEMINI_FREE_MODELS]).toEqual(["gemini-3.8-flash"]);
    expect(PROVIDERS.map((p) => p.id)).not.toContain("xai");
    expect(PROVIDERS.map((p) => p.id)).not.toContain("groq");
    const s = mem();
    s.setItem("byok.provider", "xai"); s.setItem("byok.key", FAKE);
    expect(getByok(s)).toBeNull(); // a stale xAI selection from an older build is ignored
    s.setItem("byok.provider", "groq"); s.setItem("byok.key", FAKE);
    expect(getByok(s)).toBeNull(); // a stale Groq selection is ignored now that only Gemini is offered
  });
  it("stores a Gemini key and sends Gemini headers over HTTPS", () => {
    const s = mem();
    const key = "AIzaSyTest" + "E".repeat(28);
    setByok({ provider: "gemini", key, model: "gemini-3.8-flash" }, s);
    expect(getByok(s)).toEqual({ provider: "gemini", key, model: "gemini-3.8-flash" });
    expect(assistantHeaders("https://x.test", s)).toEqual({
      "X-LLM-Provider": "gemini", "X-LLM-Key": key, "X-LLM-Model": "gemini-3.8-flash",
    });
    expect(assistantHeaders("http://evil.test", s)).toEqual({});
  });
  it("masks keys for display", () => {
    expect(maskKey(FAKE)).not.toContain("CCCCCC");
  });
  it("lib/api never attaches the key by itself", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8"));
    expect(src).not.toMatch(/byok|X-LLM-Key/i);
  });
  it("is wired only into pages that call the assistant (assistant, explorer search synthesis)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = new URL("../app/", import.meta.url).pathname;
    const users: string[] = [];
    const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && /assistantHeaders/.test(fs.readFileSync(p, "utf8"))) users.push(path.relative(root, p));
    });
    walk(root);
    expect(users.sort()).toEqual(["assistant/page.tsx", "explorer/page.tsx"]);
  });
});
