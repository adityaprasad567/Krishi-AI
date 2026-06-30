import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { isApiConfigured } from "@/services/api";

const schema = z
  .object({
    name: z.string().min(2, "Please enter your name"),
    phone: z.string().min(10, "Enter a valid phone"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string().min(6),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

function RegisterPage() {
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
        await authService.register({
          name: v.name,
          phone: v.phone,
          email: v.email,
          password: v.password,
        });
        toast.success("Account created! Welcome to KrishiAI.");
        void navigate("/dashboard");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Account created (demo mode). Welcome!");
      void navigate("/dashboard");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("auth.register_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.register_sub")}</p>

      {!isApiConfigured && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
          ⚠️ Demo mode — no backend connected.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-3">
        <Field label={t("auth.name")} error={errors.name?.message}>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field label={t("auth.phone")} error={errors.phone?.message}>
          <Input inputMode="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field label={t("auth.email")} error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("auth.password")} error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field label={t("auth.confirm")} error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register("confirm")} />
          </Field>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-full gradient-primary text-primary-foreground"
        >
          {isSubmitting ? "…" : t("auth.continue")}
        </Button>
      </form>
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
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default RegisterPage;
