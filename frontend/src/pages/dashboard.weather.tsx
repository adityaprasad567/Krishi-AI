import { useQuery } from "@tanstack/react-query";
import {
  CloudSun, Droplets, Eye, Gauge, Sun, Sunrise, Sunset,
  Wind, CloudRain, Thermometer, RefreshCw,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useLocationStore } from "@/stores/location-store";
import { weatherService } from "@/services/weather";
import { PageHeader, PanelCard, StatCard, EmptyState } from "@/components/dashboard/primitives";
import { LocationPicker } from "@/components/location/location-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isApiConfigured } from "@/services/api";

function WeatherPanel() {
  const current = useLocationStore((s) => s.current);
  const enabled = !!current && isApiConfigured;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["weather", current?.lat, current?.lon],
    queryFn: () => weatherService.getByCoords(current!.lat, current!.lon),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Weather"
        subtitle={current?.label ?? "Pick a location to see live weather"}
        actions={
          data ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ) : undefined
        }
      />

      {!current ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmptyState
              icon={<CloudSun className="h-10 w-10" />}
              title="Select a location"
              description="Weather updates automatically when you set a field location."
            />
          </div>
          <LocationPicker />
        </div>
      ) : !isApiConfigured ? (
        <EmptyState
          icon={<CloudSun className="h-10 w-10" />}
          title="Backend not connected"
          description="Set VITE_API_BASE_URL in your .env file to fetch live weather data."
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<CloudSun className="h-10 w-10" />}
          title="Could not load weather"
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Temperature" value={Math.round(data!.current.temp)} unit="°C"
                icon={<Thermometer className="h-5 w-5 text-primary" />}
                hint={`Feels ${Math.round(data!.current.feels_like)}°`} tone="primary" />
              <StatCard label="Humidity" value={data!.current.humidity} unit="%"
                icon={<Droplets className="h-5 w-5 text-secondary" />} />
              <StatCard label="Wind" value={data!.current.wind_speed} unit="km/h"
                icon={<Wind className="h-5 w-5 text-accent" />} />
              <StatCard label="Rain prob." value={data!.current.rain_probability} unit="%"
                icon={<CloudRain className="h-5 w-5 text-primary" />}
                tone={data!.current.rain_probability > 60 ? "warning" : "default"} />
              <StatCard label="Pressure" value={data!.current.pressure} unit="hPa"
                icon={<Gauge className="h-5 w-5 text-muted-foreground" />} />
              <StatCard label="Visibility" value={data!.current.visibility} unit="km"
                icon={<Eye className="h-5 w-5 text-muted-foreground" />} />
              <StatCard label="UV Index" value={data!.current.uv_index}
                icon={<Sun className="h-5 w-5 text-warning" />}
                tone={data!.current.uv_index >= 8 ? "warning" : "default"} />
              <StatCard label="AQI" value={data!.current.aqi}
                icon={<Wind className="h-5 w-5 text-muted-foreground" />} />
            </div>

            <PanelCard title="Hourly forecast" subtitle="Next 24 hours">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data!.hourly}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temp"
                    name="Temp °C"
                    stroke="var(--color-primary)"
                    fill="url(#tempGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </PanelCard>

            <PanelCard title="7-day forecast">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {data!.daily.map((d) => (
                  <div key={d.date} className="rounded-xl bg-muted/40 p-3 text-center">
                    <div className="text-xs font-medium text-muted-foreground">{d.date}</div>
                    <div className="mt-1 text-sm font-semibold">{Math.round(d.max)}°</div>
                    <div className="text-xs text-muted-foreground">{Math.round(d.min)}°</div>
                    {d.rain > 0 && (
                      <div className="mt-1 text-[10px] text-primary">💧{d.rain}mm</div>
                    )}
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>

          <div className="space-y-4">
            <PanelCard title="Sun times">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Sunrise className="h-4 w-4 text-warning" /> Sunrise
                  </span>
                  <span className="font-medium">{data!.current.sunrise}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Sunset className="h-4 w-4 text-accent" /> Sunset
                  </span>
                  <span className="font-medium">{data!.current.sunset}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Condition</span>
                  <span className="font-medium capitalize">{data!.current.condition}</span>
                </div>
              </div>
            </PanelCard>
            <LocationPicker compact />
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherPanel;
