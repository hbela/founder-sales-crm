import { useState } from "react";
import { toast } from "sonner";
import { Radar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscovered?: (city: string) => void;
}

const BUDAPEST_DISTRICTS = ["I", "II", "III", "V", "VI", "VII", "VIII", "IX", "XI", "XII", "XIII", "XIV"];

type DiscoverResult = { discovered: number; created: number; skipped: number; simulated: boolean };

export function DiscoverDialog({ open, onOpenChange, onDiscovered }: Props) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("fogorvos");
  const [city, setCity] = useState("Budapest");
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isBudapest = /budapest/i.test(city.trim());

  function toggleDistrict(d: string) {
    setDistricts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function onDiscover() {
    setLoading(true);
    try {
      const result = await api.post<DiscoverResult>("/api/prospects/discover", {
        query: query.trim() || undefined,
        city: city.trim() || undefined,
        districts: isBudapest && districts.length ? districts : undefined,
      });
      const town = city.trim() || "Budapest";
      void qc.invalidateQueries({ queryKey: ["prospects"] });
      void qc.invalidateQueries({ queryKey: ["prospect-cities"] });
      const note = result.simulated ? " (simulated — set GOOGLE_PLACES_API_KEY for live data)" : "";
      toast.success(`Discovered ${result.discovered}: ${result.created} new, ${result.skipped} existing${note}`);
      onDiscovered?.(town);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Discover clinics</DialogTitle>
          <DialogDescription>
            Search Google Places for dental clinics. Without a configured API key, results are simulated for testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="query">Search term</Label>
              <Input id="query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="fogorvos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City / town</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Budapest" />
            </div>
          </div>
          {isBudapest && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Districts (optional)</Label>
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => setDistricts((prev) => (prev.length === BUDAPEST_DISTRICTS.length ? [] : [...BUDAPEST_DISTRICTS]))}
                >
                  {districts.length === BUDAPEST_DISTRICTS.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {BUDAPEST_DISTRICTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDistrict(d)}
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                      districts.includes(d) ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {districts.length ? `${districts.length} district query(ies)` : "One general Budapest query"}
              </p>
            </div>
          )}
          {!isBudapest && (
            <p className="text-xs text-muted-foreground">
              Searching “{query.trim() || "fogorvos"} {city.trim()}”. District filters apply to Budapest only.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onDiscover} disabled={loading}>
            <Radar className="h-4 w-4" /> {loading ? "Discovering..." : "Discover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
