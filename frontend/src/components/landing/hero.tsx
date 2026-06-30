import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FloatingLeaves } from "./floating-leaves";
import { fadeUp, stagger } from "@/lib/motion";
import heroImg from "@/assets/hero-farmer.jpg";

export function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      {/* gradient bg */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(60%_70%_at_30%_20%,oklch(0.95_0.04_140)_0%,transparent_60%),radial-gradient(60%_70%_at_85%_35%,oklch(0.9_0.06_120)_0%,transparent_60%),linear-gradient(180deg,var(--background),var(--background))]"
      />
      <FloatingLeaves />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI for Indian farmers
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl"
          >
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              {t("hero.headline")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            {t("hero.sub")}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full gradient-primary px-6 text-base text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Link to="/dashboard">
                {t("hero.cta_primary")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
              <a href="#features">{t("hero.cta_secondary")}</a>
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
          >
            <div>
              <div className="text-2xl font-bold text-foreground">50K+</div>
              farmers
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">22</div>
              states
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-foreground">96%</div>
              accuracy
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-accent/20 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card-elegant">
            <img
              src={heroImg}
              alt="Indian farmer using KrishiAI on a smartphone in a green field"
              className="aspect-[5/4] w-full object-cover"
              loading="eager"
            />
          </div>

          {/* floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute -left-4 bottom-8 hidden rounded-2xl border border-border/60 bg-card/90 p-3 shadow-card-elegant backdrop-blur sm:block"
          >
            <div className="text-xs text-muted-foreground">Soil health</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[78%] gradient-primary" />
              </div>
              <span className="text-sm font-semibold">78</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -right-4 top-10 hidden rounded-2xl border border-border/60 bg-card/90 p-3 shadow-card-elegant backdrop-blur sm:block"
          >
            <div className="text-xs text-muted-foreground">Best crop</div>
            <div className="mt-1 text-sm font-semibold">Paddy · 96%</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
