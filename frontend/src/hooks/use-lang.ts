import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { useUiStore } from "@/stores/ui-store";

export function useLangSync() {
  const lang = useUiStore((s) => s.lang);
  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
  }, [lang]);
}
