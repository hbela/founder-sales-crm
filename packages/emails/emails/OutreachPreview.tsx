/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { CrmEmail } from "../src/CrmEmail.js";

/**
 * Preview entry for the `react-email` dev server. Run `pnpm --filter
 * @founder-crm/emails preview` and open http://localhost:3030 to edit the
 * CrmEmail layout with live hot-reload (the closest thing to Resend's editor).
 *
 * The `body` here mimics what the CRM produces after variable substitution.
 */
export default function OutreachPreview() {
  return (
    <CrmEmail
      brand={{
        name: "Founder CRM",
        color: "#4f46e5",
        address: "123 Market St, Berlin",
      }}
      previewText="Quick idea for ACME Dental"
      replyTo="founder@example.com"
      cta={{ label: "Book a 15-min call", href: "https://cal.com/example" }}
      body={`Hi Jordan,

I came across ACME Dental and noticed you're booking patients by phone. We help practices add online booking in a day — most see a 20% lift in new appointments.

Worth a quick look?

Best,
Bela`}
    />
  );
}
