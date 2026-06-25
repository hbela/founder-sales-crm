import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ContactStatus,
  CampaignStatus,
  OutreachStatus,
  FollowUpStatus,
  ProspectStatus,
  ProspectSource,
} from "@founder-crm/types";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  empNumber?: number | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  status: ContactStatus;
  productId?: string | null;
  product?: Product | null;
  createdAt: string;
  updatedAt: string;
};

export type Prospect = {
  id: string;
  brandName: string;
  legalName?: string | null;
  website?: string | null;
  domain?: string | null;
  generalEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  googlePlaceId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  businessStatus?: string | null;
  dentistCount?: number | null;
  locationCount?: number | null;
  employeeCount?: number | null;
  hasOnlineBooking: boolean;
  fitScore?: number | null;
  status: ProspectStatus;
  source: ProspectSource;
  notes?: string | null;
  enrichedAt?: string | null;
  enrichQueuedAt?: string | null;
  enrichStartedAt?: string | null;
  enrichAttempts?: number;
  enrichError?: string | null;
  importedContactId?: string | null;
  importedContact?: Contact | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  contactId: string;
  type: string;
  description: string;
  metadata?: unknown;
  createdAt: string;
};

export type FollowUp = {
  id: string;
  contactId: string;
  dueDate: string;
  note?: string | null;
  status: FollowUpStatus;
  contact?: Contact;
};

export type Outreach = {
  id: string;
  contactId: string;
  campaignId: string;
  templateId: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: OutreachStatus;
  errorMessage?: string | null;
  contact?: Contact;
  campaign?: Campaign;
  template?: Template;
};

export type Campaign = {
  id: string;
  name: string;
  productId: string;
  targetMarket?: string | null;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: CampaignStatus;
  product?: Product;
  _count?: { outreach: number };
  createdAt: string;
  updatedAt: string;
};

export type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  productId?: string | null;
  product?: Product | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  totalContacts: number;
  emailsSent: number;
  replies: number;
  meetingsBooked: number;
  customers: number;
  replyRate: number;
  conversionRate: number;
  followupsDueToday: number;
  activeCampaigns: number;
  recentReplies: Contact[];
  pipeline: { status: ContactStatus; count: number }[];
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

/* ---------------------------- queries ---------------------------- */

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/api/products") });
}

export function useContacts(params: { q?: string; status?: ContactStatus; productId?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.productId) qs.set("productId", params.productId);
  qs.set("page", String(params.page ?? 1));
  return useQuery({
    queryKey: ["contacts", params.q, params.status, params.productId, params.page ?? 1],
    queryFn: () => api.get<Paginated<Contact>>(`/api/contacts?${qs.toString()}`),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      api.get<Contact & { activities: Activity[]; followups: FollowUp[]; outreach: Outreach[] }>(`/api/contacts/${id}`),
    enabled: !!id,
  });
}

export function useProspects(params: {
  q?: string;
  status?: ProspectStatus;
  district?: string;
  city?: string;
  hasWebsite?: boolean;
  hasEmail?: boolean;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.district) qs.set("district", params.district);
  if (params.city) qs.set("city", params.city);
  if (params.hasWebsite) qs.set("hasWebsite", "true");
  if (params.hasEmail) qs.set("hasEmail", "true");
  qs.set("page", String(params.page ?? 1));
  return useQuery({
    queryKey: ["prospects", params.q, params.status, params.district, params.city, params.hasWebsite, params.hasEmail, params.page ?? 1],
    queryFn: () => api.get<Paginated<Prospect>>(`/api/prospects?${qs.toString()}`),
    // Poll while any prospect is still in the enrichment queue.
    refetchInterval: (query) =>
      query.state.data?.items.some((p) => p.enrichQueuedAt) ? 4000 : false,
  });
}

export function useProspectCities() {
  return useQuery({ queryKey: ["prospect-cities"], queryFn: () => api.get<string[]>("/api/prospects/cities") });
}

export function useProspect(id: string) {
  return useQuery({
    queryKey: ["prospect", id],
    queryFn: () => api.get<Prospect>(`/api/prospects/${id}`),
    enabled: !!id,
  });
}

export function useCampaigns() {
  return useQuery({ queryKey: ["campaigns"], queryFn: () => api.get<Campaign[]>("/api/campaigns") });
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: () => api.get<Template[]>("/api/templates") });
}

export function useOutreach() {
  return useQuery({ queryKey: ["outreach"], queryFn: () => api.get<Outreach[]>("/api/outreach") });
}

export function useFollowups(due?: "today" | "overdue") {
  const qs = due ? `?due=${due}` : "";
  return useQuery({ queryKey: ["followups", due], queryFn: () => api.get<FollowUp[]>(`/api/followups${qs}`) });
}

export function useActivities(contactId?: string) {
  const qs = contactId ? `?contactId=${contactId}` : "";
  return useQuery({ queryKey: ["activities", contactId], queryFn: () => api.get<Activity[]>(`/api/activities${qs}&limit=50`) });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/api/dashboard") });
}

/* ---------------------------- mutations ---------------------------- */

export function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}
