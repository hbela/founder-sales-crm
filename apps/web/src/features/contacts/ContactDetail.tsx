import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Send, Mail, RefreshCw, CalendarCheck, MessageSquare, UserPlus, StickyNote, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactStatusBadge, FollowupStatusBadge, OutreachStatusBadge } from "@/components/StatusBadge";
import { ContactForm } from "./ContactForm";
import { useContact, useCampaigns, useTemplates } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { CONTACT_STATUSES, type ContactStatus } from "@founder-crm/types";
import { formatDateTime, formatDate, getInitials } from "@/lib/utils";

function activityIcon(type: string): React.ElementType {
  const t = type.toLowerCase();
  if (t.includes("email") || t.includes("sent")) return Mail;
  if (t.includes("outreach") || t.includes("linkedin") || t.includes("reply")) return MessageSquare;
  if (t.includes("status")) return RefreshCw;
  if (t.includes("meeting")) return CalendarCheck;
  if (t.includes("note")) return StickyNote;
  if (t.includes("created") || t.includes("contact")) return UserPlus;
  return Activity;
}

export function ContactDetail() {
  const id = useParams({ strict: false }).id ?? "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: contact, isLoading } = useContact(id);
  const { data: campaigns } = useCampaigns();
  const { data: templates } = useTemplates();

  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState("");
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [followupNote, setFollowupNote] = useState("");

  async function changeStatus(status: ContactStatus) {
    try {
      await api.patch(`/api/contacts/${id}`, { status });
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Status changed to ${status}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    try {
      await api.post(`/api/contacts/${id}/notes`, { note });
      setNote("");
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      toast.success("Note added");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function addFollowup() {
    if (!followupDate) return;
    try {
      await api.post("/api/followups", { contactId: id, dueDate: new Date(followupDate), note: followupNote });
      setFollowupDate("");
      setFollowupNote("");
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      void qc.invalidateQueries({ queryKey: ["followups"] });
      toast.success("Follow-up scheduled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function completeFollowup(fid: string) {
    try {
      await api.patch(`/api/followups/${fid}`, { completed: true });
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      void qc.invalidateQueries({ queryKey: ["followups"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function scheduleOutreach(sendNow: boolean) {
    if (!campaignId || !templateId) {
      toast.error("Select a campaign and template");
      return;
    }
    try {
      const when = sendNow ? new Date() : scheduledAt ? new Date(scheduledAt) : new Date();
      const item = await api.post<{ id: string }>("/api/outreach", { contactId: id, campaignId, templateId, scheduledAt: when });
      if (sendNow) {
        await api.post(`/api/outreach/${item.id}/send`);
        toast.success("Email sent");
      } else {
        toast.success("Email scheduled");
      }
      setOutreachOpen(false);
      setCampaignId("");
      setTemplateId("");
      setScheduledAt("");
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      void qc.invalidateQueries({ queryKey: ["outreach"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  if (isLoading || !contact) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/contacts" })} className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/contacts" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {getInitials(contact.firstName, contact.lastName)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{contact.firstName} {contact.lastName}</h1>
            <p className="text-sm text-muted-foreground">{contact.company ?? contact.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={contact.status} onValueChange={(v) => changeStatus(v as ContactStatus)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button onClick={() => setOutreachOpen(true)}><Send className="h-4 w-4" /> Compose</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail label="Status"><ContactStatusBadge status={contact.status} /></Detail>
            <Detail label="Email"><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></Detail>
            <Detail label="Phone">{contact.phone ?? "—"}</Detail>
            <Detail label="Website">{contact.website ? <a href={contact.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{contact.website}</a> : "—"}</Detail>
            <Detail label="Industry">{contact.industry ?? "—"}</Detail>
            <Detail label="Country">{contact.country ?? "—"}</Detail>
            <Detail label="Product">{contact.product?.name ?? "—"}</Detail>
            {contact.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups ({contact.followups.length})</TabsTrigger>
              <TabsTrigger value="outreach">Outreach ({contact.outreach.length})</TabsTrigger>
              <TabsTrigger value="note">Add note</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardContent className="p-4">
                  {contact.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ol className="space-y-5">
                      {contact.activities.map((a) => {
                        const Icon = activityIcon(a.type);
                        return (
                          <li key={a.id} className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold capitalize">{a.type.replace(/_/g, " ").toLowerCase()}</p>
                                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{a.description}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="followups">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Input type="date" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} />
                    <Input placeholder="Note (optional)" value={followupNote} onChange={(e) => setFollowupNote(e.target.value)} />
                    <Button onClick={addFollowup}><Plus className="h-4 w-4" /> Add</Button>
                  </div>
                  <Separator />
                  {contact.followups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
                  ) : (
                    <ul className="space-y-2">
                      {contact.followups.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">Due {formatDate(f.dueDate)}</p>
                            {f.note && <p className="text-sm text-muted-foreground">{f.note}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <FollowupStatusBadge status={f.status} />
                            {f.status === "PENDING" && (
                              <Button size="sm" variant="outline" onClick={() => completeFollowup(f.id)}>Complete</Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outreach">
              <Card>
                <CardContent className="p-4">
                  {contact.outreach.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outreach yet. Click "Compose" to send an email.</p>
                  ) : (
                    <ul className="space-y-2">
                      {contact.outreach.map((o) => (
                        <li key={o.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">{o.template?.name ?? "Template"}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.campaign?.name ?? "Campaign"} · {o.sentAt ? `Sent ${formatDateTime(o.sentAt)}` : `Scheduled ${formatDateTime(o.scheduledAt)}`}
                            </p>
                            {o.errorMessage && <p className="text-xs text-destructive">{o.errorMessage}</p>}
                          </div>
                          <OutreachStatusBadge status={o.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="note">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <Textarea rows={4} placeholder="Add a note about this contact..." value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button onClick={addNote} disabled={!note.trim()}>Save note</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ContactForm open={editOpen} onOpenChange={setEditOpen} contact={contact} />

      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Compose outreach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                <SelectContent>
                  {campaigns?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule for (optional)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Leave empty to send now.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => scheduleOutreach(false)}>Schedule</Button>
            <Button onClick={() => scheduleOutreach(true)}><Send className="h-4 w-4" /> Send now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 break-words">{children}</div>
    </div>
  );
}
