import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLocationStore } from "@/stores/location-store";
import { PageHeader, PanelCard } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { toast } from "sonner";

function ProfilePanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const current = useLocationStore((s) => s.current);
  const user = authService.getUser();

  const handleSignOut = () => {
    authService.logout();
    toast.success("Signed out successfully.");
    void navigate("/");
  };

  const displayName = user?.name ?? "Krishi Farmer";
  const displayEmail = user?.email ?? "farmer@krishiai.app";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("dashboard.profile")} />
      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCard className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full gradient-primary text-3xl font-bold text-primary-foreground shadow-glow">
              {initial}
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{displayEmail}</p>
            {current?.label && (
              <p className="mt-1 text-xs text-muted-foreground">{current.label}</p>
            )}
            <Button
              variant="outline"
              className="mt-4 w-full rounded-full"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </PanelCard>

        <PanelCard title="Profile details" className="lg:col-span-2">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Profile saved (demo).");
            }}
          >
            <Field label={t("auth.name")} defaultValue={displayName} />
            <Field label={t("auth.phone")} defaultValue="+91 99999 00000" />
            <Field label={t("auth.email")} defaultValue={displayEmail} type="email" />
            <Field label="Village" defaultValue={current?.village ?? ""} />
            <Field label="District" defaultValue={current?.district ?? ""} />
            <Field label="State" defaultValue={current?.state ?? ""} />
            <div className="sm:col-span-2">
              <Button type="submit" className="rounded-full gradient-primary text-primary-foreground">
                {t("common.save")}
              </Button>
            </div>
          </form>
        </PanelCard>
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} defaultValue={defaultValue} />
    </div>
  );
}

export default ProfilePanel;
