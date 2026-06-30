import { useQuery } from "@tanstack/react-query";
import { Leaf, Droplets, FlaskConical, Sprout, RefreshCw } from "lucide-react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useLocationStore } from "@/stores/location-store";
import { soilService } from "@/services/soil";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/primitives";
import { LocationPicker } from "@/components/location/location-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isApiConfigured } from "@/services/api";

function SoilPanel() {
  const current = useLocationStore((s) => s.current);
  const enabled = !!current && isApiConfigured;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["soil", current?.lat, current?.lon],
    queryFn: () => soilService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Soil Health"
        subtitle={current?.label ?? "Pick a location to fetch soil data"}
        actions={
          data ? (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ) : undefined
        }
      />

      {!current ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmptyState icon={<Leaf className="h-10 w-10" />} title="Select a location"
              description="Soil data is fetched for your exact coordinates." />
          </div>
          <LocationPicker />
        </div>
      ) : !isApiConfigured ? (
        <EmptyState icon={<Leaf className="h-10 w-10" />} title="Backend not connected"
          description="Set VITE_API_BASE_URL in your .env to fetch live soil data." />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={<Leaf className="h-10 w-10" />} title="Could not load soil data"
          description={String((error as Error).message)}
          action={
            <Button onClick={() => void refetch()} className="rounded-full gradient-primary text-primary-foreground">
              Retry
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <PanelCard title="Nutrients (NPK)">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { k: "Nitrogen", v: data!.nitrogen, max: 140, color: "var(--color-primary)" },
                  { k: "Phosphorus", v: data!.phosphorus, max: 80, color: "var(--color-secondary)" },
                  { k: "Potassium", v: data!.potassium, max: 100, color: "var(--color-accent)" },
                ].map((x) => (
                  <div key={x.k}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{x.k}</span>
                      <span className="font-semibold">{x.v} kg/ha</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (x.v / x.max) * 100)}%`,
                          backgroundColor: x.color,
                        }}
                      />
                    </div>
                    <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
                      {x.v < x.max * 0.4 ? "Low" : x.v < x.max * 0.7 ? "Medium" : "High"}
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="pH" value={data!.ph} icon={<FlaskConical className="h-5 w-5" />}
                hint={data!.ph < 5.5 ? "Acidic" : data!.ph > 7.5 ? "Alkaline" : "Neutral"} />
              <Metric label="Moisture" value={`${data!.moisture}%`} icon={<Droplets className="h-5 w-5" />}
                hint={data!.moisture < 30 ? "Low" : "Adequate"} />
              <Metric label="Organic C" value={`${data!.organic_carbon}%`} icon={<Leaf className="h-5 w-5" />}
                hint={data!.organic_carbon < 0.5 ? "Low" : "Good"} />
            </div>

            <PanelCard title="Improvement suggestions">
              <ul className="space-y-2 text-sm">
                {data!.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            </PanelCard>
          </div>

          <div className="space-y-4">
            <PanelCard title="Health score">
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ name: "score", value: data!.health_score, fill: "var(--color-primary)" }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={20} background />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="font-display text-4xl font-bold">{data!.health_score}</div>
                    <div className="text-xs text-muted-foreground">/ 100</div>
                    <div className={`mt-1 text-xs font-medium ${
                      data!.health_score >= 70 ? "text-success" : data!.health_score >= 50 ? "text-warning" : "text-destructive"
                    }`}>
                      {data!.health_score >= 70 ? "Good" : data!.health_score >= 50 ? "Fair" : "Poor"}
                    </div>
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Suitable crops">
              <div className="flex flex-wrap gap-1.5">
                {data!.suitable_crops.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    <Sprout className="h-3 w-3" />
                    {c}
                  </span>
                ))}
              </div>
            </PanelCard>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card-elegant">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default SoilPanel;
