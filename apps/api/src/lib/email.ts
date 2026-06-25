import { env } from "../env.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Send an email via Resend. When no API key is configured (local dev),
 * the send is simulated and logged so the outreach flow still works end-to-end.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!env.resendApiKey) {
    console.log("[email] (simulated) to=%s subject=%s", input.to, input.subject);
    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Resend ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, messageId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bodyToHtml(body: string): string {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${htmlEscape(body)}</div>${unsubscribeFooter()}`;
}

/**
 * Plain opt-out footer appended to every outgoing email. Reply-based so it needs
 * no public endpoint: n8n's inbox watcher flags "unsubscribe" replies and calls
 * POST /api/webhooks/unsubscribe. Required for cold-outreach compliance.
 */
function unsubscribeFooter(): string {
  const replyTo = env.replyToEmail || env.resendFromEmail;
  return `<div style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:8px;">Don't want to hear from us? Reply with the word <strong>UNSUBSCRIBE</strong> and we'll remove you${replyTo ? ` (${htmlEscape(replyTo)})` : ""}.</div>`;
}
