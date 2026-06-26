/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import { cardBackgroundImage, cardShadow, colors, fontStack } from "./tokens.js";

export interface CampaignShellProps {
  /** Hidden inbox-preview line (1 sentence). */
  preheader: string;
  children: ReactNode;
}

/**
 * Outer shell for a marketing campaign: white page, hidden preheader, and a
 * centered 560px card with the sky-gradient + noise texture, soft layered
 * shadow and tight 4px corners. Blocks are composed as children; full-bleed
 * blocks (e.g. Hero) sit flush, content blocks add their own padding.
 */
export function CampaignShell({ preheader, children }: CampaignShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: colors.pageBg, fontFamily: fontStack }}>
        <Section style={{ padding: "32px 16px" }}>
          <Container style={container}>
            <Section style={card}>{children}</Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

const container = {
  width: "560px",
  maxWidth: "560px",
  margin: "0 auto",
};

const card = {
  backgroundColor: colors.cardFill,
  backgroundImage: cardBackgroundImage,
  borderRadius: "4px",
  boxShadow: cardShadow,
  overflow: "hidden" as const,
  padding: 0,
};
