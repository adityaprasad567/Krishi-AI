import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocationStore, type LocationData } from "@/stores/location-store";
import { locationService } from "@/services/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LocationPicker({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { current, setCurrent, recents, favorites, addFavorite } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);

  const handleAuto = async () => {
    setLoading(true);
    try {
      const { lat, lon } = await locationService.getBrowserLocation();
      const loc = await locationService.reverseGeocode(lat, lon);
      setCurrent({ ...loc, source: "gps" });
      toast.success(`${t("location.detected")}: ${loc.label}`);
    } catch (e) {
      const msg = e instanceof GeolocationPositionError ? t("location.permission_denied") : String(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await locationService.search(q);
      setResults(r);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card-elegant ${compact ? "" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> {t("location.title")}
          </h3>
          {!compact && (
            <p className="text-xs text-muted-foreground">{t("location.subtitle")}</p>
          )}
        </div>
        {current && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("location.detected")} ✓
          </span>
        )}
      </div>

      <Tabs defaultValue="auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto">
            <Navigation className="mr-1.5 h-3.5 w-3.5" /> GPS
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="mr-1.5 h-3.5 w-3.5" /> Search
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="mr-1.5 h-3.5 w-3.5" /> Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="pt-3">
          <Button onClick={handleAuto} disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
            {t("location.auto")}
          </Button>
        </TabsContent>

        <TabsContent value="search" className="space-y-2 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => void handleSearch(e.target.value)}
              placeholder="Nadia, Howrah, Barrackpore…"
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <AnimatePresence>
            {results.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-h-56 overflow-auto rounded-xl border border-border bg-background"
              >
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setCurrent({ ...r, source: "search" });
                        setResults([]);
                        setQuery("");
                        toast.success(r.label ?? "Selected");
                      }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-2">{r.label}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="map" className="pt-3">
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Click anywhere on the map in the <strong>Satellite</strong> panel to pin your field location.
          </p>
        </TabsContent>
      </Tabs>

      {current && (
        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current</div>
          <div className="mt-1 text-sm font-medium">{current.label ?? `${current.lat.toFixed(3)}, ${current.lon.toFixed(3)}`}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {current.lat.toFixed(4)}, {current.lon.toFixed(4)}
          </div>
          {!favorites.some((f) => f.lat === current.lat && f.lon === current.lon) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs"
              onClick={() => addFavorite(current)}
            >
              ★ Save as favorite
            </Button>
          )}
        </div>
      )}

      {(recents.length > 0 || favorites.length > 0) && (
        <div className="mt-3 space-y-2">
          {favorites.length > 0 && (
            <Chips title="Favorites" items={favorites} onPick={(l) => setCurrent(l)} />
          )}
          {recents.length > 0 && (
            <Chips title="Recent" items={recents} onPick={(l) => setCurrent(l)} />
          )}
        </div>
      )}
    </div>
  );
}

function Chips({
  title,
  items,
  onPick,
}: {
  title: string;
  items: LocationData[];
  onPick: (l: LocationData) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 5).map((l, i) => (
          <button
            key={i}
            onClick={() => onPick(l)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
          >
            <MapPin className="h-3 w-3 text-primary" />
            <span className="max-w-32 truncate">{l.village ?? l.label?.split(",")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
