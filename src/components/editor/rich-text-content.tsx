"use client";

import { sanitizeRichHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  const isHtml = html.includes("<");
  const safe = isHtml ? sanitizeRichHtml(html) : null;

  if (!isHtml) {
    return (
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>
        {html}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rich-text max-w-none text-sm leading-relaxed",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe ?? "" }}
    />
  );
}
