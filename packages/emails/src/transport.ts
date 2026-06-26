/**
 * Resend transport — pure functions with config injected (no env coupling), so
 * both the API (apps/api/src/lib/email.ts) and the campaign send script share
 * one implementation. When `apiKey` is empty the send is simulated and logged,
 * keeping local dev working end-to-end without a real key.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";

/** Resend caps batch calls at 100 messages. */
const MAX_BATCH = 100;

export interface ResendConfig {
  /** Resend API key. Empty string => simulate (log + fake message ids). */
  apiKey: string;
  /** Verified From address, e.g. `Ira <hello@yourdomain.com>`. */
  from: string;
  /** Default reply-to applied when a message doesn't override it. */
  replyTo?: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text alternative (improves deliverability). */
  text?: string;
  /** Per-message reply-to override. */
  replyTo?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

function toResendPayload(config: ResendConfig, email: OutgoingEmail) {
  return {
    from: config.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    reply_to: email.replyTo ?? config.replyTo,
  };
}

/** Send a single email. */
export async function sendViaResend(config: ResendConfig, email: OutgoingEmail): Promise<SendResult> {
  if (!config.apiKey) {
    console.log("[email] (simulated) to=%s subject=%s", email.to, email.subject);
    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toResendPayload(config, email)),
    });

    if (!res.ok) {
      return { success: false, error: `Resend ${res.status}: ${await res.text()}` };
    }
    const data = (await res.json()) as { id?: string };
    return { success: true, messageId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface BatchOptions {
  /** Pause between chunks (ms) to stay under Resend's rate limit. Default 600. */
  throttleMs?: number;
}

/**
 * Send many emails, chunked into batches of 100 via Resend's batch API. Returns
 * one result per input email, in order. Useful for list/campaign sends.
 */
export async function sendBatchViaResend(
  config: ResendConfig,
  emails: OutgoingEmail[],
  opts: BatchOptions = {},
): Promise<SendResult[]> {
  const throttleMs = opts.throttleMs ?? 600;
  const results: SendResult[] = [];

  for (let i = 0; i < emails.length; i += MAX_BATCH) {
    const chunk = emails.slice(i, i + MAX_BATCH);

    if (!config.apiKey) {
      for (const email of chunk) {
        console.log("[email] (simulated batch) to=%s subject=%s", email.to, email.subject);
        results.push({ success: true, simulated: true, messageId: `sim_${Date.now()}_${results.length}` });
      }
      continue;
    }

    try {
      const res = await fetch(RESEND_BATCH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((email) => toResendPayload(config, email))),
      });

      if (!res.ok) {
        const error = `Resend ${res.status}: ${await res.text()}`;
        for (const _ of chunk) results.push({ success: false, error });
      } else {
        const data = (await res.json()) as { data?: { id?: string }[] };
        chunk.forEach((_, j) => results.push({ success: true, messageId: data.data?.[j]?.id }));
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      for (const _ of chunk) results.push({ success: false, error });
    }

    if (i + MAX_BATCH < emails.length && throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }

  return results;
}
