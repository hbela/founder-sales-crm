# n8n — Gmail Reply Sync

This folder holds the n8n workflow that closes the reply loop for [campaign-automation.md](../campaign-automation.md)
(Phase 1f). n8n watches your Google Workspace inbox and tells the CRM when a prospect
replies or opts out — the one thing the CRM cannot detect on its own (Resend is outbound only).

```
recipient replies ─▶ Gmail inbox ─▶ [n8n] Gmail Trigger
        Extract Reply (sender + subject + opt-out detection)
                          │
              Is Unsubscribe? ──true──▶ POST /api/webhooks/unsubscribe  (suppress + cancel sends)
                          └──false─────▶ POST /api/webhooks/reply        (contact → REPLIED)
```

## What the CRM side expects

Both endpoints live in `apps/api/src/modules/webhooks/routes.ts` and are guarded by the
shared header `x-webhook-secret` whenever `N8N_WEBHOOK_SECRET` is set in the CRM `.env`.

| Endpoint | Body | Effect |
|----------|------|--------|
| `POST /api/webhooks/reply` | `{ email, subject?, receivedAt? }` | Contact advances **NEW or CONTACTED → REPLIED**, logs `REPLY_RECEIVED`. Later stages (INTERESTED/CUSTOMER/…) are never downgraded. |
| `POST /api/webhooks/unsubscribe` | `{ email }` | Adds the address to `Suppression`, sets `Contact.unsubscribedAt`, cancels PENDING outreach, logs the opt-out. |

A missing/wrong secret returns **401**. An unknown email returns `{ ok: true, matched: false }`
(reply) — n8n treats that as success and moves on.

## Import & configure

1. **Import** — in n8n (https://n8ndev.appointer.hu/): *Workflows → Import from File* →
   select `reply-sync.workflow.json`.
2. **Gmail credential** — open the **Gmail Trigger** node and attach a *Gmail OAuth2* credential
   for the Workspace mailbox that receives replies (the same address you set as
   `REPLY_TO_EMAIL` in the CRM so replies thread back there).
3. **Set CRM URL + secret** — open the **Extract Reply** code node and edit the two top lines:
   - `CRM_API_BASE_URL` → the **publicly reachable** URL of the CRM API (n8n is remote, so
     `localhost` won't work — expose the API or use a tunnel for testing).
   - `WEBHOOK_SECRET` → the exact value of `N8N_WEBHOOK_SECRET` in the CRM `.env`.
4. **(Optional) Narrow the trigger** — by default it polls all of `INBOX` every minute. To only
   react to campaign replies, create a Gmail filter/label (e.g. `campaign-replies`) and swap the
   `labelIds` in the **Gmail Trigger** node.
5. **Activate** the workflow.

## Opt-out detection

The **Extract Reply** node flags a message as an unsubscribe when the subject/snippet matches
`unsubscribe`, `opt-out`, `leiratkoz` (Hungarian), or a standalone `stop`. Tune that regex in the
node if your audience uses different wording. Everything else is treated as a normal reply.

## Test without sending real mail

With the API running and `N8N_WEBHOOK_SECRET=testsecret`:

```bash
# reply → contact should flip to REPLIED
curl -X POST "$API/api/webhooks/reply" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: testsecret" \
  -d '{"email":"prospect@example.com","subject":"Re: your message"}'

# opt-out → contact suppressed
curl -X POST "$API/api/webhooks/unsubscribe" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: testsecret" \
  -d '{"email":"prospect@example.com"}'

# wrong secret → 401
curl -i -X POST "$API/api/webhooks/reply" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: nope" \
  -d '{"email":"prospect@example.com"}'
```

In n8n itself, use **Execute Workflow** with the Gmail Trigger pinned to a sample message, or send a
real reply from a test address once activated.
