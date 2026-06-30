import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { marketService } from "@/services/market";
import { useLocationStore } from "@/stores/location-store";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isApiConfigured } from "@/services/api";

function MarketPanel() {
  const state = useLocationStore((s) => s.current?.state);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["market", state],
    queryFn: () => marketService.list(state),
    enabled: isApiConfigured,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Market Prices"
        subtitle={state ? `Live mandi prices · ${state}` : "Live mandi prices across India"}
        actions={
          isApiConfigured ? (
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

      {!isApiConfigured ? (
        <EmptyState
          icon={<TrendingUp className="h-10 w-10" />}
          title="Backend not connected"
          description="Set VITE_API_BASE_URL in your .env to fetch live mandi prices."
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<TrendingUp className="h-10 w-10" />}
          title="Could not load prices"
          description={String((error as Error).message)}
          action={
            <Button onClick={() => void refetch()} className="rounded-full gradient-primary text-primary-foreground">
              Retry
            </Button>
          }
        />
      ) : (
        <PanelCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Crop</th>
                <th className="px-4 py-3 text-right">Today (₹)</th>
                <th className="px-4 py-3 text-right">Yesterday (₹)</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="hidden px-4 py-3 lg:table-cell">7-day</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => {
                const delta = p.today - p.yesterday;
                const up = delta >= 0;
                return (
                  <tr key={p.crop} className="border-t border-border transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.crop}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹{p.today.toLocaleString("en-IN")}
                      <span className="text-xs text-muted-foreground"> /{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ₹{p.yesterday.toLocaleString("en-IN")}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${up ? "text-success" : "text-destructive"}`}>
                      <span className="inline-flex items-center gap-1">
                        {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {up ? "+" : ""}{delta}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <ResponsiveContainer width={120} height={40}>
                        <LineChart data={p.trend}>
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: "var(--color-card)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke={up ? "var(--color-success)" : "var(--color-destructive)"}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </td>
                  </tr>
                );
              })}
              {(!data || data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No prices available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </PanelCard>
      )}
    </div>
  );
}

export default MarketPanel;
