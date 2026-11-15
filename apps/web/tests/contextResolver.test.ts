import { describe, expect, it } from "vitest";
import { resolveConversationContext, ConversationTurn } from "../lib/contextResolver";

describe("resolveConversationContext", () => {
  it("returns original query if history is empty", () => {
    const res = resolveConversationContext("What is microgravity flame behavior?", []);
    expect(res.enrichedQuery).toBe("What is microgravity flame behavior?");
  });

  it("resolves pronouns ('it', 'the experiment') from recent investigation turns", () => {
    const history: ConversationTurn[] = [
      {
        role: "user",
        text: "Tell me about BASS-II investigation",
      },
      {
        role: "assistant",
        text: "BASS-II (Burning and Suppression of Solids - II) tests solid fuel extinction in microgravity.",
        citations: [{ investigation_id: "psi-25", acronym: "BASS-II" }],
      },
    ];

    const res = resolveConversationContext("What fuels were tested in it?", history);
    expect(res.enrichedQuery).toContain("BASS-II");
    expect(res.investigationIds).toContain("psi-25");
  });

  it("resolves fuel context continuity for follow-up questions", () => {
    const history: ConversationTurn[] = [
      {
        role: "user",
        text: "Where is PMMA tested?",
      },
      {
        role: "assistant",
        text: "PMMA (acrylic) is tested in BASS, Saffire, and other microgravity rigs.",
      },
    ];

    const res = resolveConversationContext("what was the thickness?", history);
    expect(res.enrichedQuery).toContain("PMMA");
  });

  it("resolves clarification requests ('dont clear on it yet') into simplified explanations of the active topic", () => {
    const history: ConversationTurn[] = [
      {
        role: "user",
        text: "what is CFD",
      },
      {
        role: "assistant",
        text: "CFD (computational fluid dynamics) simulations are planned to support flight testing.",
      },
    ];

    const res = resolveConversationContext("dont clear on it yet", history);
    expect(res.isClarification).toBe(true);
    expect(res.activeTopic).toBe("CFD");
    expect(res.enrichedQuery).toContain("explain CFD in plain English simply");
  });

  it("handles 'i mean not clear what CFD actually is' properly", () => {
    const history: ConversationTurn[] = [
      {
        role: "user",
        text: "what is CFD",
      },
      {
        role: "assistant",
        text: "CFD simulations model fluid flow.",
      },
    ];

    const res = resolveConversationContext("i mean not clear what CFD actually is", history);
    expect(res.isClarification).toBe(true);
    expect(res.activeTopic).toBe("CFD");
    expect(res.enrichedQuery).toContain("explain CFD in plain English simply");
  });

  it("never rewrites conversational acknowledgments or identity questions even with previous history", () => {
    const history: ConversationTurn[] = [
      {
        role: "user",
        text: "what is CFD",
      },
      {
        role: "assistant",
        text: "CFD is computational fluid dynamics.",
      },
    ];

    expect(resolveConversationContext("good", history).enrichedQuery).toBe("good");
    expect(resolveConversationContext("understood", history).enrichedQuery).toBe("understood");
    expect(resolveConversationContext("do you an ai", history).enrichedQuery).toBe("do you an ai");
    expect(resolveConversationContext("thanks", history).enrichedQuery).toBe("thanks");
  });

  it("leaves self-contained queries unaltered even when there is previous history", () => {
    const history: ConversationTurn[] = [
      {
        role: "assistant",
        text: "BASS investigated burning of solids.",
      },
    ];

    const res = resolveConversationContext("Show me the 3D Fire Dynamics tool", history);
    expect(res.enrichedQuery).toBe("Show me the 3D Fire Dynamics tool");
  });
});
