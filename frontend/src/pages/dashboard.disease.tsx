import { useMutation } from "@tanstack/react-query";
import { Camera, Upload, Microscope, ImageIcon, X, WifiOff } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { diseaseService, type DiseaseResult } from "@/services/disease";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isApiConfigured } from "@/services/api";

function DiseasePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (f: File) => diseaseService.predict(f),
    onError: (e) => toast.error(String((e as Error).message)),
  });

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    mutation.reset();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Disease Detection"
        subtitle="Upload a leaf photo to scan for pests and disease."
      />

      {!isApiConfigured && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Backend not connected. Set <code className="font-mono text-xs">VITE_API_BASE_URL</code> to
            enable AI disease detection.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Upload image">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />

          {!preview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) pickFile(f);
              }}
              className="grid place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center"
            >
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">Drag & drop a leaf photo</p>
              <p className="text-xs text-muted-foreground">Supports JPEG and PNG · max 10 MB</p>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full gradient-primary text-primary-foreground"
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload
                </Button>
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full"
                >
                  <Camera className="mr-2 h-4 w-4" /> Camera
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl">
                <img src={preview} alt="Leaf" className="aspect-video w-full object-cover" />
                <button
                  aria-label="Remove image"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    mutation.reset();
                  }}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={() => {
                  if (!isApiConfigured) {
                    toast.error("Backend not connected. Set VITE_API_BASE_URL to use disease detection.");
                    return;
                  }
                  if (file) mutation.mutate(file);
                }}
                disabled={!file || mutation.isPending}
                className="h-11 w-full rounded-full gradient-primary text-primary-foreground"
              >
                <Microscope className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Analyzing…" : "Analyze with AI"}
              </Button>
            </div>
          )}
        </PanelCard>

        <PanelCard title="AI prediction">
          {mutation.isPending ? (
            <Pulse />
          ) : mutation.isError ? (
            <EmptyState
              icon={<Microscope className="h-10 w-10" />}
              title="Analysis failed"
              description={String((mutation.error as Error).message)}
            />
          ) : !mutation.data ? (
            <div className="grid place-items-center py-10 text-center text-sm text-muted-foreground">
              <Microscope className="h-10 w-10 text-primary" />
              <p className="mt-3 font-medium">Upload a leaf photo to get started</p>
              <p className="text-xs mt-1">AI will detect diseases and suggest treatments</p>
            </div>
          ) : (
            <ResultCard r={mutation.data} />
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: DiseaseResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <div className="text-xs uppercase text-muted-foreground">Detected</div>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="font-display text-2xl font-bold">{r.disease}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              r.confidence >= 85
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {r.confidence}%
          </span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Treatment</div>
        <p className="mt-1 text-sm leading-relaxed">{r.treatment}</p>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Prevention</div>
        <ul className="mt-1 space-y-1.5 text-sm">
          {r.prevention.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function Pulse() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default DiseasePanel;
