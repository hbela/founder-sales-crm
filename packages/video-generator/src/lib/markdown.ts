import { marked } from "marked";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Reads `<!-- key: value -->` from a block of markdown. */
export function extractComment(body: string, key: string): string | undefined {
  const re = new RegExp(`<!--\\s*${key}\\s*:\\s*(.+?)\\s*-->`, "i");
  return body.match(re)?.[1]?.trim();
}

export function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, "");
}

/** Converts markdown to a single line of plain text. */
export function stripMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
