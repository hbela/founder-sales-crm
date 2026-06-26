// Transactional / outreach wrapper
export { CrmEmail } from "./CrmEmail.js";
export type { CrmEmailProps, BrandConfig } from "./CrmEmail.js";
export { renderCrmEmail, renderCrmEmailText, renderEmail } from "./render.js";

// Campaign design-system components
export { CampaignShell } from "./components/CampaignShell.js";
export type { CampaignShellProps } from "./components/CampaignShell.js";
export { Hero } from "./components/Hero.js";
export type { HeroProps } from "./components/Hero.js";
export { Heading, Body } from "./components/Heading.js";
export type { HeadingProps } from "./components/Heading.js";
export { LogoStrip } from "./components/LogoStrip.js";
export type { LogoStripProps } from "./components/LogoStrip.js";
export { FeatureList } from "./components/FeatureList.js";
export type { FeatureListProps } from "./components/FeatureList.js";
export { VideoBlock } from "./components/VideoBlock.js";
export type { VideoBlockProps } from "./components/VideoBlock.js";
export { CtaButton } from "./components/CtaButton.js";
export type { CtaButtonProps } from "./components/CtaButton.js";
export { CampaignFooter } from "./components/CampaignFooter.js";
export type { CampaignFooterProps } from "./components/CampaignFooter.js";
export * as tokens from "./components/tokens.js";

// Transport (Resend) + asset helpers
export { sendViaResend, sendBatchViaResend } from "./transport.js";
export type { ResendConfig, OutgoingEmail, SendResult, BatchOptions } from "./transport.js";
export { assetUrl, assertAbsolute, createAssetResolver } from "./assets.js";
