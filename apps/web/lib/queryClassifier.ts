export type QuestionCategory =
  | "CONVERSATION"
  | "COMBUSTION_SCIENCE"
  | "APP_NAVIGATION"
  | "EVIDENCE_DATA";

export interface ClassifiedQuestion {
  category: QuestionCategory;
  categoryLabel: string;
  badge: string;
  explanation?: string;
}

export function classifyQuestion(rawQuery: string): ClassifiedQuestion {
  const q = rawQuery.trim().toLowerCase().replace(/[.,!?;:]/g, "");

  // 1. Conversational intent (thanks, greetings, acknowledgments, identity, help)
  if (
    /\b(thanks?|thank you|thx|ty|appreciate it)\b/.test(q) ||
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/.test(q) ||
    /^(good|great|awesome|perfect|nice|understood|got it|makes sense|clear now|ok|okay|cool|yep|yes|sure|roger|i understand|noted|sounds good)\b/.test(q) ||
    /\b(do you an ai|are you an ai|are you ai|you an ai|are you a bot|are you human|who are you|what are you|what is dr spark|tell me about yourself|introduce yourself)\b/.test(q) ||
    /^(help|what can you do|how to use|features|commands|options)\b/.test(q) ||
    /^(bye|goodbye|see you|cya|farewell)\b/.test(q)
  ) {
    return {
      category: "CONVERSATION",
      categoryLabel: "Chat & Assistant",
      badge: "CONVERSATION",
    };
  }

  // 2. Navigation intent ("where can I find", "take me to", "how do I compare", "show me the 3d model")
  if (
    /^(where (can i|to|do i|is)|how (can i|do i) (find|navigate|open|compare|see)|take me to|show me|open|navigate to|go to)\b/i.test(rawQuery) ||
    /\b(where is the|where are the (tools|features|pages|datasets))\b/i.test(rawQuery)
  ) {
    return {
      category: "APP_NAVIGATION",
      categoryLabel: "In-App Pathway",
      badge: "NAVIGATION",
    };
  }

  // 3. Combustion Science, Materials & Conceptual Explanations ("what is pmma", "explain flame spread", "in plain text")
  if (
    /\b(what is|what are|explain|tell me about|in plain text|in simple terms|plain english|meaning of|definition of|overview of|summary of)\b/i.test(rawQuery) ||
    /\b(how (does|do) (flames?|fire|smoke|combustion))\b/i.test(rawQuery) ||
    /\b(how does (zero gravity|zero-g|microgravity|space) affect|why (are|is) flames? (round|spherical)|absence of buoyancy|natural convection|diffusion[- ]dominated|what happens to (fire|flames?) in (microgravity|space|zero-g))\b/i.test(rawQuery) ||
    /\b(how (do|does) .* burn on the (moon|mars)|smoke detection|smoke detector|lunar gravity fire|martian gravity fire)\b/i.test(rawQuery) ||
    /\b(fire tetrahedron|fire dynamics|extinction limit|quenching diameter|suppression mechanism)\b/i.test(rawQuery) ||
    /\b(flame spread mechanism|insidious hazard)\b/i.test(rawQuery)
  ) {
    return {
      category: "COMBUSTION_SCIENCE",
      categoryLabel: "Combustion Science",
      badge: "PHYSICS",
    };
  }

  // 4. Default: Specific Evidence & RAG Data (tests, fuels, numbers, investigations)
  return {
    category: "EVIDENCE_DATA",
    categoryLabel: "NASA PSI Evidence",
    badge: "EVIDENCE",
  };
}
