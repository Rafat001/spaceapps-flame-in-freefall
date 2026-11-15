import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import Chatbot from "../components/Chatbot";

describe("Chatbot component", () => {
  it("renders the floating launcher button in initial closed state with Dr. Spark", () => {
    const html = renderToStaticMarkup(<Chatbot />);
    expect(html).toContain("chatbot-launcher");
    expect(html).toContain("Dr. Spark");
    expect(html).toContain("Open Dr. Spark Chatbot");
  });

  it("contains the aria-live attribute for accessibility", () => {
    const html = renderToStaticMarkup(<Chatbot />);
    expect(html).toContain('aria-live="polite"');
  });
});
