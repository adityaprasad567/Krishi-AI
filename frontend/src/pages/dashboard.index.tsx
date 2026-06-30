import { Link } from "react-router-dom";
import { CloudSun, Droplets, Sprout, Satellite, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/location-store";
import { LocationPicker } from "@/components/location/location-picker";
import { PageHeader, PanelCard, StatCard, EmptyState } from "@/components/dashboard/primitives";
import { fadeUp, stagger } from "@/lib/motion";
import { isApiConfigured } from "@/services/api";
import { weatherService } from "@/services/weather";
import { soilService } from "@/services/soil";
import { satelliteService } from "@/services/satellite";

function greeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("dashboard.greeting_morning");
  if (h < 17) return t("dashboard.greeting_afternoon");
  return t("dashboard.greeting_evening");
}

function Overview() {
  const { t } = useTranslation();
  const current = useLocationStore((s) => s.current);

  const enabled = !!current && isApiConfigured;

  const { data: weather } = useQuery({
    queryKey: ["weather", current?.lat, current?.lon],
    queryFn: () => weatherService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 5 * 60_000,
  });

  const { data: soil } = useQuery({
    queryKey: ["soil", current?.lat, current?.lon],
    queryFn: () => soilService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 10 * 60_000,
  });

  const { data: satellite } = useQuery({
    queryKey: ["satellite", current?.lat, current?.lon],
    queryFn: () => satelliteService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 30 * 60_000,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`${greeting(t)}, Farmer 👋`}
        subtitle={
          current?.label
            ? current.label
            : "Pick a location to unlock personalized insights."
        }
      />

      {!isApiConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Running in demo mode. Set <code className="font-mono text-xs">VITE_API_BASE_URL</code> in your{" "}
            <code className="font-mono text-xs">.env</code> file to fetch live data.
          </span>
        </div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Weather"
              value={weather ? Math.round(weather.current.temp) : "–"}
              unit={weather ? "°C" : ""}
              icon={<CloudSun className="h-5 w-5 text-primary" />}
              hint={weather?.current.condition ?? (isApiConfigured ? "Loading…" : "Set location")}
              tone="primary"
            />
            <StatCard
              label="Soil Health"
              value={soil ? soil.health_score : "–"}
              unit={soil ? "/100" : ""}
              icon={<Droplets className="h-5 w-5 text-accent" />}
              hint={soil ? (soil.health_score >= 70 ? "Good" : "Fair") : "—"}
            />
            <StatCard
              label="NDVI"
              value={satellite ? satellite.ndvi.toFixed(2) : "–"}
              icon={<Satellite className="h-5 w-5 text-secondary" />}
              hint={satellite ? (satellite.ndvi >= 0.6 ? "Healthy canopy" : "Moderate") : "—"}
            />
            <StatCard
              label="Best Crop"
              value={soil?.suitable_crops?.[0] ?? "–"}
              icon={<Sprout className="h-5 w-5 text-success" />}
              hint={soil ? "From soil data" : "—"}
            />
          </div>

          <PanelCard
            title="Alerts"
            actions={
              <Link to="/dashboard/weather" className="text-xs font-medium text-primary hover:underline">
                View weather
              </Link>
            }
          >
            {weather && weather.current.rain_probability > 50 ? (
              <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                <div>
                  <p className="font-medium">Rain likely today</p>
                  <p className="text-xs text-muted-foreground">
                    {weather.current.rain_probability}% chance of rain. Plan irrigation accordingly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-success/10 p-3 text-sm text-success">
                ✅ No major alerts for your area right now.
              </div>
            )}
          </PanelCard>

          <PanelCard title="Quick links">
            <ul className="divide-y divide-border text-sm">
              {[
                { label: "Crop Recommendation →", to: "/dashboard/crops" },
                { label: "Soil Health →", to: "/dashboard/soil" },
                { label: "Satellite Monitoring →", to: "/dashboard/satellite" },
                { label: "Disease Detection →", to: "/dashboard/disease" },
              ].map((item) => (
                <li key={item.to} className="flex items-center justify-between py-3">
                  <Link
                    to={item.to}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    {item.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </PanelCard>

          {!current && (
            <EmptyState
              title="No location selected"
              description="Use the picker to fetch live weather, soil and satellite data for your field."
              icon={<CloudSun className="h-8 w-8" />}
            />
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <LocationPicker />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Overview;
