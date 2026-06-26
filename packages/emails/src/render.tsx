/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { CrmEmail, type CrmEmailProps } from "./CrmEmail.js";

/** Render any React Email element (e.g. a composed campaign) to HTML. */
export function renderEmail(element: ReactElement): Promise<string> {
  return render(element);
}

/** Render the branded CRM email to an HTML string ready to hand to Resend. */
export function renderCrmEmail(props: CrmEmailProps): Promise<string> {
  return render(<CrmEmail {...props} />);
}

/** Render the plain-text alternative (improves deliverability / accessibility). */
export function renderCrmEmailText(props: CrmEmailProps): Promise<string> {
  return render(<CrmEmail {...props} />, { plainText: true });
}
