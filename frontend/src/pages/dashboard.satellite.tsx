import { useQuery } from "@tanstack/react-query";
import { Satellite, RefreshCw } from "lucide-react";
import { useLocationStore } from "@/stores/location-store";
import { satelliteService } from "@/services/satellite";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/primitives";
import { LocationPicker } from "@/components/location/location-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldMap } from "@/components/satellite/field-map";
import { Button } from "@/components/ui/button";
import { isApiConfigured } from "@/services/api";

function SatellitePanel() {
  const current = useLocationStore((s) => s.current);
  const enabled = !!current && isApiConfigured;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["satellite", current?.lat, current?.lon],
    queryFn: () => satelliteService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const healthColor = data
    ? data.field_health >= 70
      ? "text-success"
      : data.field_health >= 50
      ? "text-warning"
      : "text-destructive"
    : "";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Satellite Monitoring"
        subtitle={current?.label ?? "Click on the map to pick your field location"}
        actions={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isApiConfigured ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isApiConfigured ? "bg-success" : "bg-muted-foreground"}`} />
            🛰 {isApiConfigured ? "Connected" : "Demo mode"}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PanelCard title="Field map" className="overflow-hidden p-0">
            <div className="h-[420px] w-full">
              <FieldMap />
            </div>
          </PanelCard>
        </div>

        <div className="space-y-4">
          {current ? (
            <PanelCard title="Coordinates">
              <div className="space-y-2 text-sm">
                <Row label="Latitude" value={current.lat.toFixed(5)} />
                <Row label="Longitude" value={current.lon.toFixed(5)} />
                {current.state && <Row label="Region" value={current.state} />}
                {current.district && <Row label="District" value={current.district} />}
              </div>
            </PanelCard>
          ) : (
            <EmptyState
              icon={<Satellite className="h-10 w-10" />}
              title="No location yet"
              description="Click on the map or use the GPS button to set your field location."
            />
          )}

          {current && !isApiConfigured && (
            <EmptyState
              icon={<Satellite className="h-10 w-10" />}
              title="Backend not connected"
              description="Set VITE_API_BASE_URL in your .env for live satellite data."
            />
          )}

          {current && isApiConfigured && (
            isLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : isError ? (
              <EmptyState
                icon={<Satellite className="h-10 w-10" />}
                title="Could not load satellite data"
                description={String((error as Error).message)}
                action={
                  <Button onClick={() => void refetch()} size="sm" className="rounded-full gradient-primary text-primary-foreground">
                    Retry
                  </Button>
                }
              />
            ) : (
              <PanelCard
                title="Vegetation indices"
                actions={
                  <Button variant="ghost" size="sm" className="rounded-full h-7 px-2" onClick={() => void refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="NDVI" value={data!.ndvi.toFixed(2)}
                    hint={data!.ndvi >= 0.6 ? "Healthy" : data!.ndvi >= 0.4 ? "Moderate" : "Stressed"} />
                  <Metric label="Veg. Index" value={data!.vegetation_index.toFixed(2)} />
                  <Metric label="Crop Stress" value={`${data!.crop_stress}%`}
                    hint={data!.crop_stress < 30 ? "Low" : data!.crop_stress < 60 ? "Medium" : "High"} />
                  <Metric label="Field Health" value={`${data!.field_health}%`}
                    valueClass={healthColor} />
                </div>
              </PanelCard>
            )
          )}

          <LocationPicker compact />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  valueClass = "",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold ${valueClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default SatellitePanel;
