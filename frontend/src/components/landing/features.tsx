import { motion } from "framer-motion";
import { CloudRain, Leaf, Microscope, Satellite, Sprout, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fadeUp, stagger } from "@/lib/motion";

const items = [
  { key: "crop", Icon: Sprout },
  { key: "weather", Icon: CloudRain },
  { key: "soil", Icon: Leaf },
  { key: "satellite", Icon: Satellite },
  { key: "disease", Icon: Microscope },
  { key: "market", Icon: TrendingUp },
] as const;

export function Features() {
  const { t } = useTranslation();
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl">
            {t("features.title")}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
            {t("features.subtitle")}
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map(({ key, Icon }) => (
            <motion.div
              key={key}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-card-elegant"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`features.${key}.desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
