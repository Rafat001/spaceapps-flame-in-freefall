import { describe, expect, it } from "vitest";
import { classifyQuestion } from "../lib/queryClassifier";

describe("classifyQuestion", () => {
  it("categorizes pleasantries, greetings, acknowledgments, and identity queries as CONVERSATION", () => {
    expect(classifyQuestion("thanks").category).toBe("CONVERSATION");
    expect(classifyQuestion("thank you very much").category).toBe("CONVERSATION");
    expect(classifyQuestion("hi Dr. Spark").category).toBe("CONVERSATION");
    expect(classifyQuestion("who are you?").category).toBe("CONVERSATION");
    expect(classifyQuestion("do you an ai").category).toBe("CONVERSATION");
    expect(classifyQuestion("are you an ai").category).toBe("CONVERSATION");
    expect(classifyQuestion("good").category).toBe("CONVERSATION");
    expect(classifyQuestion("understood").category).toBe("CONVERSATION");
    expect(classifyQuestion("help").category).toBe("CONVERSATION");
  });

  it("categorizes navigation queries as APP_NAVIGATION", () => {
    expect(classifyQuestion("Where can I find PMMA tests?").category).toBe("APP_NAVIGATION");
    expect(classifyQuestion("How do I compare BASS and Saffire?").category).toBe("APP_NAVIGATION");
    expect(classifyQuestion("Take me to the 3D fire model").category).toBe("APP_NAVIGATION");
  });

  it("categorizes high-level combustion queries as COMBUSTION_SCIENCE", () => {
    expect(classifyQuestion("How does zero gravity affect flame spread?").category).toBe("COMBUSTION_SCIENCE");
    expect(classifyQuestion("Why are flames spherical in space?").category).toBe("COMBUSTION_SCIENCE");
    expect(classifyQuestion("Explain the fire tetrahedron").category).toBe("COMBUSTION_SCIENCE");
  });

  it("categorizes data/fuel/measurement queries as EVIDENCE_DATA", () => {
    expect(classifyQuestion("How many fuel samples burned in Saffire-II?").category).toBe("EVIDENCE_DATA");
    expect(classifyQuestion("What did BASS measure for airflow?").category).toBe("EVIDENCE_DATA");
    expect(classifyQuestion("PMMA sphere 2 cm test points").category).toBe("EVIDENCE_DATA");
  });
});
