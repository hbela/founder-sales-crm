import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Send, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OutreachStatusBadge } from "@/components/StatusBadge";
import { useOutreach, useContacts, useCampaigns, useTemplates } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { OUTREACH_STATUSES, type OutreachStatus } from "@founder-crm/types";
import { formatDateTime, getInitials } from "@/lib/utils";

export function Outreach() {
  const { data: items, isLoading } = useOutreach();
  const { data: contactsData } = useContacts({ page: 1 });
  const { data: campaigns } = useCampaigns();
  const { data: templates } = useTemplates();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<OutreachStatus | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = filter === "ALL" ? items : items?.filter((o) => o.status === filter);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !campaignId || !templateId) {
      toast.error("Select contact, campaign and template");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/outreach", {
        contactId,
        campaignId,
        templateId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      });
      void qc.invalidateQueries({ queryKey: ["outreach"] });
      toast.success("Added to queue");
      setOpen(false);
      setContactId(""); setCampaignId(""); setTemplateId(""); setScheduledAt("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendNow(id: string) {
    try {
      await api.post(`/api/outreach/${id}/send`);
      void qc.invalidateQueries({ queryKey: ["outreach"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Email sent");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function cancel(id: string) {
    try {
      await api.del(`/api/outreach/${id}`);
      void qc.invalidateQueries({ queryKey: ["outreach"] });
      toast.success("Cancelled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Outreach Queue"
        description="Review and send scheduled emails safely"
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Queue Email</Button>}
      />

      <Card className="mb-4 p-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as OutreachStatus | "ALL")}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {OUTREACH_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6" /></TableCell></TableRow>)
            ) : filtered && filtered.length > 0 ? (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <button className="flex items-center gap-3 text-left" onClick={() => navigate({ to: "/contacts/$id", params: { id: o.contactId } })}>
                      {o.contact && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(o.contact.firstName, o.contact.lastName)}
                        </span>
                      )}
                      <span className="font-medium hover:underline">
                        {o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : o.contactId}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.campaign?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{o.template?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(o.scheduledAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{o.sentAt ? formatDateTime(o.sentAt) : "—"}</TableCell>
                  <TableCell><OutreachStatusBadge status={o.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(o.status === "PENDING" || o.status === "FAILED") && (
                        <Button variant="outline" size="sm" onClick={() => sendNow(o.id)}><Send className="h-4 w-4" /></Button>
                      )}
                      {o.status === "PENDING" && (
                        <Button variant="ghost" size="icon" onClick={() => cancel(o.id)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Queue is empty.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Queue an email</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contactsData?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              <Label htmlFor="sched">Schedule for (optional)</Label>
              <Input id="sched" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add to queue"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
