/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Fragment, type CSSProperties } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface BrandConfig {
  /** Company / product name shown in the header and footer. */
  name: string;
  /** Accent colour used for the CTA button and links (any CSS colour). */
  color: string;
  /** Optional logo image URL. Falls back to the brand name as text. */
  logoUrl?: string;
  /** Optional physical mailing address shown in the footer (CAN-SPAM). */
  address?: string;
}

export interface CrmEmailProps {
  /** The message body — plain text, already variable-substituted. Blank
   *  lines separate paragraphs; single newlines become line breaks. */
  body: string;
  /** Brand/theme used to render the wrapper. */
  brand: BrandConfig;
  /** Inbox preview snippet (the grey text after the subject). */
  previewText?: string;
  /** Reply-to address surfaced in the reply-based unsubscribe footer. */
  replyTo?: string;
  /** Optional call-to-action button rendered beneath the body. */
  cta?: { label: string; href: string };
}

/**
 * Branded transactional/outreach email shell. The body the user writes in the
 * CRM is dropped into a polished, email-client-safe React Email layout so every
 * message gets consistent header, typography, CTA and compliant footer.
 */
export function CrmEmail({ body, brand, previewText, replyTo, cta }: CrmEmailProps) {
  const accent = brand.color || "#4f46e5";

  return (
    <Html>
      <Head />
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            {brand.logoUrl ? (
              <Img src={brand.logoUrl} alt={brand.name} height={32} style={logo} />
            ) : (
              <Text style={{ ...wordmark, color: accent }}>{brand.name}</Text>
            )}
          </Section>

          <Section style={card}>
            <BodyContent body={body} />

            {cta ? (
              <Section style={ctaWrap}>
                <Button href={cta.href} style={{ ...button, backgroundColor: accent }}>
                  {cta.label}
                </Button>
              </Section>
            ) : null}
          </Section>

          <Hr style={divider} />

          <Section>
            <Text style={footerText}>
              Don&apos;t want to hear from us? Reply with the word{" "}
              <strong>UNSUBSCRIBE</strong>
              {replyTo ? (
                <>
                  {" "}
                  (
                  <Link href={`mailto:${replyTo}`} style={{ ...footerLink, color: accent }}>
                    {replyTo}
                  </Link>
                  )
                </>
              ) : null}{" "}
              and we&apos;ll remove you.
            </Text>
            <Text style={footerMeta}>
              {brand.name}
              {brand.address ? ` · ${brand.address}` : ""}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Render plain-text body: blank lines → paragraphs, single newlines → <br/>. */
function BodyContent({ body }: { body: string }) {
  const paragraphs = body.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <Text key={i} style={paragraph}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {line}
                {j < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </Text>
        );
      })}
    </>
  );
}

export default CrmEmail;

/* ----------------------------------------------------------------------------
 * Styles — inline objects keep rendering predictable across email clients.
 * ------------------------------------------------------------------------- */

const main: CSSProperties = {
  backgroundColor: "#f4f4f7",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  margin: 0,
  padding: "24px 0",
};

const container: CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0 16px",
};

const header: CSSProperties = {
  padding: "8px 0 16px",
};

const logo: CSSProperties = {
  display: "block",
};

const wordmark: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.01em",
};

const card: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #ececf0",
  padding: "32px",
};

const paragraph: CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#1f2933",
  margin: "0 0 16px",
};

const ctaWrap: CSSProperties = {
  paddingTop: "8px",
};

const button: CSSProperties = {
  display: "inline-block",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "8px",
  padding: "12px 20px",
};

const divider: CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0 12px",
};

const footerText: CSSProperties = {
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#8a94a6",
  margin: "0 0 6px",
};

const footerLink: CSSProperties = {
  textDecoration: "underline",
};

const footerMeta: CSSProperties = {
  fontSize: "12px",
  color: "#aab1bf",
  margin: 0,
};
