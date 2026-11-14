/** URL Text Fragments (`#:~:text=`) so a citation can land on the quoted passage.
 *  @see https://wicg.github.io/scroll-to-text-fragment/
 */

const PDF_RE = /\.pdf(?:$|[^A-Za-z0-9])/i;
const VIDEO_HOSTS = new Set(["youtube.com", "youtu.be", "youtube-nocookie.com"]);

/** Percent-encode a text-directive value; `-`, `,`, and `&` must be escaped (they are syntax). */
export function encodeTextDirectiveValue(s: string): string {
  return encodeURIComponent(s).replace(/-/g, "%2D");
}

export function isPdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return PDF_RE.test(`${u.pathname}${u.search}`);
  } catch {
    return PDF_RE.test(url);
  }
}

function isVideoWatchUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return VIDEO_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** Strip markdown, collapse whitespace, drop ingest prefixes / ellipses / partial edge words. */
export function cleanQuote(raw: string): string {
  let t = String(raw ?? "");
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  t = t.replace(/^\s*>+\s?/gm, "");
  t = t.replace(/(^|\s)[*_~]{1,3}(?=\S)/g, "$1");
  t = t.replace(/(?<=\S)[*_~]{1,3}(?=\s|[.,;:!?)]|$)/g, "");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&nbsp;/gi, " ");
  t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/(?:\\?\*)+$/g, "").trim();
  const leadingEllipsis = /^(?:\.{3}|…)\s*/.test(t);
  const trailingEllipsis = /\s*(?:\.{3}|…)$/.test(t);
  t = t.replace(/^(?:\.{3}|…)\s*/, "").replace(/\s*(?:\.{3}|…)$/, "");
  // Ingest prefixes: "[BASS] …" or "[BASS table, CSV record 2, test] …" — not real page text.
  t = t.replace(/^\[[A-Za-z][A-Za-z0-9+./-]{2,24}\]\s+/, "");
  t = t.replace(/^\[[^\]]{0,80}\b(?:CSV record|table)\b[^\]]{0,80}\]\s+/i, "");
  const words = t.split(" ").filter(Boolean);
  if (!words.length) return "";
  // Drop a leading token that looks cut off (starts with a mid-word hyphen or punctuation).
  if (/^[^A-Za-z0-9“"'([]/.test(words[0]) || (/^-$/.test(words[0]) || (/-$/.test(words[0]) && words[0].length < 4))) {
    words.shift();
  } else if (leadingEllipsis && /^[a-z]/.test(words[0]) && words[0].length < 4) {
    words.shift();
  }
  // Drop only an obviously cut last token (dangling hyphen or a 1-character leftover).
  const last = words[words.length - 1] ?? "";
  if (/[A-Za-z0-9]-$/.test(last) || (!trailingEllipsis && words.length > 3 && /^[A-Za-z]$/.test(last))) {
    words.pop();
  }
  return words.join(" ").trim();
}

function wordsOf(t: string): string[] {
  return t.split(/\s+/).filter(Boolean);
}

/** Prefer a complete sentence so start/end words come from one visible span.
 *  Official HTML extracts often prefix a real sentence with concatenated nav/title tokens
 *  ("Physical Sciences Combustion Science Explore Combustion Science being performed…").
 *  Start at the first title-case word that is soon followed by a lowercase word.
 */
function sentenceSpan(t: string): string {
  const words = wordsOf(t);
  let i = 0;
  for (let k = 0; k < words.length - 3; k++) {
    if (/^[A-Z]/.test(words[k]) && words.slice(k + 1, k + 4).some((w) => /^[a-z]/.test(w))) {
      i = k;
      break;
    }
  }
  const from = words.slice(i).join(" ");
  const m = from.match(/^[\s\S]{15,320}?[.!?](?=\s|$)/);
  if (m && wordsOf(m[0]).length >= 4) return m[0].trim();
  return from || t;
}

/**
 * Build the `text=…` directive body (no `#:~:` prefix), or null if the span is too thin.
 * Long spans use `textStart,textEnd` (first ~5 words, last ~5 words); short ones use an exact phrase.
 */
export function textDirective(raw: string | null | undefined): string | null {
  const cleaned = cleanQuote(String(raw ?? ""));
  if (!cleaned) return null;
  const span = sentenceSpan(cleaned);
  const words = wordsOf(span);
  if (words.length < 2 && cleaned.length < 12) return null;
  if (words.length <= 10) {
    return `text=${encodeTextDirectiveValue(words.join(" "))}`;
  }
  const start = words.slice(0, 5).join(" ");
  // Prefer a stable textEnd: if the last word has no sentence punctuation it may be a mid-word slice.
  let endWords = words.slice(-5);
  const tail = endWords[endWords.length - 1] ?? "";
  if (endWords.length > 2 && /[A-Za-z0-9]$/.test(tail) && !/[.!?…”'")\]]$/.test(tail)) {
    endWords = endWords.slice(0, -1);
  }
  const end = endWords.join(" ");
  if (!start || !end || start === end) {
    return `text=${encodeTextDirectiveValue(words.slice(0, 8).join(" "))}`;
  }
  return `text=${encodeTextDirectiveValue(start)},${encodeTextDirectiveValue(end)}`;
}

/** Append a text fragment to an http(s) HTML URL. PDFs, videos, and existing `#:~:` stay unchanged. */
export function withTextFragment(url: string, quote?: string | null): string {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  if (url.includes("#:~:") || isPdfUrl(url) || isVideoWatchUrl(url)) return url;
  const dir = textDirective(quote);
  if (!dir) return url;
  const hash = url.indexOf("#");
  if (hash === -1) return `${url}#:~:${dir}`;
  // Existing #fragment (e.g. #page-section or #archived) — directive follows it.
  return `${url}:~:${dir}`;
}
