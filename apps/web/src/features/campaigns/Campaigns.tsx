import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CampaignStatusBadge } from "@/components/StatusBadge";
import { useCampaigns, useProducts, type Campaign } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@founder-crm/types";
import { formatDate } from "@/lib/utils";

const EMPTY = { name: "", productId: "", targetMarket: "", startDate: "", endDate: "", status: "DRAFT" as CampaignStatus };

export function Campaigns() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: products } = useProducts();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      name: c.name,
      productId: c.productId,
      targetMarket: c.targetMarket ?? "",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
      status: c.status,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        productId: form.productId,
        targetMarket: form.targetMarket || undefined,
        startDate: form.startDate ? new Date(form.startDate) : undefined,
        endDate: form.endDate ? new Date(form.endDate) : undefined,
        status: form.status,
      };
      if (editing) {
        await api.patch(`/api/campaigns/${editing.id}`, payload);
        toast.success("Campaign updated");
      } else {
        await api.post("/api/campaigns", payload);
        toast.success("Campaign created");
      }
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(c: Campaign) {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await api.del(`/api/campaigns/${c.id}`);
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Organize outreach by product and target market"
        action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Campaign</Button>}
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Emails</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6" /></TableCell></TableRow>)
            ) : campaigns && campaigns.length > 0 ? (
              campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">Created {formatDate(c.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    {c.product?.name ? (
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {c.product.name}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.targetMarket ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.startDate ? formatDate(c.startDate) : "—"}{c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                  </TableCell>
                  <TableCell>{c._count?.outreach ?? 0}</TableCell>
                  <TableCell><CampaignStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No campaigns yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit campaign" : "New campaign"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Name *</Label>
              <Input id="cname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tm">Target market</Label>
              <Input id="tm" value={form.targetMarket} onChange={(e) => setForm((f) => ({ ...f, targetMarket: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sd">Start date</Label>
                <Input id="sd" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed">End date</Label>
                <Input id="ed" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
