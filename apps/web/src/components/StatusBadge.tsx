import { Badge } from "@/components/ui/badge";
import type { ContactStatus, CampaignStatus, OutreachStatus, FollowUpStatus, ProspectStatus } from "@founder-crm/types";

const CONTACT_STATUS_STYLE: Record<ContactStatus, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; label: string }> = {
  NEW: { variant: "secondary", label: "New" },
  CONTACTED: { variant: "outline", label: "Contacted" },
  REPLIED: { variant: "warning", label: "Replied" },
  INTERESTED: { variant: "default", label: "Interested" },
  MEETING_BOOKED: { variant: "default", label: "Meeting" },
  CUSTOMER: { variant: "success", label: "Customer" },
  LOST: { variant: "destructive", label: "Lost" },
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const s = CONTACT_STATUS_STYLE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  ACTIVE: { variant: "success", label: "Active" },
  PAUSED: { variant: "warning", label: "Paused" },
  COMPLETED: { variant: "outline", label: "Completed" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = CAMPAIGN_STATUS_STYLE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const OUTREACH_STATUS_STYLE: Record<OutreachStatus, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; label: string }> = {
  PENDING: { variant: "secondary", label: "Pending" },
  SENDING: { variant: "warning", label: "Sending" },
  SENT: { variant: "success", label: "Sent" },
  FAILED: { variant: "destructive", label: "Failed" },
};

export function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  const s = OUTREACH_STATUS_STYLE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function FollowupStatusBadge({ status }: { status: FollowUpStatus }) {
  return <Badge variant={status === "COMPLETED" ? "success" : "warning"}>{status === "COMPLETED" ? "Done" : "Pending"}</Badge>;
}

const PROSPECT_STATUS_STYLE: Record<ProspectStatus, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; label: string }> = {
  NEW: { variant: "secondary", label: "New" },
  ENRICHED: { variant: "outline", label: "Enriched" },
  NEEDS_REVIEW: { variant: "warning", label: "Needs review" },
  QUALIFIED: { variant: "default", label: "Qualified" },
  DISQUALIFIED: { variant: "destructive", label: "Disqualified" },
  IMPORTED: { variant: "success", label: "Imported" },
};

export function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
  const s = PROSPECT_STATUS_STYLE[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
