import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, X, Leaf } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/common/lang-toggle";

const links = [
  { to: "/", key: "home" },
  { to: "/#features", key: "features" },
  { to: "/dashboard", key: "dashboard" },
  { to: "/#pricing", key: "pricing" },
  { to: "/#about", key: "about" },
  { to: "/#faq", key: "faq" },
] as const;

export function LandingNavbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.7)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg }}
      className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl border-b border-transparent supports-[backdrop-filter]:border-border/40"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-soft">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {t("brand")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(`nav.${l.key}`)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LangToggle />
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/auth/login">{t("nav.login")}</Link>
          </Button>
          <Button
            asChild
            className="rounded-full gradient-primary text-primary-foreground shadow-soft hover:opacity-95"
          >
            <Link to="/auth/register">{t("nav.signup")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LangToggle />
          <button
            aria-label="Toggle menu"
            className="grid h-11 w-11 place-items-center rounded-full"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.key}
                href={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
              >
                {t(`nav.${l.key}`)}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild className="rounded-full gradient-primary text-primary-foreground">
                <Link to="/auth/register">{t("nav.signup")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}
