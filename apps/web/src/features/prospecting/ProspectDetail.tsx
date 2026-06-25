import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, CheckCircle2, Import, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ProspectStatusBadge } from "@/components/StatusBadge";
import { useProspect } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";

export function ProspectDetail() {
  const id = useParams({ strict: false }).id ?? "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p, isLoading } = useProspect(id);

  const [override, setOverride] = useState<{ generalEmail: string; employeeCount: string; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const form = override ?? {
    generalEmail: p?.generalEmail ?? "",
    employeeCount: p?.employeeCount?.toString() ?? "",
    notes: p?.notes ?? "",
  };

  function set<K extends keyof typeof form>(key: K, value: string) {
    setOverride({ ...form, [key]: value });
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["prospect", id] });
    void qc.invalidateQueries({ queryKey: ["prospects"] });
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setOverride(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !p) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/prospecting" })}>
        <ArrowLeft className="h-4 w-4" /> Back to prospecting
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.brandName}</h1>
          <p className="text-sm text-muted-foreground">{p.address ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProspectStatusBadge status={p.status} />
          {p.fitScore != null && <span className="text-sm text-muted-foreground">Fit score {p.fitScore}/100</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !p.website} onClick={() => run(() => api.post(`/api/prospects/${id}/enrich`, {}), "Enriched from website")}>
          <Sparkles className="h-4 w-4" /> Enrich
        </Button>
        <Button variant="outline" disabled={busy || p.status === "QUALIFIED"} onClick={() => run(() => api.patch(`/api/prospects/${id}`, { status: "QUALIFIED" }), "Marked qualified")}>
          <CheckCircle2 className="h-4 w-4" /> Qualify
        </Button>
        <Button disabled={busy || p.status === "IMPORTED" || !p.generalEmail} onClick={() => run(async () => { await api.post(`/api/prospects/${id}/import-to-crm`, {}); void qc.invalidateQueries({ queryKey: ["contacts"] }); }, "Imported to CRM")}>
          <Import className="h-4 w-4" /> Import to CRM
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Google Places</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="District" value={p.district} />
            <Field label="Phone" value={p.phone} />
            <Field label="Website" value={p.website} />
            <Field label="Rating" value={p.rating != null ? `${p.rating} (${p.reviewCount ?? 0} reviews)` : null} />
            <Field label="Business status" value={p.businessStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Website-derived</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Field label="Legal name" value={p.legalName} />
            <Field label="Dentists" value={p.dentistCount?.toString()} />
            <Field label="Locations" value={p.locationCount?.toString()} />
            <Field label="Online booking" value={p.hasOnlineBooking ? "Yes" : "No"} />
            <Field label="Enriched" value={p.enrichedAt ? new Date(p.enrichedAt).toLocaleString() : "Not yet"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Manual overrides</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="generalEmail">General email</Label>
              <Input id="generalEmail" value={form.generalEmail} onChange={(e) => set("generalEmail", e.target.value)} placeholder="info@clinic.hu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Employees</Label>
              <Input id="employeeCount" type="number" min={0} value={form.employeeCount} onChange={(e) => set("employeeCount", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <Button
            disabled={busy || override === null}
            onClick={() => run(() => api.patch(`/api/prospects/${id}`, {
              generalEmail: form.generalEmail || "",
              employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
              notes: form.notes || "",
            }), "Saved")}
          >
            <Save className="h-4 w-4" /> Save overrides
          </Button>
        </CardContent>
      </Card>

      {p.importedContact && (
        <p className="text-sm text-muted-foreground">
          Imported as contact{" "}
          <button className="text-primary underline" onClick={() => navigate({ to: "/contacts/$id", params: { id: p.importedContact!.id } })}>
            {p.importedContact.firstName} {p.importedContact.lastName}
          </button>.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </div>
  );
}
