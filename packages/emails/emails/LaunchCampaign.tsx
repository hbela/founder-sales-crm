/** @jsxRuntime automatic */
/** @jsxImportSource react */
import {
  Body,
  CampaignFooter,
  CampaignShell,
  CtaButton,
  FeatureList,
  Heading,
  Hero,
  LogoStrip,
  VideoBlock,
} from "../src/index.js";

/**
 * Sample marketing campaign composed from the design-system components.
 * Run `pnpm --filter @founder-crm/emails preview` and open
 * http://localhost:3030 to edit with live hot-reload.
 *
 * Swap the placeholder asset URLs for absolute https URLs before sending —
 * relative paths break in recipients' inboxes.
 */
export default function LaunchCampaign() {
  const base = "https://placehold.co";
  return (
    <CampaignShell preheader="Online booking for your practice — live in a day.">
      <Hero src={`${base}/560x300/edf6fd/18181b?text=Hero`} alt="Product hero" href="https://example.com" />

      <Heading eyebrow="New">Turn phone-only booking into 24/7 online booking</Heading>
      <Body>
        Most practices still book by phone — and lose patients after hours. We add online booking to your
        site in a day, no developer needed.
      </Body>

      <FeatureList
        items={[
          <>Go live in <strong>under a day</strong> — we handle setup</>,
          <>Syncs with your existing calendar</>,
          <>Practices see a <strong>20% lift</strong> in new appointments</>,
        ]}
      />

      <VideoBlock
        title="See it in action (30s)"
        gifSrc={`${base}/475x280/cbd5e1/18181b?text=Demo.gif`}
        blurredBgSrc={`${base}/560x320/93c5fd/93c5fd?text=+`}
        href="https://example.com/demo"
      />

      <CtaButton href="https://example.com/start">Connect your calendar &rarr;</CtaButton>

      <LogoStrip
        logos={[
          { src: `${base}/40x40/ffffff/18181b?text=G`, alt: "Google" },
          { src: `${base}/40x40/ffffff/18181b?text=O`, alt: "Outlook" },
          { src: `${base}/40x40/ffffff/18181b?text=A`, alt: "Apple" },
          { src: `${base}/40x40/ffffff/18181b?text=C`, alt: "Cal" },
          { src: `${base}/40x40/ffffff/18181b?text=Z`, alt: "Zoom" },
        ]}
      />

      <CtaButton href="https://example.com/start">Get started &rarr;</CtaButton>

      <CampaignFooter
        company="Founder CRM"
        address="123 Market St, Berlin"
        unsubscribeUrl="https://example.com/unsubscribe?id={{contactId}}"
      />
    </CampaignShell>
  );
}
