import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTemplates, useProducts, useContacts, type Template } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { TEMPLATE_VARIABLES } from "@founder-crm/types";

const EMPTY = { name: "", subject: "", body: "", productId: "" };

export function Templates() {
  const { data: templates, isLoading } = useTemplates();
  const { data: products } = useProducts();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<Template | null>(null);
  const [previewContact, setPreviewContact] = useState("");
  const [preview, setPreview] = useState<{ subject: string; body: string; html: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: contactsData } = useContacts({ page: 1 });

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, productId: t.productId ?? "" });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, productId: form.productId || undefined };
      if (editing) {
        await api.patch(`/api/templates/${editing.id}`, payload);
        toast.success("Template updated");
      } else {
        await api.post("/api/templates", payload);
        toast.success("Template created");
      }
      void qc.invalidateQueries({ queryKey: ["templates"] });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete ${t.name}?`)) return;
    try {
      await api.del(`/api/templates/${t.id}`);
      void qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function runPreview() {
    if (!previewTpl || !previewContact) return;
    setPreviewing(true);
    try {
      const res = await api.post<{ subject: string; body: string; html: string }>("/api/templates/preview", {
        templateId: previewTpl.id,
        contactId: previewContact,
      });
      setPreview(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setPreviewing(false);
    }
  }

  function openPreview(t: Template) {
    setPreviewTpl(t);
    setPreviewContact("");
    setPreview(null);
    setPreviewOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Email Templates"
        description="Reusable outreach templates with variables"
        action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Template</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TEMPLATE_VARIABLES.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.subject}</p>
                  </div>
                  {t.product && <Badge variant="outline">{t.product.name}</Badge>}
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{t.body}</p>
                <div className="mt-3 flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openPreview(t)}><Eye className="h-4 w-4" /> Preview</Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No templates yet.</CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tname">Name *</Label>
              <Input id="tname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tsubject">Subject *</Label>
              <Input id="tsubject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tbody">Body *</Label>
              <Textarea id="tbody" rows={8} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Preview: {previewTpl?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview with contact</Label>
              <Select value={previewContact} onValueChange={setPreviewContact}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contactsData?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runPreview} disabled={!previewContact || previewing}>
              {previewing ? "Rendering..." : "Render preview"}
            </Button>
            {preview && (
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="font-medium">{preview.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rendered email</p>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={preview.html}
                    className="mt-1 h-[420px] w-full rounded-md border bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
