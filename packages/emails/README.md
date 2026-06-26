# @founder-crm/emails

React Email components + Resend transport for this CRM.

- **Transactional / outreach** — `CrmEmail` wraps the body users write in the CRM
  (used by `apps/api`). See `src/CrmEmail.tsx`.
- **Marketing campaigns** — composable design-system components
  (`CampaignShell`, `Hero`, `VideoBlock`, `CtaButton`, …) in `src/components/`.

## Author + preview

```bash
pnpm --filter @founder-crm/emails preview   # http://localhost:3030, hot-reload
```

Campaign sources live in `emails/` (preview entries) and are registered for
sending in `src/campaigns.tsx`.

## Assets

Host under `apps/web/public/email-assets/<campaign>/…` (see that folder's README).
Absolutize paths with `assetUrl(path, EMAIL_ASSET_BASE_URL)` — inboxes need
`https://…`, not relative paths.

## Send

```bash
# Render only (no send) — sanity check
pnpm --filter @founder-crm/emails send -- --campaign launch --dry

# Test to yourself first (ALWAYS)
pnpm --filter @founder-crm/emails send -- --campaign launch --subject "We're live" --to you@example.com

# Send to a list (.csv / .txt one-per-line, or .json string[] | {email}[])
pnpm --filter @founder-crm/emails send -- --campaign launch --subject "We're live" --list ./recipients.csv
```

Env (root `.env`): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `REPLY_TO_EMAIL`.
With no key, sends are **simulated** (logged, not delivered). Batches chunk at
100 and throttle (`--throttle <ms>`). The API uses the same transport via
`sendEmail()` / `sendBatch()` in `apps/api/src/lib/email.ts`.

## Pre-send checklist

- [ ] All asset URLs absolute (`https://…`) and reachable on the deployed origin
- [ ] Preheader set (first arg to `CampaignShell`)
- [ ] Subject not spammy (no ALL CAPS / `!!!`)
- [ ] Every image has meaningful `alt`
- [ ] GIFs < 2 MB each, total email < 5 MB
- [ ] Unsubscribe link in footer (`CampaignFooter`) — CAN-SPAM / GDPR
- [ ] `--dry` shows expected bytes and `Contains <video> tag: false`
- [ ] Sent a `--to` test to yourself, clicked every link
- [ ] `from` is on a Resend-verified domain
