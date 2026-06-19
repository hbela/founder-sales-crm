import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FollowupStatusBadge } from "@/components/StatusBadge";
import { useFollowups, useContacts } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function Followups() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"today" | "overdue" | "all">("today");
  const { data: followups, isLoading } = useFollowups(tab === "all" ? undefined : tab);
  const { data: contactsData } = useContacts({ page: 1 });

  const [contactId, setContactId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !dueDate) {
      toast.error("Select a contact and due date");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/followups", { contactId, dueDate: new Date(dueDate), note: note || undefined });
      void qc.invalidateQueries({ queryKey: ["followups"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setContactId(""); setDueDate(""); setNote("");
      toast.success("Follow-up scheduled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function complete(id: string) {
    try {
      await api.patch(`/api/followups/${id}`, { completed: true });
      void qc.invalidateQueries({ queryKey: ["followups"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/api/followups/${id}`);
      void qc.invalidateQueries({ queryKey: ["followups"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader title="Follow-ups" description="Never miss a follow-up" />

      <Card className="mb-4">
        <CardContent className="p-4">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contactsData?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading}>Add</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="today">Due today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : followups && followups.length > 0 ? (
            <ul className="space-y-2">
              {followups.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <button
                      className="font-medium hover:underline"
                      onClick={() => navigate({ to: "/contacts/$id", params: { id: f.contactId } })}
                    >
                      {f.contact ? `${f.contact.firstName} ${f.contact.lastName}` : "Contact"}
                    </button>
                    {f.contact?.company && <span className="text-muted-foreground"> · {f.contact.company}</span>}
                    <p className="text-sm text-muted-foreground">Due {formatDate(f.dueDate)}{f.note ? ` — ${f.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FollowupStatusBadge status={f.status} />
                    {f.status === "PENDING" && (
                      <Button size="icon" variant="outline" onClick={() => complete(f.id)}><Check className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No follow-ups here. You're all caught up.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
