import { describe, expect, it } from "vitest";
import { assistantHeaders, clearByok, getByok, maskKey, safeTransport, setByok } from "../lib/byok";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const FAKE = "xai-test-" + "C".repeat(30);

describe("BYOK", () => {
  it("stores, reads and clears only the given (session) store", () => {
    const s = mem();
    setByok({ provider: "xai", key: ` ${FAKE} ` }, s);
    expect(getByok(s)).toEqual({ provider: "xai", key: FAKE, model: undefined });
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
    setByok({ provider: "xai", key: FAKE, model: "grok-4.7" }, s);
    expect(assistantHeaders("https://x.test", s)).toEqual({ "X-LLM-Provider": "xai", "X-LLM-Key": FAKE, "X-LLM-Model": "grok-4.7" });
    expect(assistantHeaders("http://evil.test", s)).toEqual({});
  });
  it("masks keys for display", () => {
    expect(maskKey(FAKE)).not.toContain("CCCCCC");
  });
  it("lib/api never attaches the key by itself", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8"));
    expect(src).not.toMatch(/byok|X-LLM-Key/i);
  });
  it("is wired into the assistant page only", async () => {
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
    expect(users).toEqual(["assistant/page.tsx"]);
  });
});
