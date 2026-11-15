import { describe, expect, it } from "vitest";
import { classifyQuestion } from "../lib/queryClassifier";
import { resolveConversationContext, ConversationTurn } from "../lib/contextResolver";
import { getGeneralConcept, getConversationalReply, getSimplifiedConcept } from "../lib/copilotKnowledge";
import { detectPathways } from "../lib/pathways";

interface TestTurn {
  input: string;
  expectedCategory: string;
  expectedKeywords: string[];
}

const TEST_SCENARIOS: TestTurn[] = [
  // 1. Greeting
  {
    input: "hi Dr. Spark",
    expectedCategory: "CONVERSATION",
    expectedKeywords: ["Dr. Spark", "NASA"],
  },
  // 2. App overview
  {
    input: "what is this app?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["Flame in Freefall", "Fire Tetrahedron", "3D"],
  },
  // 3. Navigation to 3D model
  {
    input: "where can I find the 3D fire model?",
    expectedCategory: "APP_NAVIGATION",
    expectedKeywords: ["/fire-dynamics"],
  },
  // 4. Zero-g flame spread physics
  {
    input: "how does zero gravity affect flame spread?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["buoyancy", "spherical", "diffusion"],
  },
  // 5. Material query: PMMA
  {
    input: "what is PMMA?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["acrylic", "thermoplastic", "benchmark"],
  },
  // 6. Material query: Nomex
  {
    input: "what is Nomex?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["aramid", "flame-resistant", "Saffire-II"],
  },
  // 7. SIBAL fabric query
  {
    input: "what is SIBAL?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["cotton", "fiberglass", "boundary"],
  },
  // 8. Flight experiment: BASS
  {
    input: "what is BASS?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["Burning and Suppression of Solids", "Glovebox"],
  },
  // 9. Flight experiment: Saffire
  {
    input: "what is Saffire?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["Cygnus", "vehicle-scale"],
  },
  // 10. Droplet combustion: FLEX
  {
    input: "what is FLEX?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["droplet", "cool flame"],
  },
  // 11. Engineering concept: CFD
  {
    input: "what is CFD?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["Computational Fluid Dynamics", "simulation"],
  },
  // 12. Fire parameter: Heat Release Rate
  {
    input: "what is heat release rate?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["kW", "flashover", "Heat Release Rate"],
  },
  // 13. Fire parameter: Flame Spread Rate
  {
    input: "what is flame spread rate?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["concurrent", "opposed", "velocity"],
  },
  // 14. Fire parameter: Limiting Oxygen Index
  {
    input: "what is limiting oxygen index?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["oxygen", "flammability boundary"],
  },
  // 15. Chemistry: Pyrolysis
  {
    input: "what is pyrolysis?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["thermal decomposition", "gas", "monomer"],
  },
  // 16. Partial gravity fire hazard
  {
    input: "how do flames burn on the Moon?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["partial", "0.16", "buoyancy"],
  },
  // 17. Smoke detection in zero-g
  {
    input: "how does smoke detection work in microgravity?",
    expectedCategory: "COMBUSTION_SCIENCE",
    expectedKeywords: ["HVAC", "airflow", "plume"],
  },
  // 18. Conversational acknowledgment: good
  {
    input: "good",
    expectedCategory: "CONVERSATION",
    expectedKeywords: ["Glad that makes sense", "explore"],
  },
  // 19. AI identity / persona
  {
    input: "do you an ai",
    expectedCategory: "CONVERSATION",
    expectedKeywords: ["Dr. Spark", "AI co-pilot"],
  },
  // 20. Navigation to comparison tool
  {
    input: "take me to the comparison tool",
    expectedCategory: "APP_NAVIGATION",
    expectedKeywords: ["/compare"],
  },
];

describe("20 Diverse Chatbot Scenarios Evaluation", () => {
  TEST_SCENARIOS.forEach((scenario, index) => {
    it(`Test #${index + 1}: Handles '${scenario.input}'`, () => {
      // 1. Classification test
      const classified = classifyQuestion(scenario.input);
      expect(classified.category).toBe(scenario.expectedCategory);

      // 2. Response resolution test
      if (classified.category === "CONVERSATION") {
        const reply = getConversationalReply(scenario.input);
        expect(reply).not.toBeNull();
        scenario.expectedKeywords.forEach((kw) => {
          expect(reply?.text.toLowerCase()).toContain(kw.toLowerCase());
        });
      } else if (classified.category === "APP_NAVIGATION") {
        const pathways = detectPathways({ query: scenario.input });
        expect(pathways.length).toBeGreaterThan(0);
        scenario.expectedKeywords.forEach((kw) => {
          const hasKeyword = pathways.some((p) => p.href.includes(kw) || p.label.includes(kw));
          expect(hasKeyword).toBe(true);
        });
      } else {
        const concept = getGeneralConcept(scenario.input);
        expect(concept).not.toBeNull();
        scenario.expectedKeywords.forEach((kw) => {
          expect(concept?.summary.toLowerCase()).toContain(kw.toLowerCase());
        });
      }
    });
  });

  it("Test Multi-Turn Continuity & Clarification across 5-turn dialogue", () => {
    const history: ConversationTurn[] = [];

    // Turn 1: Ask about CFD
    const t1 = "what is CFD?";
    const r1 = resolveConversationContext(t1, history);
    expect(r1.enrichedQuery).toBe(t1);
    const c1 = getGeneralConcept(r1.enrichedQuery);
    expect(c1?.summary).toContain("Computational Fluid Dynamics");
    history.push({ role: "user", text: t1 });
    history.push({ role: "assistant", text: c1!.summary });

    // Turn 2: User says "dont clear on it yet"
    const t2 = "dont clear on it yet";
    const r2 = resolveConversationContext(t2, history);
    expect(r2.isClarification).toBe(true);
    expect(r2.activeTopic).toBe("CFD");
    const s2 = getSimplifiedConcept(r2.activeTopic!);
    expect(s2?.text).toContain("video game physics engine");
    history.push({ role: "user", text: t2 });
    history.push({ role: "assistant", text: s2!.text });

    // Turn 3: User acknowledges "understood"
    const t3 = "understood";
    const r3 = resolveConversationContext(t3, history);
    expect(r3.enrichedQuery).toBe("understood"); // Not rewritten!
    const c3 = getConversationalReply(t3);
    expect(c3?.text).toContain("Glad that makes sense");
    history.push({ role: "user", text: t3 });
    history.push({ role: "assistant", text: c3!.text });

    // Turn 4: User asks identity "do you an ai"
    const t4 = "do you an ai";
    const r4 = resolveConversationContext(t4, history);
    expect(r4.enrichedQuery).toBe("do you an ai"); // Not rewritten!
    const c4 = getConversationalReply(t4);
    expect(c4?.text).toContain("Dr. Spark");
    history.push({ role: "user", text: t4 });
    history.push({ role: "assistant", text: c4!.text });

    // Turn 5: User asks about BASS-II
    const t5 = "what fuels were tested in BASS-II?";
    const r5 = resolveConversationContext(t5, history);
    expect(r5.enrichedQuery).toContain("BASS-II");
  });
});
