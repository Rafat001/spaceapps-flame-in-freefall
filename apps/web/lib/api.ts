export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, friendlyError(0, null));
  }
  if (!res.ok) {
    let detail: string | null = null;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") detail = j.detail;
    } catch {}
    throw new ApiError(res.status, friendlyError(res.status, detail));
  }
  return res.json();
}

const RAW = /\bHTTP\b|\b[1-5]\d\d\b|Error\b|Exception|Traceback|statusText/i;

/** Visitor-facing message for a failed API call. Never shows HTTP status codes, status text or exception names:
 *  plain-language messages written by the API (detail strings) are passed through only when they contain none. */
export function friendlyError(status: number, detail: string | null): string {
  if (status === 0) return "Can't reach the server right now. Check your connection and try again in a moment.";
  if (status === 429) return "Too many requests right now. Please wait a minute and try again.";
  if (status >= 500) return "The server is busy or restarting. Please try again in a minute.";
  if (status === 404) return detail && !RAW.test(detail) ? detail : "That item could not be found.";
  if (detail && !RAW.test(detail) && detail.length < 400) return detail;
  return "Something went wrong with that request. Please try again.";
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
