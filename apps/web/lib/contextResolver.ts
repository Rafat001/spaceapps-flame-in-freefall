export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  citations?: Array<{ investigation_id?: string | null; acronym?: string | null }>;
}

export interface ResolvedContext {
  enrichedQuery: string;
  investigationIds?: string[];
  activeTopic?: string;
  isClarification?: boolean;
}

const PRONOUN_OR_FOLLOWUP = /\b(it|its|they|them|these|this|that|there|those|the experiment|the test|the investigation|how many runs|what about|and for|more details|tell me more|further details)\b/i;

const CLARIFICATION_REQUEST = /\b(not clear|dont clear|dont understand|didnt understand|still confused|explain more simply|in simpler terms|simple words|plain english|eli5|what does (that|it) mean|break it down|what is (it|that)|what.*actually is|not clear.*what)\b/i;

/** Resolves pronouns, clarifications, and contextual continuity from conversation history */
export function resolveConversationContext(
  currentQuery: string,
  history: ConversationTurn[]
): ResolvedContext {
  const q = currentQuery.trim();
  if (history.length === 0) {
    return { enrichedQuery: q };
  }

  // Find recent entities (investigations, fuels, concepts) from recent turns
  const recentTurns = history.slice(-4);
  const foundInvIds = new Set<string>();
  let recentAcronym: string | null = null;
  let recentFuel: string | null = null;
  let recentConcept: string | null = null;

  for (const turn of [...recentTurns].reverse()) {
    // Check citations
    if (turn.citations) {
      for (const c of turn.citations) {
        if (c.investigation_id) foundInvIds.add(c.investigation_id.toLowerCase());
        if (c.acronym && !recentAcronym) recentAcronym = c.acronym;
      }
    }

    // Check text for investigation mentions
    const psiMatch = turn.text.match(/\bpsi[- ]?(\d+)\b/i);
    if (psiMatch) {
      foundInvIds.add(`psi-${psiMatch[1]}`);
    }
    const acroMatch = turn.text.match(/\b(BASS-II|BASS|Saffire-II|Saffire|FLEX-2|FLEX|SPICE|DAFT|CFI|SLICE|ACME)\b/i);
    if (acroMatch && !recentAcronym) {
      recentAcronym = acroMatch[1];
    }
    const fuelMatch = turn.text.match(/\b(PMMA|Nomex|SIBAL|cotton|fiberglass|methane|propane|heptane|wax|acrylic|plexiglas)\b/i);
    if (fuelMatch && !recentFuel) {
      recentFuel = fuelMatch[1];
    }

    // Check for high-level concepts (CFD, cool flame, fire tetrahedron, etc.)
    const conceptMatch = turn.text.match(/\b(CFD|computational fluid dynamics|cool flames?|fire tetrahedron|fire dynamics|microgravity combustion|this app|flame in freefall)\b/i);
    if (conceptMatch && !recentConcept) {
      recentConcept = conceptMatch[1].toUpperCase() === "CFD" ? "CFD" : conceptMatch[1];
    }
  }

  // NEVER rewrite conversational pleasantries, acknowledgments, or identity questions
  const isConversational =
    /^(hi|hello|hey|thanks?|thank you|good|great|awesome|perfect|nice|understood|got it|makes sense|clear now|ok|okay|cool|yep|yes|sure|roger|i understand|noted|sounds good|bye|goodbye)\b/i.test(q) ||
    /\b(do you an ai|are you an ai|are you ai|you an ai|are you a bot|are you human|who made you|who are you|what are you)\b/i.test(q);

  if (isConversational) {
    return { enrichedQuery: q };
  }

  const isClarification = CLARIFICATION_REQUEST.test(q);
  const isFollowUp = isClarification || PRONOUN_OR_FOLLOWUP.test(q) || (q.split(" ").length <= 4 && !/\b(psi|bass|saffire|flex|pmma|cfd)\b/i.test(q));

  if (!isFollowUp) {
    return {
      enrichedQuery: q,
      investigationIds: foundInvIds.size > 0 ? Array.from(foundInvIds) : undefined,
    };
  }

  // Determine active topic cleanly
  // If recentConcept is present (e.g. CFD, cool flames), that is the primary concept
  // Otherwise combine experiment acronym and fuel (e.g. "BASS PMMA")
  let activeTopic = recentConcept;
  if (!activeTopic) {
    const parts = [recentAcronym, recentFuel].filter(Boolean);
    activeTopic = parts.length > 0 ? parts.join(" ") : undefined;
  }

  const additions: string[] = [];
  if (activeTopic && !new RegExp(`\\b${activeTopic}\\b`, "i").test(q)) {
    additions.push(activeTopic);
  }

  // If user is expressing confusion ("dont clear on it yet", "not clear what it actually is")
  if (isClarification && activeTopic) {
    return {
      enrichedQuery: `explain ${activeTopic} in plain English simply`,
      investigationIds: foundInvIds.size > 0 ? Array.from(foundInvIds) : undefined,
      activeTopic,
      isClarification: true,
    };
  }

  const enrichedQuery = activeTopic && additions.length > 0 ? `${q} (regarding ${activeTopic})` : q;

  return {
    enrichedQuery,
    investigationIds: foundInvIds.size > 0 ? Array.from(foundInvIds) : undefined,
    activeTopic,
    isClarification,
  };
}
