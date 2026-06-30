import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { isApiConfigured } from "@/services/api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: FormValues) => {
    if (isApiConfigured) {
      try {
        await authService.login(v.email, v.password);
        toast.success("Signed in successfully!");
        void navigate("/dashboard");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      // Demo mode — no backend required
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Signed in (demo mode — no backend configured)");
      void navigate("/dashboard");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("auth.login_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.login_sub")}</p>

      {!isApiConfigured && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
          ⚠️ Running in demo mode. Set <code className="font-mono">VITE_API_BASE_URL</code> in your{" "}
          <code className="font-mono">.env</code> for live authentication.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("remember")} /> {t("auth.remember")}
          </label>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            {t("auth.forgot")}
          </a>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-full gradient-primary text-primary-foreground"
        >
          {isSubmitting ? "…" : t("auth.sign_in")}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="h-11 w-full rounded-full" disabled>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.8h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.84 3.62 14.62 2.7 12 2.7 6.97 2.7 2.9 6.77 2.9 11.8s4.07 9.1 9.1 9.1c5.25 0 8.73-3.68 8.73-8.86 0-.6-.07-1.05-.13-1.5z"
          />
        </svg>
        {t("auth.google")} (coming soon)
      </Button>
    </div>
  );
}

export default LoginPage;
