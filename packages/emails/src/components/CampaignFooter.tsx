/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { Hr, Link, Section, Text } from "@react-email/components";
import { SECTION_PX, colors, type } from "./tokens.js";

export interface CampaignFooterProps {
  /** Company name shown in the footer. */
  company: string;
  /** Physical mailing address — required by CAN-SPAM. */
  address: string;
  /** Unsubscribe URL — required by CAN-SPAM / GDPR. */
  unsubscribeUrl: string;
}

/** Compliant footer: company line, physical address, unsubscribe link. */
export function CampaignFooter({ company, address, unsubscribeUrl }: CampaignFooterProps) {
  return (
    <Section style={{ padding: `0 ${SECTION_PX} 24px` }}>
      <Hr style={{ borderColor: "rgba(24,24,27,0.08)", margin: "8px 0 16px" }} />
      <Text style={meta}>
        {company} · {address}
      </Text>
      <Text style={meta}>
        <Link href={unsubscribeUrl} target="_blank" style={link}>
          Unsubscribe
        </Link>
      </Text>
    </Section>
  );
}

const meta = {
  fontSize: type.label,
  lineHeight: 1.5,
  color: colors.muted,
  margin: "0 0 4px",
};

const link = {
  color: colors.muted,
  textDecoration: "underline",
};
