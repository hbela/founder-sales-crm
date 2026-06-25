import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radar, Search, Sparkles, CheckCircle2, Import, Loader2, AlertTriangle, Layers, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProspectStatusBadge } from "@/components/StatusBadge";
import { DiscoverDialog } from "./DiscoverDialog";
import { ImportCampaignDialog } from "./ImportCampaignDialog";
import { useProspects, useProspectCities, type Prospect } from "@/lib/hooks";
import { PROSPECT_STATUSES, type ProspectStatus } from "@founder-crm/types";
import { api, ApiError } from "@/lib/api";

export function ProspectingList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProspectStatus | "ALL">("ALL");
  const [city, setCity] = useState<string>("ALL");
  const [hasEmail, setHasEmail] = useState(false);
  const [page, setPage] = useState(1);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: cities } = useProspectCities();
  const { data, isLoading } = useProspects({
    q: q || undefined,
    status: status === "ALL" ? undefined : status,
    city: city === "ALL" ? undefined : city,
    hasEmail: hasEmail || undefined,
    page,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["prospects"] });
  }

  async function queueAll() {
    setQueuing(true);
    try {
      const res = await api.post<{ queued: number }>("/api/prospects/enrich-queue", { all: true });
      if (res.queued > 0) toast.success(`Queued ${res.queued} prospect(s) for background enrichment`);
      else toast.info("No eligible prospects to enrich (need a website, not yet imported)");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to queue enrichment");
    } finally {
      setQueuing(false);
    }
  }

  async function importAll() {
    setImporting(true);
    try {
      const res = await api.post<{ imported: number; skipped: number; eligible: number }>(
        "/api/prospects/import-to-crm",
        { all: true },
      );
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} prospect(s) to CRM${res.skipped ? `, ${res.skipped} skipped` : ""}`);
        void qc.invalidateQueries({ queryKey: ["contacts"] });
      } else if (res.eligible === 0) {
        toast.info("No prospects with an email to import (enrich first to find emails)");
      } else {
        toast.info(`Nothing imported — ${res.skipped} already exist as contacts`);
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk import failed");
    } finally {
      setImporting(false);
    }
  }

  async function action(p: Prospect, kind: "enrich" | "qualify" | "import") {
    setBusyId(p.id);
    try {
      if (kind === "enrich") {
        await api.post(`/api/prospects/${p.id}/enrich`, {});
        toast.success(`Enriched ${p.brandName}`);
      } else if (kind === "qualify") {
        await api.patch(`/api/prospects/${p.id}`, { status: "QUALIFIED" });
        toast.success(`Qualified ${p.brandName}`);
      } else {
        await api.post(`/api/prospects/${p.id}/import-to-crm`, {});
        toast.success(`${p.brandName} imported to CRM`);
        void qc.invalidateQueries({ queryKey: ["contacts"] });
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Prospecting"
        description="Discover, enrich and qualify dental clinics, then export to your CRM"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={queueAll} disabled={queuing}>
              <Layers className="h-4 w-4" /> {queuing ? "Queuing..." : "Enrich all"}
            </Button>
            <Button variant="outline" onClick={importAll} disabled={importing}>
              <Import className="h-4 w-4" /> {importing ? "Importing..." : "Import to CRM"}
            </Button>
            <Button variant="outline" onClick={() => setCampaignOpen(true)}>
              <Megaphone className="h-4 w-4" /> Start campaign
            </Button>
            <Button onClick={() => setDiscoverOpen(true)}><Radar className="h-4 w-4" /> Discover</Button>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by clinic, email or address..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={city} onValueChange={(v) => { setCity(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Town" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All towns</SelectItem>
              {cities?.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as ProspectStatus | "ALL"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {PROSPECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={hasEmail ? "default" : "outline"}
            onClick={() => { setHasEmail((v) => !v); setPage(1); }}
          >
            Has email
          </Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinic</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Enrichment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-64" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><Skeleton className="h-6" /></TableCell>
                </TableRow>
              ))
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate({ to: "/prospecting/$id", params: { id: p.id } })}>
                  <TableCell className="font-medium">
                    {p.brandName}
                    {p.website && <div className="text-xs text-muted-foreground">{p.domain ?? p.website}</div>}
                  </TableCell>
                  <TableCell>{p.district ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.generalEmail ?? "—"}</TableCell>
                  <TableCell><StaffCell p={p} /></TableCell>
                  <TableCell>{p.fitScore ?? "—"}</TableCell>
                  <TableCell><EnrichIndicator p={p} /></TableCell>
                  <TableCell><ProspectStatusBadge status={p.status} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === p.id || !p.website} onClick={() => action(p, "enrich")} title="Enrich from website">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busyId === p.id || p.status === "QUALIFIED"} onClick={() => action(p, "qualify")} title="Mark qualified">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busyId === p.id || p.status === "IMPORTED" || !p.generalEmail} onClick={() => action(p, "import")} title="Import to CRM">
                        <Import className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No prospects yet. <button className="text-primary underline" onClick={() => setDiscoverOpen(true)}>Discover clinics</button>.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <DiscoverDialog
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
        onDiscovered={(town) => { setCity(town); setPage(1); }}
      />
      <ImportCampaignDialog open={campaignOpen} onOpenChange={setCampaignOpen} />
    </div>
  );
}

function StaffCell({ p }: { p: Prospect }) {
  if (p.dentistCount == null && p.employeeCount == null) return <>—</>;
  return (
    <div className="text-sm">
      {p.dentistCount != null && <div>{p.dentistCount} dentists</div>}
      {p.employeeCount != null && (
        <div className="text-xs text-muted-foreground">{p.employeeCount} staff</div>
      )}
    </div>
  );
}

function EnrichIndicator({ p }: { p: Prospect }) {
  if (p.enrichQueuedAt) {
    return p.enrichStartedAt ? (
      <span className="flex items-center gap-1 text-sm text-amber-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching
      </span>
    ) : (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5" /> Queued
      </span>
    );
  }
  if (p.enrichError) {
    return (
      <span className="flex items-center gap-1 text-sm text-destructive" title={p.enrichError}>
        <AlertTriangle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  }
  if (p.enrichedAt) {
    return <span className="text-sm text-muted-foreground">Enriched</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}
