import { useTranslation } from "react-i18next";
import { useUiStore, type Lang } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
];

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useUiStore();
  const { i18n } = useTranslation();

  const choose = (code: Lang) => {
    setLang(code);
    void i18n.changeLanguage(code);
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background/60 p-0.5 backdrop-blur",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => choose(o.code)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active
                ? "gradient-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
