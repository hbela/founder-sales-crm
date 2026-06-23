/** Strips GLM delivery directions like [ENERGY: 8/10], [PAUSE: 0.5s], [SLOW DOWN]. */
export function cleanNarration(text: string): string {
  return text
    .replace(/\[[A-Z][^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
