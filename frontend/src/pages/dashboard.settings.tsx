
import { useTranslation } from "react-i18next";
import { useUiStore, type Lang, type Theme } from "@/stores/ui-store";
import { PageHeader, PanelCard } from "@/components/dashboard/primitives";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";



function SettingsPanel() {
  const { t } = useTranslation();
  const { theme, setTheme, lang, setLang } = useUiStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("dashboard.settings")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Language">
          <div className="grid grid-cols-3 gap-2">
            {(["en", "hi", "bn"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-xl border p-3 text-sm font-medium ${
                  lang === l ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {l === "en" ? "English" : l === "hi" ? "हिन्दी" : "বাংলা"}
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Theme">
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as Theme[]).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`rounded-xl border p-3 text-sm font-medium capitalize ${
                  theme === th ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {th}
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Notifications">
          <div className="space-y-3">
            {[
              ["Rain alerts", true],
              ["Pest alerts", true],
              ["Market price alerts", false],
              ["Low soil moisture", true],
            ].map(([label, on]) => (
              <div key={label as string} className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label as string}</Label>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Units">
          <div className="space-y-3 text-sm">
            <Row label="Temperature" value="Celsius" />
            <Row label="Wind speed" value="km/h" />
            <Row label="Rainfall" value="mm" />
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default SettingsPanel;
