/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode } from "react";
import { Heading as REHeading, Section, Text } from "@react-email/components";
import { SECTION_PX, colors, type } from "./tokens.js";

export interface HeadingProps {
  children: ReactNode;
  /** Small uppercase eyebrow above the title. */
  eyebrow?: string;
}

/** Hero title block (26px) with optional eyebrow label. */
export function Heading({ children, eyebrow }: HeadingProps) {
  return (
    <Section style={{ padding: `24px ${SECTION_PX} 0` }}>
      {eyebrow ? <Text style={eyebrowStyle}>{eyebrow}</Text> : null}
      <REHeading as="h1" style={h1}>
        {children}
      </REHeading>
    </Section>
  );
}

/** Body paragraph (15px). */
export function Body({ children }: { children: ReactNode }) {
  return (
    <Section style={{ padding: `0 ${SECTION_PX}` }}>
      <Text style={body}>{children}</Text>
    </Section>
  );
}

const eyebrowStyle = {
  fontSize: type.label,
  fontWeight: 600,
  letterSpacing: "0.4px",
  textTransform: "uppercase" as const,
  color: colors.muted,
  margin: "0 0 8px",
};

const h1 = {
  fontSize: type.h1,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.5px",
  color: colors.ink,
  margin: "0 0 12px",
};

const body = {
  fontSize: type.body,
  lineHeight: 1.65,
  color: colors.body,
  margin: "0 0 16px",
};
