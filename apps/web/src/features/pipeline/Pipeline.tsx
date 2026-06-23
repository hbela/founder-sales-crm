import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { CONTACT_STATUSES, type ContactStatus } from "@founder-crm/types";
import { cn, getInitials } from "@/lib/utils";

const COLUMN_LABELS: Record<ContactStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  INTERESTED: "Interested",
  MEETING_BOOKED: "Meeting",
  CUSTOMER: "Customer",
  LOST: "Lost",
};

const COLUMN_DOT: Record<ContactStatus, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-blue-500",
  REPLIED: "bg-amber-500",
  INTERESTED: "bg-green-500",
  MEETING_BOOKED: "bg-indigo-500",
  CUSTOMER: "bg-emerald-500",
  LOST: "bg-red-500",
};

export function Pipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useContacts({ page: 1 });
  const [dragId, setDragId] = useState<string | null>(null);

  const contacts = data?.items ?? [];
  const grouped = CONTACT_STATUSES.reduce(
    (acc, status) => {
      acc[status] = contacts.filter((c) => c.status === status);
      return acc;
    },
    {} as Record<ContactStatus, typeof contacts>,
  );

  async function onDrop(status: ContactStatus) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    try {
      await api.patch(`/api/contacts/${id}`, { status });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Moved to ${COLUMN_LABELS[status]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader title="Sales Pipeline" description="Drag contacts between stages" />

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {CONTACT_STATUSES.map((s) => <Skeleton key={s} className="h-64 w-72 shrink-0" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {CONTACT_STATUSES.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(status)}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40",
                dragId && "ring-2 ring-primary/40",
              )}
            >
              <div className="flex items-center justify-between border-b p-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", COLUMN_DOT[status])} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {COLUMN_LABELS[status]}
                  </span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {grouped[status]?.length ?? 0}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {grouped[status]?.map((c) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => setDragId(null)}
                    className="cursor-grab transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing"
                  >
                    <CardContent
                      className="cursor-pointer p-3"
                      onClick={() => navigate({ to: "/contacts/$id", params: { id: c.id } })}
                    >
                      {c.product && (
                        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-primary">
                          {c.product.name}
                        </span>
                      )}
                      <p className={cn("text-sm font-semibold", c.product && "mt-2")}>{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.company ?? c.email}</p>
                      <div className="mt-3 flex items-center justify-between border-t pt-2">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {getInitials(c.firstName, c.lastName)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {grouped[status]?.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
