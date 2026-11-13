import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url).pathname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(n) ? [p] : [];
  });
}

describe("challenge title (V1)", () => {
  const src = [...files(join(root, "app")), ...files(join(root, "components"))].map((f) => readFileSync(f, "utf8")).join("\n");
  const readme = readFileSync(join(root, "../../README.md"), "utf8");
  it("uses the official SI-Powered title", () => {
    expect(src).toContain("SI-Powered");
    expect(readme).toContain("SI-Powered");
  });
  it("never copies the AI-Powered title card", () => {
    expect(src).not.toMatch(/AI-Powered/);
    expect(readme).not.toMatch(/AI-Powered/);
  });
});
