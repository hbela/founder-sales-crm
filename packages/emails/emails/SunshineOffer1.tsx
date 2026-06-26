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
  VideoBlock,
  createAssetResolver,
} from "../src/index.js";

/**
 * Campaign: sunshine-offer1
 *
 * Preview:  pnpm --filter @founder-crm/emails preview      → http://localhost:3030
 * Send:     pnpm --filter @founder-crm/emails send -- --campaign sunshine-offer1 --dry
 *
 * Assets live in apps/web/public/email-assets/sunshine-offer1/ and resolve from
 * EMAIL_ASSET_BASE_URL (falls back to the local web dev server on :5173, so the
 * preview shows real images as long as `pnpm dev:web` is running and the files
 * exist). Drop in: hero.png, demo.gif, demo.mp4, hero-blur.png. See that
 * folder's README for sizes + the ffmpeg commands.
 */
const asset = createAssetResolver(process.env.EMAIL_ASSET_BASE_URL ?? "http://localhost:5173");
const a = (file: string) => asset(`email-assets/sunshine-offer1/${file}`);

export default function SunshineOffer1() {
  return (
    <CampaignShell preheader="A little sunshine for your inbox — limited-time offer inside.">
      <Hero src={a("hero.png")} alt="Sunshine offer" href="https://yourdomain.com/sunshine" />

      <Heading eyebrow="Limited time">Brighten up — 20% off this week only</Heading>
      <Body>
        We put together a sunshine offer just for you. It is live for the next 7 days and takes about
        a minute to claim — no code needed.
      </Body>

      <FeatureList
        items={[
          <>
            <strong>20% off</strong> your first month
          </>,
          <>Set up in under a minute</>,
          <>Cancel anytime — no strings</>,
        ]}
      />

      <VideoBlock
        title="See it in 30 seconds"
        gifSrc={a("demo.gif")}
        href="https://yourdomain.com/sunshine/demo"
        blurredBgSrc={a("hero-blur.png")}
      />

      <CtaButton href="https://yourdomain.com/sunshine/claim">Claim the offer &rarr;</CtaButton>

      <CampaignFooter
        company="Founder CRM"
        address="TODO — your physical mailing address (required by CAN-SPAM)"
        unsubscribeUrl="https://yourdomain.com/unsubscribe?id={{contactId}}"
      />
    </CampaignShell>
  );
}
