import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { CONTACT_STATUSES, type ContactStatus } from "@founder-crm/types";
import { cn } from "@/lib/utils";

const COLUMN_LABELS: Record<ContactStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  INTERESTED: "Interested",
  MEETING_BOOKED: "Meeting",
  CUSTOMER: "Customer",
  LOST: "Lost",
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
        <div className="grid gap-4 lg:grid-cols-7">
          {CONTACT_STATUSES.map((s) => <Skeleton key={s} className="h-64" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-7">
          {CONTACT_STATUSES.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(status)}
              className={cn(
                "flex flex-col rounded-lg border bg-muted/30",
                dragId && "ring-2 ring-primary/40",
              )}
            >
              <div className="flex items-center justify-between border-b p-3">
                <span className="text-sm font-semibold">{COLUMN_LABELS[status]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <CardContent
                      className="cursor-pointer p-3"
                      onClick={() => navigate({ to: "/contacts/$id", params: { id: c.id } })}
                    >
                      <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.company ?? c.email}</p>
                      {c.product && <p className="mt-1 text-xs text-muted-foreground">{c.product.name}</p>}
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
