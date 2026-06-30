
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LocationPicker } from "@/components/location/location-picker";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";



function LandingPage() {
  return (
    <main className="min-h-dvh bg-background">
      <LandingNavbar />
      <Hero />
      <Features />

      {/* Smart Location section */}
      <section id="about" className="relative py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">
              Insights tailored to your{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                exact field
              </span>
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Auto-detect your location, search your village, or pin a spot on the map. Every
              recommendation, alert and forecast you see is local to your land.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                GPS auto-detect with permission handling
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-secondary" />
                Village / district / state search
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                Map pin with live weather and soil sync
              </li>
            </ul>
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <LocationPicker />
          </motion.div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Free for every farmer</h2>
          <p className="mt-3 text-muted-foreground">
            KrishiAI's core features are free. Premium analytics arrive soon.
          </p>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

export default LandingPage;
