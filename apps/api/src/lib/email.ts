import {
  renderCrmEmail,
  sendViaResend,
  sendBatchViaResend,
  type BrandConfig,
  type ResendConfig,
  type SendResult,
} from "@founder-crm/emails";
import { env } from "../env.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export type SendEmailResult = SendResult;

/** Resend transport config derived from env (empty key => simulated send). */
function resendConfig(): ResendConfig {
  return {
    apiKey: env.resendApiKey,
    from: env.resendFromEmail,
    replyTo: env.replyToEmail || undefined,
  };
}

/**
 * Send an email via Resend. When no API key is configured (local dev),
 * the send is simulated and logged so the outreach flow still works end-to-end.
 */
export function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return sendViaResend(resendConfig(), input);
}

/**
 * Send many emails via Resend's batch API (chunked at 100, throttled). Returns
 * one result per input, in order.
 */
export function sendBatch(inputs: SendEmailInput[]): Promise<SendEmailResult[]> {
  return sendBatchViaResend(resendConfig(), inputs);
}

/** Brand/theme pulled from env and applied to every outgoing email. */
function brandConfig(): BrandConfig {
  return {
    name: env.brandName,
    color: env.brandColor,
    logoUrl: env.brandLogoUrl || undefined,
    address: env.brandAddress || undefined,
  };
}

export interface RenderBodyOptions {
  /** Inbox preview snippet (grey text after the subject). */
  previewText?: string;
  /** Optional call-to-action button rendered under the body. */
  cta?: { label: string; href: string };
}

/**
 * Render a plain-text body into the branded React Email (CrmEmail) layout.
 *
 * The reply-based unsubscribe footer lives inside CrmEmail — it needs no public
 * endpoint: n8n's inbox watcher flags "unsubscribe" replies and calls
 * POST /api/webhooks/unsubscribe. Required for cold-outreach compliance.
 */
export function bodyToHtml(body: string, opts: RenderBodyOptions = {}): Promise<string> {
  return renderCrmEmail({
    body,
    brand: brandConfig(),
    replyTo: env.replyToEmail || env.resendFromEmail || undefined,
    previewText: opts.previewText,
    cta: opts.cta,
  });
}
