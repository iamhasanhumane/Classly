import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "a",
];

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/** Plain-text preview for cards (legacy plain descriptions pass through). */
export function richTextPreview(value: string, maxLen = 160): string {
  if (!value) return "";
  const text = value.includes("<")
    ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : value.trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
