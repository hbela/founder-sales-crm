/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode } from "react";
import { Button, Img, Section } from "@react-email/components";
import { SECTION_PX, colors, type } from "./tokens.js";

export interface CtaButtonProps {
  href: string;
  children: ReactNode;
  /** Optional small logo rendered inline before the label. */
  logoSrc?: string;
}

/**
 * Single black pill CTA. Place one right after the first proof video (highest
 * conversion moment) and one at the bottom — keep it the only primary action.
 */
export function CtaButton({ href, children, logoSrc }: CtaButtonProps) {
  return (
    <Section style={{ padding: `8px ${SECTION_PX} 24px`, textAlign: "center" }}>
      <Button href={href} target="_blank" style={button}>
        {logoSrc ? <Img src={logoSrc} width={20} height={20} alt="" style={logo} /> : null}
        <span style={{ verticalAlign: "middle" }}>{children}</span>
      </Button>
    </Section>
  );
}

const button = {
  display: "inline-block",
  backgroundColor: colors.ink,
  color: "#ffffff",
  fontSize: type.cta,
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "4px",
  padding: "14px 24px",
};

const logo = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "8px",
  borderRadius: "3px",
};
