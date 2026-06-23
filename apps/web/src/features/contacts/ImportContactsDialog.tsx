import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Fixed CSV template. firstName/lastName/email are required; the rest are optional. */
const TEMPLATE_COLUMNS = [
  "firstName",
  "lastName",
  "company",
  "email",
  "phone",
  "website",
  "industry",
  "country",
  "empNumber",
  "notes",
] as const;

type Row = Record<string, string>;

type ImportResult = {
  created: number;
  skipped: number;
  errors: { row: number; email?: string; message: string }[];
};

const PREVIEW_LIMIT = 10;

export function ImportContactsDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFileName("");
    setRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function downloadTemplate() {
    const csv = `${TEMPLATE_COLUMNS.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const missing = (["firstName", "lastName", "email"] as const).filter((c) => !headers.includes(c));
        if (missing.length) {
          setParseError(`Missing required column(s): ${missing.join(", ")}. Download the template below.`);
          setRows([]);
          return;
        }
        const cleaned = result.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
        if (!cleaned.length) {
          setParseError("No data rows found in the file.");
          setRows([]);
          return;
        }
        setRows(cleaned);
      },
      error: (err) => {
        setParseError(err.message);
        setRows([]);
      },
    });
  }

  async function onImport() {
    if (!rows.length) return;
    setLoading(true);
    try {
      const result = await api.post<ImportResult>("/api/contacts/import", { rows });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });

      if (result.created > 0) {
        const extra = result.skipped ? `, ${result.skipped} skipped` : "";
        toast.success(`Imported ${result.created} contact${result.created === 1 ? "" : "s"}${extra}`);
      } else {
        toast.warning(`No contacts imported (${result.skipped} skipped, ${result.errors.length} errors)`);
      }
      const first = result.errors[0];
      if (first) {
        toast.error(`${result.errors.length} row(s) had errors — e.g. row ${first.row}: ${first.message}`);
      }

      if (result.created > 0) {
        handleClose(false);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const previewCols = TEMPLATE_COLUMNS.filter((c) => rows.some((r) => String(r[c] ?? "").trim() !== ""));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV using the fixed template. Imported contacts are linked to Sunshine Dental with status NEW.
            Rows with an email that already exists are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Choose CSV
            </Button>
            <Button type="button" variant="ghost" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {rows.length} row{rows.length === 1 ? "" : "s"} parsed
                {rows.length > PREVIEW_LIMIT ? ` (showing first ${PREVIEW_LIMIT})` : ""}
              </p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewCols.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                      <TableRow key={i}>
                        {previewCols.map((c) => (
                          <TableCell key={c}>{r[c] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="button" onClick={onImport} disabled={loading || rows.length === 0}>
            <Upload className="h-4 w-4" /> {loading ? "Importing..." : `Import ${rows.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
