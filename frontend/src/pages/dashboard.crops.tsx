import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Sprout, Download, Sparkles, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { cropsService, type CropInput, type CropResult } from "@/services/crops";
import { useLocationStore } from "@/stores/location-store";
import { PageHeader, PanelCard } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fadeUp, stagger } from "@/lib/motion";
import { isApiConfigured } from "@/services/api";

const schema = z.object({
  season: z.string().min(1, "Required"),
  soil_type: z.string().min(1, "Required"),
  nitrogen: z.coerce.number().min(0).max(200),
  phosphorus: z.coerce.number().min(0).max(200),
  potassium: z.coerce.number().min(0).max(200),
  ph: z.coerce.number().min(0).max(14),
  temperature: z.coerce.number().min(-10).max(60),
  humidity: z.coerce.number().min(0).max(100),
  rainfall: z.coerce.number().min(0).max(2000),
});

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const SEASONS = ["Kharif", "Rabi", "Zaid", "Perennial"];
const SOIL_TYPES = ["Loamy", "Sandy", "Clay", "Silty", "Peaty", "Chalky", "Black Cotton", "Red Laterite"];

function CropsPanel() {
  const current = useLocationStore((s) => s.current);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      season: "Kharif",
      soil_type: "Loamy",
      nitrogen: 80,
      phosphorus: 40,
      potassium: 40,
      ph: 6.5,
      temperature: 28,
      humidity: 65,
      rainfall: 120,
    },
  });

  const mutation = useMutation({
    mutationFn: (input: CropInput) => cropsService.recommend(input),
    onError: (e) => toast.error(String((e as Error).message)),
  });

  const onSubmit = (v: FormOut) => {
    if (!isApiConfigured) {
      toast.error("Backend not connected. Set VITE_API_BASE_URL in your .env to get crop recommendations.");
      return;
    }
    const input: CropInput = {
      nitrogen: v.nitrogen,
      phosphorus: v.phosphorus,
      potassium: v.potassium,
      ph: v.ph,
      temperature: v.temperature,
      humidity: v.humidity,
      rainfall: v.rainfall,
      season: v.season,
      soil_type: v.soil_type,
      lat: current?.lat,
      lon: current?.lon,
    };
    mutation.mutate(input);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Crop Recommendation"
        subtitle="AI-driven suggestions tailored to your soil, climate and season."
      />

      {!isApiConfigured && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Backend not connected. Set <code className="font-mono text-xs">VITE_API_BASE_URL</code> in
            your <code className="font-mono text-xs">.env</code> to get AI recommendations.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCard title="Field parameters" className="lg:col-span-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Field label="Season" error={errors.season?.message}>
              <Select
                defaultValue="Kharif"
                onValueChange={(v) => setValue("season", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Soil type" error={errors.soil_type?.message}>
              <Select
                defaultValue="Loamy"
                onValueChange={(v) => setValue("soil_type", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select soil type" />
                </SelectTrigger>
                <SelectContent>
                  {SOIL_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                NPK (kg/ha)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Field label="N" error={errors.nitrogen?.message}>
                  <Input type="number" {...register("nitrogen")} />
                </Field>
                <Field label="P" error={errors.phosphorus?.message}>
                  <Input type="number" {...register("phosphorus")} />
                </Field>
                <Field label="K" error={errors.potassium?.message}>
                  <Input type="number" {...register("potassium")} />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="pH" error={errors.ph?.message}>
                <Input type="number" step="0.1" {...register("ph")} />
              </Field>
              <Field label="Temp °C" error={errors.temperature?.message}>
                <Input type="number" {...register("temperature")} />
              </Field>
              <Field label="Humidity %" error={errors.humidity?.message}>
                <Input type="number" {...register("humidity")} />
              </Field>
              <Field label="Rain mm" error={errors.rainfall?.message}>
                <Input type="number" {...register("rainfall")} />
              </Field>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-11 w-full rounded-full gradient-primary text-primary-foreground"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Predicting…" : "Recommend Crops"}
            </Button>
          </form>
        </PanelCard>

        <div className="lg:col-span-2">
          {!mutation.data ? (
            <PanelCard className="grid h-full min-h-64 place-items-center">
              <div className="py-10 text-center">
                <Sprout className="mx-auto h-12 w-12 text-primary opacity-60" />
                <p className="mt-3 font-medium">Fill in your field details</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                  We'll suggest the top crops with profitability scores, water needs, and fertilizer advice.
                </p>
              </div>
            </PanelCard>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {mutation.data.map((c) => (
                <CropCard key={c.name} c={c} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function CropCard({ c }: { c: CropResult }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card-elegant"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-display text-xl font-bold">{c.name}</h4>
          <span className="text-xs text-muted-foreground">{c.best_sowing_month}</span>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            c.confidence >= 80
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning"
          }`}
        >
          {c.confidence}%
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Mini label="Yield" value={c.expected_yield} />
        <Mini label="Water" value={c.water_requirement} />
        <Mini label="Duration" value={c.growing_duration} />
        <Mini label="Profit" value={`${c.profitability}/10`} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Fertilizer:</strong> {c.fertilizer}
      </p>
      <Button variant="outline" size="sm" className="mt-4 w-full rounded-full">
        <Download className="mr-2 h-3.5 w-3.5" /> Download report
      </Button>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold leading-tight">{value}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export default CropsPanel;
