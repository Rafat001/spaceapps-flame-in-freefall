"use client";
import ReactMarkdown from "react-markdown";

/** Renders an LLM answer as markdown. 【S3】 and [S3] citation markers are shown as bold [S3]. */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const md = String(text ?? "").replace(/【(S\d+)[^】]*】/g, "[$1]").replace(/\[(S\d+)\]/g, "**[$1]**");
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown>{md}</ReactMarkdown>
    </div>
  );
}
