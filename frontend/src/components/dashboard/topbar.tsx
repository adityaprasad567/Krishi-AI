import { Link } from "react-router-dom";
import { Bell, Globe, Leaf, Moon, Search, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUiStore, type Lang, type Theme } from "@/stores/ui-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LangToggle } from "@/components/common/lang-toggle";
import { authService } from "@/services/auth";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
];

export function DashboardTopbar() {
  const { t } = useTranslation();
  const { theme, setTheme, lang, setLang } = useUiStore();
  const user = authService.getUser();
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "K";

  const cycleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg gradient-primary">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="hidden sm:inline">{t("brand")}</span>
        </Link>

        <div className="ml-2 hidden max-w-md flex-1 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search crops, weather, market…" className="rounded-full pl-9" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <LangToggle className="hidden sm:inline-flex" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Language" className="rounded-full">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={lang === l.code ? "font-semibold text-primary" : ""}
                >
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={cycleTheme}
            className="rounded-full"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative rounded-full"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </Button>

          <Link
            to="/dashboard/profile"
            className="ml-1 grid h-9 w-9 place-items-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
            aria-label="Profile"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
