import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, AlertTriangle, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { useProducts, useTemplates } from "@/lib/hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportResult = {
  imported: number;
  skipped: number;
  eligible: number;
  enrolled: number;
  campaignId: string | null;
  campaignName?: string;
  city?: string | null;
};

type Preview = {
  campaignName: string;
  city: string | null;
  productName: string;
  count: number;
  recipients: { brandName: string; email: string }[];
  skipped: { brandName: string; reason: string }[];
};

const NO_TEMPLATE = "none";

export function ImportCampaignDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const { data: templates } = useTemplates();

  const [productId, setProductId] = useState("");
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE);
  const [campaignName, setCampaignName] = useState("");
  const [city, setCity] = useState("");
  const [launch, setLaunch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [preview, setPreview] = useState<Preview | null>(null);

  // Reset the wizard whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) { setStep("form"); setPreview(null); }
  }, [open]);

  // Default to the Sunshine Dental product (or the first available) once products load.
  useEffect(() => {
    if (!productId && products?.length) {
      const sunshine = products.find((p) => p.slug === "sunshine-dental");
      setProductId(sunshine?.id ?? products[0]?.id ?? "");
    }
  }, [products, productId]);

  const productTemplates = templates?.filter((t) => !t.productId || t.productId === productId) ?? [];
  const templateName = templates?.find((t) => t.id === templateId)?.name;

  function requestBody(extra: Record<string, unknown> = {}) {
    return {
      all: true,
      productId,
      campaignName: campaignName.trim() || undefined,
      city: city.trim() || undefined,
      ...extra,
    };
  }

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["prospects"] });
    void qc.invalidateQueries({ queryKey: ["contacts"] });
    void qc.invalidateQueries({ queryKey: ["campaigns"] });
    void qc.invalidateQueries({ queryKey: ["outreach"] });
  }

  // Step 1 → either save a draft directly, or fetch a preview before launching.
  async function onPrimary() {
    if (!productId) { toast.error("Select a product first"); return; }
    if (launch && templateId === NO_TEMPLATE) {
      toast.error("Choose an email template to launch (send) the campaign");
      return;
    }
    setLoading(true);
    try {
      if (!launch) {
        const res = await api.post<ImportResult>("/api/prospects/import-to-campaign", requestBody({ launch: false }));
        if (res.eligible === 0) { toast.info("No prospects with an email to import (enrich first to find emails)"); return; }
        const where = res.campaignName ? ` → "${res.campaignName}"` : "";
        const skip = res.skipped ? ` ${res.skipped} skipped.` : "";
        toast.success(`Imported ${res.imported}${where}. Saved as draft (no emails sent).${skip}`);
        invalidate();
        onOpenChange(false);
        return;
      }
      // Launching: show the confirmation with the exact recipient list.
      const p = await api.post<Preview>("/api/prospects/import-to-campaign/preview", requestBody());
      setPreview(p);
      setStep("confirm");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 → actually send.
  async function onConfirmLaunch() {
    setLoading(true);
    try {
      const res = await api.post<ImportResult>("/api/prospects/import-to-campaign", requestBody({ templateId, launch: true }));
      const where = res.campaignName ? ` → "${res.campaignName}"` : "";
      const skip = res.skipped ? ` ${res.skipped} skipped (already a contact).` : "";
      toast.success(`Launched ${res.enrolled} email(s)${where}.${skip}`);
      invalidate();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Launch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Import &amp; start campaign</DialogTitle>
              <DialogDescription>
                Bulk-imports every prospect with an email that isn&apos;t already a contact, creates a campaign scoped to the
                product and town, and (optionally) launches it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email template {launch && <span className="text-destructive">*</span>}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE}>No template (draft only)</SelectItem>
                    {productTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Town / city</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Auto from prospects" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input id="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Auto: Product — City Mon Year" />
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-md border border-input p-3 text-sm">
                <input type="checkbox" checked={launch} onChange={(e) => setLaunch(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span>
                  <span className="font-medium">Launch now</span>
                  <span className="block text-xs text-muted-foreground">
                    Marks the campaign ACTIVE and sends the template to every imported contact. You&apos;ll review the recipient
                    list before anything is sent. Leave off to save as a draft.
                  </span>
                </span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={onPrimary} disabled={loading || !productId}>
                <Megaphone className="h-4 w-4" /> {loading ? "Working..." : launch ? "Review recipients" : "Import & save draft"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm launch</DialogTitle>
              <DialogDescription>Review who will receive this email before sending.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Campaign</span><span className="font-medium">{preview?.campaignName}</span>
                <span className="text-muted-foreground">Town</span><span>{preview?.city ?? "—"}</span>
                <span className="text-muted-foreground">Product</span><span>{preview?.productName}</span>
                <span className="text-muted-foreground">Template</span><span>{templateName}</span>
              </div>

              <div>
                <div className="mb-1 font-medium">
                  Will send to {preview?.count ?? 0} recipient{preview?.count === 1 ? "" : "s"}
                </div>
                {preview && preview.count > 0 ? (
                  <ul className="max-h-48 overflow-auto rounded-md border border-input divide-y text-sm">
                    {preview.recipients.map((r) => (
                      <li key={r.email} className="flex justify-between gap-3 px-3 py-1.5">
                        <span className="truncate text-muted-foreground">{r.brandName}</span>
                        <span className="shrink-0">{r.email}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-input px-3 py-2 text-muted-foreground">
                    No eligible recipients — nothing will be sent.
                  </p>
                )}
              </div>

              {preview && preview.skipped.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.skipped.length} prospect(s) skipped (already a contact or on the suppression list).
                </p>
              )}

              <p className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Real emails are sent on the next send cycle (~1 minute) and can&apos;t be unsent.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")} disabled={loading}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={onConfirmLaunch} disabled={loading || !preview || preview.count === 0}>
                <Megaphone className="h-4 w-4" /> {loading ? "Sending..." : `Confirm & send ${preview?.count ?? 0}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
