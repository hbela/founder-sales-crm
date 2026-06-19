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
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${htmlEscape(body)}</div>`;
}
