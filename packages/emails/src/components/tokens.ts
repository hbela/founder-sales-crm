/**
 * Shared design tokens for campaign email components. Mirrors the
 * email-campaigns design system: tight 4px radii, layered soft shadows, a
 * light-sky gradient card with 6% SVG noise grain, and a 3-size type scale.
 */

export const fontStack =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const colors = {
  ink: "#18181b", // headings + CTA fill
  body: "#3f3f46", // body copy
  muted: "#71717a", // labels / footer
  cardFill: "#f7fbfe",
  pageBg: "#ffffff",
} as const;

/** Type scale — keep to these four sizes only. */
export const type = {
  h1: "26px",
  body: "15px",
  label: "13px",
  cta: "14px",
} as const;

/** 6% fractal-noise grain (200×200, tiled) for subtle card depth. */
const NOISE_SVG =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wNiIvPjwvc3ZnPg==";

/** Card background: noise grain over a left→right light-sky gradient. */
export const cardBackgroundImage = `url('${NOISE_SVG}'), linear-gradient(90deg, #edf6fd 0%, #f6fbfe 50%, #fcfdfe 100%)`;

export const cardShadow =
  "0 2px 8px rgba(24,24,27,0.06), 0 8px 24px rgba(24,24,27,0.04)";

/** Horizontal padding used by content blocks (hero/full-bleed images skip it). */
export const SECTION_PX = "28px";
