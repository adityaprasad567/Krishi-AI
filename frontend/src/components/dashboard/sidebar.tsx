import { Link, useLocation } from "react-router-dom";
import {
  Bot,
  CloudSun,
  Leaf,
  Layout,
  Microscope,
  Satellite,
  Settings,
  Sprout,
  TrendingUp,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const items = [
  { to: "/dashboard", icon: Layout, key: "overview" },
  { to: "/dashboard/weather", icon: CloudSun, key: "weather" },
  { to: "/dashboard/crops", icon: Sprout, key: "crops" },
  { to: "/dashboard/soil", icon: Leaf, key: "soil" },
  { to: "/dashboard/satellite", icon: Satellite, key: "satellite" },
  { to: "/dashboard/disease", icon: Microscope, key: "disease" },
  { to: "/dashboard/market", icon: TrendingUp, key: "market" },
  { to: "/dashboard/assistant", icon: Bot, key: "assistant" },
  { to: "/dashboard/settings", icon: Settings, key: "settings" },
  { to: "/dashboard/profile", icon: User, key: "profile" },
] as const;

export function DashboardSidebar() {
  const { t } = useTranslation();
  const path = useLocation().pathname;

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 lg:block">
      <nav className="flex flex-col gap-1">
        {items.map(({ to, icon: Icon, key }) => {
          const active = to === "/dashboard" ? path === "/dashboard" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`dashboard.${key}`)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const path = useLocation().pathname;
  const tabs = [
    { to: "/dashboard", icon: Layout, key: "overview" },
    { to: "/dashboard/weather", icon: CloudSun, key: "weather" },
    { to: "/dashboard/crops", icon: Sprout, key: "crops" },
    { to: "/dashboard/assistant", icon: Bot, key: "assistant" },
    { to: "/dashboard/profile", icon: User, key: "profile" },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      {tabs.map(({ to, icon: Icon, key }) => {
        const active = to === "/dashboard" ? path === "/dashboard" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
            {t(`dashboard.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
