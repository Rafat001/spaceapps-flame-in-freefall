"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, API_BASE } from "@/lib/api";
import { assistantHeaders } from "@/lib/byok";
import { detectPathways, Pathway } from "@/lib/pathways";
import { getGeneralConcept, getConversationalReply, getProjectAnswer, getSimplifiedConcept } from "@/lib/copilotKnowledge";
import { classifyQuestion } from "@/lib/queryClassifier";
import { checkGuardrails } from "@/lib/sparkGuardrails";
import { resolveConversationContext, ConversationTurn } from "@/lib/contextResolver";
import { Markdown, CiteSource } from "@/components/Markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  category?: string;
  categoryBadge?: string;
  pathways?: Pathway[];
  citations?: CiteSource[];
  directLabel?: string;
  flags?: string[];
  isError?: boolean;
  /** True when Dr. Spark declined the question (off-topic, secrets, injection, harmful). */
  refused?: boolean;
}

/** Keep stored history bounded so localStorage never grows without limit. */
const MAX_STORED_MESSAGES = 60;

/**
 * The curated answers use "•" bullets on single newlines, which Markdown would collapse into one paragraph.
 * Turn them into real list items (and make sure a list starts after a blank line).
 */
export function toChatMarkdown(text: string): string {
  const lines = String(text ?? "").replace(/^(\s*)• /gm, "$1- ").split("\n");
  const out: string[] = [];
  const isItem = (l: string) => /^\s*(- |\d+\. )/.test(l);
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (isItem(line) && !/^\s/.test(line) && prev !== undefined && prev.trim() !== "" && !isItem(prev)) out.push("");
    out.push(line);
  }
  return out.join("\n");
}

const STORAGE_KEY = "freefall_dr_spark_chat_v1";
const LEGACY_STORAGE_KEY = "freefall_copilot_chat_v1";

const STARTER_PROMPTS = [
  "What is combustion science?",
  "How does zero gravity affect flame spread?",
  "How are the rankings made?",
  "Where are PMMA tests located?",
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load chat history from localStorage (or sessionStorage fallback) on mount
  useEffect(() => {
    try {
      const saved =
        (typeof window !== "undefined" && window.localStorage?.getItem(STORAGE_KEY)) ||
        (typeof window !== "undefined" && window.localStorage?.getItem(LEGACY_STORAGE_KEY)) ||
        (typeof window !== "undefined" && window.sessionStorage?.getItem(STORAGE_KEY)) ||
        (typeof window !== "undefined" && window.sessionStorage?.getItem(LEGACY_STORAGE_KEY));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_STORED_MESSAGES));
      }
    } catch {}
  }, []);

  // Save chat history to localStorage (with sessionStorage fallback)
  useEffect(() => {
    try {
      if (messages.length > 0) {
        const serialized = JSON.stringify(messages.slice(-MAX_STORED_MESSAGES));
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, serialized);
        }
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_KEY, serialized);
        }
      } else {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {}
  }, [messages]);

  // Auto-scroll when messages update or loading state changes
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  async function handleSend(textToSend?: string) {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const reply = (msg: Omit<ChatMessage, "id" | "role" | "timestamp">, delay = 160) => {
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", timestamp: Date.now(), ...msg }]);
        setLoading(false);
      }, delay);
    };

    // Step 0: Guardrails. Dr. Spark only answers questions about this project (combustion science, the NASA PSI
    // evidence, and how the app works). Secrets, prompt-injection, harmful and off-topic requests are declined here,
    // before any local lookup or API call.
    const guard = checkGuardrails(
      q,
      messages.map((m) => ({ role: m.role, text: m.text, refused: m.refused })),
    );
    if (!guard.allowed) {
      reply({
        text: guard.text,
        category: "Out of scope",
        categoryBadge: guard.reason === "off_topic" ? "OFF-TOPIC" : "NOT ALLOWED",
        pathways: guard.pathways,
        refused: true,
      });
      return;
    }

    // Step 1: Resolve conversation context from history (pronoun resolution, follow-ups, entities)
    const contextHistory: ConversationTurn[] = messages
      .filter((m) => !m.refused)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        text: m.text,
        citations: m.citations?.map((c) => ({
          investigation_id: c.investigation_id,
          acronym: c.acronym,
        })),
      }));
    const resolvedContext = resolveConversationContext(q, contextHistory);
    const enrichedQuery = resolvedContext.enrichedQuery;

    // Step 1.5: If user expressed confusion or asked for clarification ("dont clear on it yet", "not clear what CFD actually is")
    if (resolvedContext.isClarification && resolvedContext.activeTopic) {
      const simplified = getSimplifiedConcept(resolvedContext.activeTopic);
      if (simplified) {
        reply({ text: simplified.text, category: "Clarification", categoryBadge: "SIMPLIFIED", pathways: simplified.pathways }, 180);
        return;
      }
    }

    // Step 2: Categorize the question
    const classified = classifyQuestion(enrichedQuery);

    // Category 1: Pure conversation / pleasantry (thanks, greetings, identity, acknowledgments, help)
    if (classified.category === "CONVERSATION") {
      const conv = getConversationalReply(q) || getConversationalReply(enrichedQuery) || {
        text: "I'm **Dr. Spark**! Ask me about NASA microgravity combustion science, the experiment evidence in this app, or how the app works (rankings, data sources, coverage).",
        pathways: [
          { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
          { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        ],
      };
      reply({ text: conv.text, category: classified.categoryLabel, categoryBadge: classified.badge, pathways: conv.pathways }, 150);
      return;
    }

    // Category 2: Questions about the project itself or core combustion-science basics -> curated, instant answer.
    // Use the user's own words first so a follow-up's added context can't hijack the match.
    const projectAnswer = getProjectAnswer(q) || (enrichedQuery !== q ? getProjectAnswer(enrichedQuery) : null);
    if (projectAnswer) {
      reply({ text: projectAnswer.summary, category: "About this project", categoryBadge: "PROJECT", pathways: projectAnswer.pathways.slice(0, 3) }, 180);
      return;
    }

    // Category 3: In-App Navigation request
    if (classified.category === "APP_NAVIGATION") {
      const navPathways = detectPathways({ query: enrichedQuery });
      const concept = getGeneralConcept(q);
      const text = navPathways.length
        ? "Here's where to go in the app for that:" + (concept ? `\n\n${concept.summary}` : "")
        : "I couldn't match that to a specific page. These are the best starting points:";
      reply({
        text,
        category: classified.categoryLabel,
        categoryBadge: classified.badge,
        pathways: navPathways.length
          ? navPathways
          : [
              { label: "Catalog Explorer", href: "/explorer", badge: "EXPLORE" },
              { label: "Scenario Ranking", href: "/insights", badge: "RANKING" },
              { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
            ],
      }, 180);
      return;
    }

    // Category 3 & 4: Combustion Science & Evidence Data -> Call RAG API
    try {
      const headers = assistantHeaders(API_BASE);
      const res = await api("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: enrichedQuery }),
        headers,
      });

      const concept = getGeneralConcept(enrichedQuery) || getGeneralConcept(q);

      // Extract straight, concrete answer
      let answerText = "";
      const isAbstained = res.abstained || res.mode === "abstained" || String(res.answer || "").toLowerCase().includes("insufficient evidence");
      const isPlainTextRequest = /\b(what is|what are|explain|in plain text|in simple terms|plain english|meaning|definition|summary|tell me about)\b/i.test(enrichedQuery);

      if (concept && (isPlainTextRequest || classified.category === "COMBUSTION_SCIENCE" || isAbstained)) {
        // Conceptual, definition, or plain-text request: provide clear, plain-English explanation
        answerText = concept.summary;
      } else if (res.direct?.answer) {
        answerText = res.direct.answer;
      } else if (!isAbstained && res.answer) {
        answerText = res.answer;
      } else if (concept) {
        answerText = concept.summary;
      } else if (res.template_summary && !isAbstained) {
        answerText = res.template_summary;
      } else {
        answerText =
          "I couldn't find a sourced answer to that in the NASA records this app indexes, and I'd rather not guess.\n\n" +
          "Try naming a specific experiment (e.g. **BASS**, **Saffire-II**, **FLEX**), a material (**PMMA**, **Nomex**) or a " +
          "condition (oxygen %, pressure, airflow) — or open one of the pathways below.";
      }

      // Anti-repetition guard: if the answer is identical to what assistant just said
      const prevAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
      if (prevAssistantMsg && prevAssistantMsg.text.trim() === answerText.trim()) {
        answerText = `As noted above, that is the core overview for **${resolvedContext.activeTopic || "this topic"}**.\n\nWould you like me to clarify a specific point, or should we explore one of the related in-app pathways below?`;
      }

      // Detect in-app pathways to guide the user
      const detectedPathways = detectPathways({
        query: enrichedQuery,
        citations: res.citations || res.direct?.citations,
        directAnswer: answerText,
      });

      // Merge concept pathways with detected pathways (deduplicated by href)
      const mergedPathways: Pathway[] = [];
      const seenHrefs = new Set<string>();
      for (const p of [...(concept?.pathways || []), ...detectedPathways]) {
        if (!seenHrefs.has(p.href)) {
          seenHrefs.add(p.href);
          mergedPathways.push(p);
        }
      }
      const pathways = mergedPathways.slice(0, 3);

      const s0 = res.direct?.citations?.[0];
      const s0Citation: CiteSource | null = s0 ? {
        ref: "S0",
        acronym: s0.acronym || "Direct computed answer",
        section: s0.locator || res.direct?.label,
        source_url: s0.url || s0.source_url,
        url: s0.url || s0.source_url,
        investigation_id: s0.investigation_id,
        quote: s0.quote,
      } : null;

      const citations: CiteSource[] = [
        ...(s0Citation ? [s0Citation] : []),
        ...(res.direct?.citations || []),
        ...(res.citations || []),
      ];

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: answerText,
        timestamp: Date.now(),
        category: classified.categoryLabel,
        categoryBadge: classified.badge,
        pathways,
        citations,
        directLabel: res.direct?.label,
        flags: res.direct?.flags,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // API unreachable: fall back to curated knowledge when we have it rather than showing an error.
      const concept = getGeneralConcept(enrichedQuery) || getGeneralConcept(q);
      if (concept) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: concept.summary + "\n\n_(Live evidence search is unavailable right now, so this is my built-in overview.)_",
            timestamp: Date.now(),
            category: classified.categoryLabel,
            categoryBadge: classified.badge,
            pathways: concept.pathways.slice(0, 3),
          },
        ]);
        return;
      }
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        text: "I couldn't reach the evidence service right now. Please try again in a moment.",
        timestamp: Date.now(),
        isError: true,
        category: classified.categoryLabel,
        categoryBadge: classified.badge,
        pathways: detectPathways({ query: enrichedQuery }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([]);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
  }

  function handleNavigate(href: string) {
    router.push(href);
  }

  return (
    <div className="chatbot-root" aria-live="polite">
      {/* Floating launcher button */}
      {!open && (
        <button
          type="button"
          className="chatbot-launcher"
          onClick={() => setOpen(true)}
          aria-label="Open Dr. Spark Chatbot"
          title="Open Dr. Spark (Evidence & Pathway Assistant)"
        >
          <span className="chatbot-launcher-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c1.5 2.5 4 4.5 4 8 0 4-3 7-4 7s-4-3-4-7c0-3.5 2.5-5.5 4-8z" fill="var(--accent)" stroke="var(--accent)" />
              <path d="M12 10c.8 1.2 2 2.2 2 4 0 2-1.5 3.5-2 3.5s-2-1.5-2-3.5c0-1.8 1.2-2.8 2-4z" fill="var(--navy-deep)" stroke="var(--navy-deep)" />
              <circle cx="12" cy="3" r="1" fill="#fff" />
            </svg>
          </span>
          <span className="chatbot-launcher-label">Dr. Spark</span>
          <span className="chatbot-pulse-dot" />
        </button>
      )}

      {/* Floating chat panel */}
      {open && (
        <section className="chatbot-panel" role="dialog" aria-modal="false" aria-label="Dr. Spark Chat">
          {/* Header */}
          <header className="chatbot-header">
            <div className="chatbot-title-group">
              <span className="chatbot-status-indicator" />
              <div>
                <h3 className="chatbot-title">Dr. Spark</h3>
                <p className="chatbot-sub">NASA Combustion AI & Pathways</p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="chatbot-hdr-btn"
                  onClick={handleClear}
                  title="Clear conversation"
                  aria-label="Clear chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="chatbot-hdr-btn"
                onClick={() => setOpen(false)}
                title="Minimize chatbot"
                aria-label="Close chatbot"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Messages list */}
          <div className="chatbot-body" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chatbot-welcome">
                <div className="chatbot-welcome-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M12 2c1.5 2.5 4 4.5 4 8 0 4-3 7-4 7s-4-3-4-7c0-3.5 2.5-5.5 4-8z" />
                    <circle cx="12" cy="18" r="2" fill="var(--accent)" />
                  </svg>
                </div>
                <h4 className="chatbot-welcome-heading">Welcome to Dr. Spark</h4>
                <p className="chatbot-welcome-desc">
                  Ask me about microgravity combustion science, NASA&apos;s experiment evidence, or how this app works — rankings,
                  data sources and tools. I only answer questions related to this project.
                </p>
                <div className="chatbot-starters">
                  <p className="chatbot-starters-label">Try asking:</p>
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="chatbot-starter-btn"
                      onClick={() => handleSend(prompt)}
                    >
                      {prompt} →
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chatbot-stream">
                {messages.map((m) => (
                  <article
                    key={m.id}
                    className={`chatbot-bubble chatbot-bubble--${m.role} ${m.isError ? "chatbot-bubble--error" : ""}`}
                  >
                    {m.role === "assistant" && (
                      <div className="chatbot-bubble-kicker">
                        <span>DR. SPARK</span>
                        {m.categoryBadge && <span className="chatbot-category-badge">{m.categoryBadge}</span>}
                        {m.directLabel && <span className="chatbot-kind-badge">{m.directLabel}</span>}
                      </div>
                    )}

                    <div className="chatbot-bubble-text">
                      <Markdown text={m.role === "assistant" ? toChatMarkdown(m.text) : m.text} citations={m.citations} />
                    </div>

                    {/* Pathways inside the application */}
                    {m.pathways && m.pathways.length > 0 && (
                      <div className="chatbot-pathways">
                        <span className="chatbot-pathways-title">App Pathways:</span>
                        <div className="chatbot-pathways-list">
                          {m.pathways.map((p) => (
                            <button
                              key={p.href}
                              type="button"
                              className="chatbot-pathway-chip"
                              onClick={() => handleNavigate(p.href)}
                            >
                              <span className="chatbot-pathway-badge">{p.badge}</span>
                              <span className="chatbot-pathway-label">{p.label}</span>
                              <span className="chatbot-pathway-arrow">↗</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}

                {loading && (
                  <div className="chatbot-bubble chatbot-bubble--assistant chatbot-bubble--loading">
                    <div className="chatbot-typing-indicator">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="typing-text">Retrieving evidence & pathways…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input form */}
          <form
            className="chatbot-footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fire in space, the data, or this app…"
              className="chatbot-input"
              maxLength={400}
              disabled={loading}
            />
            <button
              type="submit"
              className={`chatbot-send-btn ${input.trim() ? "chatbot-send-btn--active" : "chatbot-send-btn--idle"}`}
              disabled={loading}
              aria-label="Send message to Dr. Spark"
              title={input.trim() ? "Send message (Enter)" : "Type a message to send"}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chatbot-send-svg"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
              </svg>
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
