import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, type Contact } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { CONTACT_STATUSES, type ContactStatus } from "@founder-crm/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSaved?: () => void;
}

const EMPTY = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  country: "",
  notes: "",
  status: "NEW" as ContactStatus,
  productId: "",
};

export function ContactForm({ open, onOpenChange, contact, onSaved }: Props) {
  const { data: products } = useProducts();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company ?? "",
        email: contact.email,
        phone: contact.phone ?? "",
        website: contact.website ?? "",
        industry: contact.industry ?? "",
        country: contact.country ?? "",
        notes: contact.notes ?? "",
        status: contact.status,
        productId: contact.productId ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [contact, open]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, productId: form.productId || undefined };
      if (contact) {
        await api.patch(`/api/contacts/${contact.id}`, payload);
        toast.success("Contact updated");
      } else {
        await api.post("/api/contacts", payload);
        toast.success("Contact created");
      }
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save contact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>{contact ? "Update contact details" : "Add a new prospect to your CRM"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" placeholder="e.g. Sarah" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" placeholder="e.g. Jenkins" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Global Tech Corp" value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="sarah@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://example.com" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="e.g. SaaS" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="e.g. United States" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as typeof form.status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={(v) => set("productId", v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Add any specific context or previous conversation summaries..." value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}><Save className="h-4 w-4" /> {loading ? "Saving..." : "Save contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
