/**
 * Dr. Spark scope guardrails.
 *
 * Every question passes through `checkGuardrails` before anything else runs (local knowledge, navigation, or the
 * /api/ask call). Dr. Spark only talks about this project: NASA microgravity combustion / fire-safety science, the
 * PSI evidence the app indexes, and how the app itself works (pages, rankings, coverage, data sources, the assistant).
 *
 * Order of checks (first hit wins):
 *   1. harmful        – instructions for arson, incendiary or explosive devices
 *   2. injection      – attempts to override instructions or extract the prompt/config
 *   3. secrets        – API keys, tokens, passwords, env vars, admin tokens, internal config
 *   4. strong domain  – combustion / fire / NASA experiment / app vocabulary → allowed
 *   5. off-topic      – explicit off-topic subjects (politics, sports, weather, coding, ...) → refused
 *   6. conversation   – greetings, thanks, "who are you", help → allowed
 *   7. weak domain    – generic science/app words (data, test, score, page, ...) → allowed
 *   8. follow-up      – "why?", "tell me more", "what about it" after an on-topic turn → allowed
 *   9. otherwise      → refused as off-topic
 *
 * These are client-side checks for a good UX; the API independently answers only from the indexed NASA sources and
 * refuses credential / prompt-extraction requests on the server.
 */
import type { Pathway } from "@/lib/pathways";

export type GuardReason = "harmful" | "injection" | "secrets" | "off_topic";

export type GuardVerdict =
  | { allowed: true }
  | { allowed: false; reason: GuardReason; text: string; pathways: Pathway[] };

export interface GuardHistoryTurn {
  role: "user" | "assistant";
  text: string;
  /** Set on assistant turns that were themselves guardrail refusals. */
  refused?: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------------------------------------------
// 1. Harmful: real-world fire-setting or weapons. (Fire *science* and fire *safety* questions are fine.)
// ---------------------------------------------------------------------------------------------------------------
const HARMFUL = [
  /\b(make|build|create|assemble|craft|cook|mix|how (do|can|could|would|should) (i|you|we|someone|one))\b.{0,40}\b(bombs?|explosives|explosive devices?|napalm|molotov( cocktails?)?|thermite|incendiary (devices?|weapons?|bombs?)|pipe ?bombs?|fire ?bombs?|ieds?)\b/,
  /\barson\b/,
  /\bburn (down|up)\b.{0,20}\b(house|home|building|car|school|office|property|someone'?s?|neighbou?r'?s?)\b/,
  /\bset (fire to|on fire|alight)\b.{0,30}\b(house|home|building|car|school|office|person|someone|people|neighbou?r|him|her|them|property)\b/,
  /\b(house|home|building|car|school|office|person|someone|people|neighbou?r|him|her|them|property)\b.{0,30}\bon fire\b/,
  /\b(start|cause|light)\b.{0,15}\bfires?\b.{0,40}\b(without (getting caught|being (seen|detected|caught))|undetected|to (hurt|kill|harm|injure|destroy))\b/,
  /\b(disable|bypass|defeat|tamper with)\b.{0,30}\b(smoke (detector|alarm)s?|fire alarms?|sprinklers?)\b/,
];

// ---------------------------------------------------------------------------------------------------------------
// 2. Prompt injection / configuration extraction
// ---------------------------------------------------------------------------------------------------------------
const INJECTION = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,30}\b(previous|prior|above|earlier|all|your|the|these|system)\b.{0,20}\b(instructions?|rules?|prompts?|guidelines?|guardrails?|restrictions?|context)\b/,
  /\b(system|initial|hidden|original|developer|internal) (prompt|message|instructions?)\b/,
  /\b(your|ur) (prompt|instructions|rules|guidelines|guardrails|configuration|config|source code)\b/,
  /\b(repeat|print|show|reveal|output|dump|leak)\b.{0,30}\b(the )?(text|words|everything|message|instructions?) (above|before|so far)\b/,
  /\b(jailbreak|dan mode|developer mode|god mode|unfiltered mode|no restrictions)\b/,
  /\b(you are now|from now on,? you|pretend (to be|you are|you're)|roleplay as|role-play as|simulate being)\b/,
  /(^|\b(you|please|now|can you|could you)\b ?)act as (a|an|if|my)\b/,
];

// ---------------------------------------------------------------------------------------------------------------
// 3. Secrets / credentials / internal config
// ---------------------------------------------------------------------------------------------------------------
// Note: a bare "key" is NOT a secret noun ("the key findings of BASS"); only qualified keys are.
const SECRET_NOUN =
  "((?:api|access|secret|private|ssh|groq|openai|anthropic|gemini|llm|ai|admin|server|license|licence)[ _-]?keys?|tokens?|passwords?|passcodes?|passphrases?|" +
  "secrets?(?! (?:to|of|behind|ingredient))|credentials?|auth(?:entication)? (?:tokens?|headers?)|bearer tokens?|session (?:ids?|cookies?)|" +
  "env(?:ironment)? (?:vars?|variables?|file)|\\.env|config(?:uration)? files?|admin (?:panel|access|login)|" +
  "database (?:url|urls|password|credentials|connection(?: string)?))";
const OWNER =
  "(your|ur|yours|the|this|server'?s?|admin|backend|system|project'?s?|app'?s?|site'?s?|developer'?s?|developers'?|team'?s?|groq|openai|anthropic|gemini|nasa'?s?|dr\\.? spark'?s?|spark'?s?)";
const SECRET_PATTERNS = [
  new RegExp(`\\b${OWNER}\\b(?: \\w+){0,2} ${SECRET_NOUN}\\b`),
  /\b(your|ur|the) keys?\s*\??$/,
  new RegExp(`\\b(what'?s|what is|what are|give|send|show|reveal|tell|share|print|leak|dump|expose|paste|list|display|read out|access|steal|get|find|hack|crack|guess)\\b.{0,40}\\b${SECRET_NOUN}\\b`),
  /\b(hack|crack|brute ?force|exploit|bypass|break into)\b.{0,40}\b(app|site|server|api|database|backend|account|admin|you)\b/,
  /\b(admin_token|groq_api_key|openai_api_key|anthropic_api_key|gemini_api_key|x-llm-key|x-admin-token)\b/,
];
// The user asking how to use *their own* key (BYOK) is a legitimate app question, not a secret request.
const OWN_KEY = /\b(my own|my|bring your own|byok|our own|personal) (groq |api |llm |ai )?(api[ _-]?)?keys?\b|\bbyok\b|\bbring your own key\b/;

// ---------------------------------------------------------------------------------------------------------------
// 4. Conversation (handled by getConversationalReply)
// ---------------------------------------------------------------------------------------------------------------
const CONVERSATION = [
  /^(hi|hello|hey|hiya|yo|greetings|good (morning|afternoon|evening)|howdy)\b/,
  /\b(thanks?|thank you|thx|ty|appreciate it)\b/,
  /^(good|great|awesome|perfect|nice|understood|got it|makes sense|clear now|ok|okay|cool|yep|yes|no|nope|sure|roger|i understand|noted|sounds good)\b/,
  /\b(who are you|what are you|are you (an? )?(ai|bot|robot|human|real)|who (made|created|built) you|what is dr\.? spark|tell me about yourself|introduce yourself|how are you)\b/,
  /^(help|what can you do|what do you do|how (do i|to) use (you|this)|features|commands|options)\b/,
  /^(bye|goodbye|see you|cya|farewell)\b/,
];

// ---------------------------------------------------------------------------------------------------------------
// 5. Strong domain vocabulary (combustion science, NASA experiments, the app itself)
// ---------------------------------------------------------------------------------------------------------------
const STRONG_DOMAIN = new RegExp(
  "\\b(" +
    [
      // combustion & fire science
      "combust\\w*", "fires?", "flames?", "flammab\\w*", "inflammab\\w*", "burn\\w*", "ignit\\w*", "extinct\\w*", "extinguish\\w*",
      "smoke", "smoulder\\w*", "smolder\\w*", "soot\\w*", "fuels?", "oxidi[sz]\\w*", "oxidants?", "oxygen", "o2", "pyroly\\w*",
      "droplets?", "diffusion", "buoyan\\w*", "convection", "heat release", "hrr", "loi", "cool flames?", "premixed", "laminar",
      "radiative", "quench\\w*", "suppress\\w*", "fire safety", "tetrahedron", "spread rate", "flashover", "char", "charr\\w*",
      // gravity & space environment
      "microgravity", "micro-gravity", "zero[ -]?g", "zero gravity", "0g", "1g", "reduced gravity", "partial gravity", "low gravity",
      "weightless\\w*", "free ?fall", "spacecraft", "space station", "iss", "astronauts?", "cabin", "habitats?", "rovers?",
      "lunar", "moon", "mars", "martian", "artemis", "gateway", "apollo", "mir", "skylab", "orbit\\w*", "cygnus", "glovebox", "msg",
      "spacesuits?", "drop towers?", "parabolic",
      // NASA programmes & investigations
      "nasa", "psi", "psi-\\d+", "physical sciences informatics", "saffire\\S*", "bass\\S*", "flex\\S*", "acme", "cfi\\S*", "sofie",
      "flare", "luci", "fm2", "lsp", "tgdf", "elf", "slice", "spice", "daft", "cir", "investigations?", "experiments?",
      // materials
      "pmma", "acrylic", "plexiglas\\w*", "nomex", "sibal", "kapton", "teflon", "silicone", "cotton", "fiberglass", "fibreglass",
      "heptane", "decane", "methanol", "ethanol", "methane", "propane", "ethylene", "polymers?", "plastics?", "fabrics?", "textiles?",
      // the app & its features
      "flame in freefall", "dr\\.? spark", "spark", "androflame", "firelab", "spacefire", "beyond psi", "space apps", "hackathon",
      "rank\\w*", "scenario fit", "scenarios?", "coverage matrix", "coverage", "explorer", "catalog\\w*", "compare", "comparison",
      "insights", "fire dynamics", "this (app|site|website|project|tool|dashboard|page)", "the (app|site|website|project|tool|dashboard)",
      "citations?", "evidence", "datasets?", "cfd",
    ].join("|") +
    ")\\b"
);

// ---------------------------------------------------------------------------------------------------------------
// 6. Explicit off-topic subjects (only applied when no strong domain term is present)
// ---------------------------------------------------------------------------------------------------------------
const OFF_TOPIC = new RegExp(
  "\\b(" +
    [
      "presidents?", "prime ministers?", "elections?", "vot(e|ing)", "politic\\w*", "government", "congress", "parliament", "senat\\w*",
      "democrats?", "republicans?", "trump", "biden", "putin", "king", "queen", "royal family", "wars?", "military", "religio\\w*", "god",
      "weather", "forecast", "temperature (today|tomorrow|outside)", "rain", "sunny",
      "football", "soccer", "cricket", "basketball", "nba", "nfl", "fifa", "baseball", "tennis", "olympics", "sports?", "match score",
      "movies?", "films?", "netflix", "tv shows?", "series", "songs?", "lyrics", "music", "singers?", "actors?", "actress\\w*", "celebrit\\w*",
      "games?", "gaming", "minecraft", "fortnite", "anime",
      "stocks?", "shares", "crypto\\w*", "bitcoin", "ethereum", "forex", "invest\\w*", "loans?", "mortgage", "tax(es)?", "salary",
      "recipes?", "cook(ing)?", "restaurants?", "food", "diet", "calories", "workout", "dating", "girlfriend", "boyfriend", "relationships?",
      "horoscope", "zodiac", "astrology", "jokes?", "poems?", "stor(y|ies)", "songs?", "essays?", "homework", "assignment",
      "python", "javascript", "java", "c\\+\\+", "sql", "html", "css", "react", "code", "coding", "program(ming)?", "regex", "excel",
      "translate", "translation", "capital of", "population of", "who won", "what time", "today'?s date", "what day",
      "news", "headlines", "medical", "doctor", "medicine", "symptoms?", "lawyer", "legal advice", "chatgpt", "bard",
    ].join("|") +
    ")\\b"
);

// ---------------------------------------------------------------------------------------------------------------
// 7. Weak domain vocabulary: on-topic when nothing explicitly off-topic is present
// ---------------------------------------------------------------------------------------------------------------
const WEAK_DOMAIN =
  /\b(space|gravity|science|scientific|physics|chemistry|chemical|reaction|heat|thermal|temperature|pressure|airflow|air ?flow|ventilation|fans?|atmospheres?|psi|kpa|data|records?|tests?|runs?|measure\w*|sources?|scores?|weights?|criteria|methodology|page|pages|tools?|features?|research\w*|studies|study|materials?|samples?|hazards?|safety|risks?|detect\w*|alarms?|sensors?|limit(s|ations)?|certif\w*|accura\w*|reliab\w*|trust\w*|hallucinat\w*|ai|llm|model|groq|byok|bring your own key|own key|settings)\b/;

// ---------------------------------------------------------------------------------------------------------------
// 8. Follow-ups that rely on the previous on-topic turn
// ---------------------------------------------------------------------------------------------------------------
const FOLLOW_UP =
  /^(why|how( so)?|and|so|but|really|what about|tell me more|more|go on|continue|elaborate|explain( (more|that|it|further))?|example|for example|such as|like what|which (one|ones)|meaning|what do you mean|what does (that|it|this) mean|in simple(r)? (terms|words)|simpler|eli5|can you (simplify|elaborate|explain))\b|\b(it|its|that|this|they|them|those|these|there)\b/;

const DEFAULT_PATHWAYS: Pathway[] = [
  { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
  { label: "Scenario Ranking", href: "/insights", badge: "RANKING" },
  { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
];

export const GUARD_REPLIES: Record<GuardReason, { text: string; pathways: Pathway[] }> = {
  off_topic: {
    text:
      "Sorry, I can't answer anything that isn't related to this project. I'm **Dr. Spark**, and I only cover:\n\n" +
      "• **Combustion & fire-safety science** — e.g. *\"What is combustion science?\"*, *\"Why are flames round in microgravity?\"*\n" +
      "• **NASA PSI experiment evidence** — e.g. *\"What did BASS measure?\"*, *\"Which tests used PMMA?\"*\n" +
      "• **How this app works** — e.g. *\"How are the rankings made?\"*, *\"Where does the data come from?\"*\n\n" +
      "Try asking me something along those lines!",
    pathways: DEFAULT_PATHWAYS,
  },
  secrets: {
    text:
      "I can't share API keys, tokens, passwords, environment variables or any other internal configuration of this project — " +
      "and I don't have access to them anyway.\n\n" +
      "If you'd like AI-written summaries with **your own Groq key**, you can add it on the **AI Settings** page. It stays only in " +
      "your browser tab and is sent only with AI requests.\n\nAnything about microgravity combustion or this app I can help with?",
    pathways: [
      { label: "AI Settings (bring your own key)", href: "/settings", badge: "SETTINGS" },
      { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
    ],
  },
  injection: {
    text:
      "I can't change my instructions, take on a different role, or reveal how I'm configured. I'm **Dr. Spark**, and I stick to " +
      "NASA microgravity combustion science, the PSI evidence in this app, and how the app works.\n\nWhat would you like to know about those?",
    pathways: DEFAULT_PATHWAYS,
  },
  harmful: {
    text:
      "I can't help with starting fires, arson, or making incendiary or explosive devices.\n\n" +
      "I'm happy to explain fire **safety** science instead — how flames spread and go out in microgravity, how spacecraft detect " +
      "and suppress fires, or what NASA's experiments have learned.",
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
      { label: "SpaceFire Evolution", href: "/spacefire", badge: "HISTORY" },
    ],
  },
};

function refuse(reason: GuardReason): GuardVerdict {
  const r = GUARD_REPLIES[reason];
  return { allowed: false, reason, text: r.text, pathways: r.pathways };
}

export function isSecretRequest(q: string): boolean {
  const s = norm(q).replace(/\bbring your own\b/g, "byok");
  if (/\b(admin_token|groq_api_key|openai_api_key|anthropic_api_key|gemini_api_key|x-llm-key|x-admin-token)\b/.test(s)) return true;
  const mentionsOwnKey = OWN_KEY.test(s);
  const mentionsYours = /\b(your|ur|yours|server'?s?|admin|developer'?s?|team'?s?)\b/.test(s);
  if (mentionsOwnKey && !mentionsYours) return false;
  return SECRET_PATTERNS.some((p) => p.test(s));
}

export function isOnTopic(q: string): boolean {
  const s = norm(q);
  if (STRONG_DOMAIN.test(s)) return true;
  if (OFF_TOPIC.test(s)) return false;
  return WEAK_DOMAIN.test(s);
}

/** Decide whether Dr. Spark may answer `rawQuery`. `history` is the conversation so far (oldest first). */
export function checkGuardrails(rawQuery: string, history: GuardHistoryTurn[] = []): GuardVerdict {
  const q = norm(rawQuery);
  if (!q) return { allowed: true };

  if (HARMFUL.some((p) => p.test(q))) return refuse("harmful");
  if (INJECTION.some((p) => p.test(q))) return refuse("injection");
  if (isSecretRequest(q)) return refuse("secrets");
  if (STRONG_DOMAIN.test(q)) return { allowed: true };
  if (OFF_TOPIC.test(q)) return refuse("off_topic");
  if (CONVERSATION.some((p) => p.test(q.replace(/[.,!?;:]/g, "")))) return { allowed: true };
  if (WEAK_DOMAIN.test(q)) return { allowed: true };

  // A short follow-up ("why?", "tell me more", "what does that mean") continues the previous on-topic exchange.
  if (FOLLOW_UP.test(q)) {
    const lastAssistant = [...history].reverse().find((t) => t.role === "assistant");
    if (lastAssistant && !lastAssistant.refused) return { allowed: true };
  }

  return refuse("off_topic");
}
