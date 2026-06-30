import { Link, Outlet, useLocation } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";



function AuthLayout() {
  const { t } = useTranslation();
  const path = useLocation().pathname;
  const isLogin = path.endsWith("/login");

  return (
    <main className="min-h-dvh bg-background">
      <div className="grid min-h-dvh lg:grid-cols-2">
        {/* visual side */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 gradient-primary animate-gradient" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.2),transparent_50%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <Leaf className="h-5 w-5" />
              </span>
              {t("brand")}
            </Link>
            <div>
              <h2 className="font-display text-4xl font-bold leading-tight">
                Grow more with the power of AI.
              </h2>
              <p className="mt-3 max-w-md text-white/85">
                Join thousands of Indian farmers using KrishiAI to plan crops, predict weather, and
                protect their harvest.
              </p>
              <div className="mt-8 flex gap-2">
                <span className="h-1 w-10 rounded-full bg-white/90" />
                <span className="h-1 w-6 rounded-full bg-white/40" />
                <span className="h-1 w-6 rounded-full bg-white/40" />
              </div>
            </div>
            <div className="text-xs text-white/70">© KrishiAI · Built for Bharat 🌾</div>
          </div>
        </div>

        {/* form side */}
        <div className="flex flex-col">
          <header className="flex items-center justify-between p-6">
            <Link to="/" className="flex items-center gap-2 font-display text-base font-bold lg:invisible">
              <span className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </span>
              {t("brand")}
            </Link>
            <Link
              to={isLogin ? "/auth/register" : "/auth/login"}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isLogin ? t("auth.no_account") : t("auth.have_account")}{" "}
              <span className="text-primary">{isLogin ? t("nav.signup") : t("nav.login")}</span>
            </Link>
          </header>
          <div className="flex flex-1 items-center justify-center px-6 pb-12">
            <div className="w-full max-w-sm">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthLayout;
