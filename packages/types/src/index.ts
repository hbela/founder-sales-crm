import { z } from "zod";

/* ----------------------------------------------------------------------------
 * Enums (shared across API + web, mirror Prisma enums)
 * ------------------------------------------------------------------------- */

export const CONTACT_STATUSES = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "MEETING_BOOKED",
  "CUSTOMER",
  "LOST",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const OUTREACH_STATUSES = ["PENDING", "SENDING", "SENT", "FAILED"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const FOLLOWUP_STATUSES = ["PENDING", "COMPLETED"] as const;
export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];

export const PROSPECT_STATUSES = [
  "NEW",
  "ENRICHED",
  "NEEDS_REVIEW",
  "QUALIFIED",
  "DISQUALIFIED",
  "IMPORTED",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_SOURCES = ["GOOGLE_PLACES", "CSV", "MANUAL"] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

export const ACTIVITY_TYPES = [
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "EMAIL_SENT",
  "REPLY_RECEIVED",
  "MEETING_BOOKED",
  "STATUS_CHANGED",
  "FOLLOWUP_DUE",
  "FOLLOWUP_COMPLETED",
  "NOTE_ADDED",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const TEMPLATE_VARIABLES = [
  "{{firstName}}",
  "{{lastName}}",
  "{{company}}",
  "{{website}}",
  "{{productName}}",
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/* ----------------------------------------------------------------------------
 * Schemas
 * ------------------------------------------------------------------------- */

const optionalString = z.string().trim().min(1).max(500).optional().or(z.literal(""));

// Reference to another entity by id. Most ids are cuids, but some (e.g. seeded
// templates/campaigns) use human-readable ids, so we accept any non-empty id.
const refId = z.string().min(1).max(64);

/* Product */
export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers and hyphens"),
  description: z.string().max(2000).optional().or(z.literal("")),
  website: optionalString,
});
export type ProductCreate = z.infer<typeof productCreateSchema>;
export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

/* Contact */
export const contactCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  company: optionalString,
  empNumber: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(10_000_000).optional(),
  ),
  email: z.string().trim().toLowerCase().email(),
  phone: optionalString,
  website: optionalString,
  industry: optionalString,
  country: optionalString,
  notes: z.string().max(5000).optional().or(z.literal("")),
  status: z.enum(CONTACT_STATUSES).optional(),
  productId: z.string().cuid().optional().or(z.literal("")),
});
export type ContactCreate = z.infer<typeof contactCreateSchema>;
export const contactUpdateSchema = contactCreateSchema.partial();
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;

/* Contact CSV import */
export const contactImportRowSchema = contactCreateSchema.pick({
  firstName: true,
  lastName: true,
  company: true,
  empNumber: true,
  email: true,
  phone: true,
  website: true,
  industry: true,
  country: true,
  notes: true,
});
export type ContactImportRow = z.infer<typeof contactImportRowSchema>;

export const contactImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
  productId: z.string().cuid().optional(),
});
export type ContactImport = z.infer<typeof contactImportSchema>;

/* Prospecting */
export const prospectDiscoverSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  districts: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
});
export type ProspectDiscover = z.infer<typeof prospectDiscoverSchema>;

export const prospectUpdateSchema = z.object({
  brandName: z.string().trim().min(1).max(200).optional(),
  legalName: optionalString,
  website: optionalString,
  generalEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: optionalString,
  address: optionalString,
  district: optionalString,
  dentistCount: z.coerce.number().int().min(0).max(1000).optional(),
  locationCount: z.coerce.number().int().min(0).max(1000).optional(),
  employeeCount: z.coerce.number().int().min(0).max(1_000_000).optional(),
  hasOnlineBooking: z.boolean().optional(),
  status: z.enum(PROSPECT_STATUSES).optional(),
  notes: z.string().max(5000).optional().or(z.literal("")),
});
export type ProspectUpdate = z.infer<typeof prospectUpdateSchema>;

export const prospectEnqueueSchema = z
  .object({
    ids: z.array(z.string().cuid()).max(2000).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => (v.ids && v.ids.length > 0) || v.all, {
    message: "Provide prospect ids or set all=true",
  });
export type ProspectEnqueue = z.infer<typeof prospectEnqueueSchema>;

export const prospectImportSchema = z
  .object({
    ids: z.array(z.string().cuid()).max(2000).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => (v.ids && v.ids.length > 0) || v.all, {
    message: "Provide prospect ids or set all=true",
  });
export type ProspectImport = z.infer<typeof prospectImportSchema>;

export const prospectImportToCampaignSchema = z
  .object({
    ids: z.array(z.string().cuid()).max(2000).optional(),
    all: z.boolean().optional(),
    productId: z.string().cuid(),
    city: z.string().trim().min(1).max(120).optional(),
    campaignName: z.string().trim().min(1).max(160).optional(),
    templateId: refId.optional(),
    launch: z.boolean().optional(),
  })
  .refine((v) => (v.ids && v.ids.length > 0) || v.all, {
    message: "Provide prospect ids or set all=true",
  })
  .refine((v) => !v.launch || !!v.templateId, {
    message: "templateId is required to launch (send) a campaign",
  });
export type ProspectImportToCampaign = z.infer<typeof prospectImportToCampaignSchema>;

export const prospectSearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(PROSPECT_STATUSES).optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  hasWebsite: z.coerce.boolean().optional(),
  hasEmail: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ProspectSearch = z.infer<typeof prospectSearchSchema>;

export const contactSearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(CONTACT_STATUSES).optional(),
  productId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ContactSearch = z.infer<typeof contactSearchSchema>;

/* Campaign */
export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  productId: z.string().cuid(),
  targetMarket: optionalString,
  city: optionalString,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});
export type CampaignCreate = z.infer<typeof campaignCreateSchema>;
export const campaignUpdateSchema = campaignCreateSchema.partial();
export type CampaignUpdate = z.infer<typeof campaignUpdateSchema>;

/* Email Template */
export const templateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(20000),
  productId: z.string().cuid().optional().or(z.literal("")),
});
export type TemplateCreate = z.infer<typeof templateCreateSchema>;
export const templateUpdateSchema = templateCreateSchema.partial();
export type TemplateUpdate = z.infer<typeof templateUpdateSchema>;

export const templatePreviewSchema = z.object({
  templateId: refId,
  contactId: z.string().cuid(),
});
export type TemplatePreview = z.infer<typeof templatePreviewSchema>;

/* Outreach queue */
export const outreachCreateSchema = z.object({
  contactId: z.string().cuid(),
  campaignId: refId,
  templateId: refId,
  scheduledAt: z.coerce.date().optional(),
});
export type OutreachCreate = z.infer<typeof outreachCreateSchema>;

export const outreachBulkCreateSchema = z.object({
  contactIds: z.array(z.string().cuid()).min(1),
  campaignId: refId,
  templateId: refId,
  scheduledAt: z.coerce.date().optional(),
});
export type OutreachBulkCreate = z.infer<typeof outreachBulkCreateSchema>;

/* Follow-up */
export const followupCreateSchema = z.object({
  contactId: z.string().cuid(),
  dueDate: z.coerce.date(),
  note: z.string().max(1000).optional().or(z.literal("")),
});
export type FollowUpCreate = z.infer<typeof followupCreateSchema>;
export const followupUpdateSchema = z.object({
  completed: z.boolean().optional(),
  note: z.string().max(1000).optional(),
});
export type FollowUpUpdate = z.infer<typeof followupUpdateSchema>;

/* Auth */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/* Activity */
export const noteCreateSchema = z.object({
  note: z.string().min(1).max(5000),
});
export type NoteCreate = z.infer<typeof noteCreateSchema>;

/* Dashboard */
export const dashboardStatsSchema = z.object({
  totalContacts: z.number(),
  emailsSent: z.number(),
  replies: z.number(),
  meetingsBooked: z.number(),
  customers: z.number(),
  replyRate: z.number(),
  conversionRate: z.number(),
  followupsDueToday: z.number(),
  activeCampaigns: z.number(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

/* API helpers */
export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });
