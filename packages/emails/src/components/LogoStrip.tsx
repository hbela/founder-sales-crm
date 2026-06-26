/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Column, Img, Row, Section } from "@react-email/components";
import { SECTION_PX } from "./tokens.js";

export interface LogoStripProps {
  /** Integration/brand logos — typically 3–5, distributed across the width. */
  logos: { src: string; alt: string }[];
}

/** Frost-glass logo cards spread evenly across the card width. */
export function LogoStrip({ logos }: LogoStripProps) {
  const width = `${Math.floor(100 / Math.max(logos.length, 1))}%`;
  return (
    <Section style={{ padding: `8px ${SECTION_PX} 16px` }}>
      <Row>
        {logos.map((logo, i) => (
          <Column key={i} align="center" style={{ width }}>
            <div style={chip}>
              <Img src={logo.src} alt={logo.alt} width={40} height={40} style={{ display: "block", borderRadius: "3px" }} />
            </div>
          </Column>
        ))}
      </Row>
    </Section>
  );
}

const chip = {
  display: "inline-block",
  width: "72px",
  height: "72px",
  lineHeight: "72px",
  textAlign: "center" as const,
  backgroundColor: "#f4f4f7",
  backgroundImage: "linear-gradient(180deg, #fbfbfd 0%, #f1f1f5 100%)",
  borderRadius: "3px",
  boxShadow: "0 1px 3px rgba(24,24,27,0.08)",
  padding: "16px",
  boxSizing: "border-box" as const,
};
