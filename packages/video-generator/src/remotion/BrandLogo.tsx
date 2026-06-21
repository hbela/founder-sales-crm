/** Brand colours derived from the web app's OKLCH CSS variables. */
export const BRAND_PRIMARY = "#0047AB";
export const BRAND_DARK = "#0A1931";
export const BRAND_ACCENT = "#9EFFA9";
export const BRAND_NAME = "Founder CRM";
export const BRAND_TAGLINE = "Sales pipeline for founders";

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

/** The "F" badge — a rounded primary-coloured square with a white letter, matching the web app sidebar logo. */
export function LogoBadge({ size = 200 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: BRAND_PRIMARY,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: `0 ${size * 0.1}px ${size * 0.3}px rgba(0, 71, 171, 0.4)`,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: size * 0.6,
          fontWeight: 800,
          fontFamily: FONT_STACK,
          lineHeight: 1,
        }}
      >
        F
      </span>
    </div>
  );
}

/** Full static lockup: badge + wordmark. Reusable as a watermark or end card. */
export function BrandLogo({ size = 200 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.2 }}>
      <LogoBadge size={size} />
      <span
        style={{
          color: "white",
          fontSize: size * 0.36,
          fontWeight: 700,
          fontFamily: FONT_STACK,
        }}
      >
        {BRAND_NAME}
      </span>
    </div>
  );
}
