import { motion } from "framer-motion";
import { Bot, Send, Mic, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function KrishiBot() {
  const { t: _t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Namaste! I'm KrishiBot. How can I help your farm today?" },
  ]);
  const [input, setInput] = useState("");

  const send = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Connect VITE_API_BASE_URL to enable live answers from KrishiAI.",
        },
      ]);
    }, 500);
  };

  const quick = [
    "What should I grow?",
    "Will it rain tomorrow?",
    "How healthy is my soil?",
    "Best crop this season?",
  ];

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="KrishiBot"
        className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow lg:bottom-6"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </motion.button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-36 right-4 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card-elegant lg:bottom-24"
        >
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full gradient-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">KrishiBot</div>
              <div className="text-[10px] text-muted-foreground">EN · हिन्दी · বাংলা</div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto gradient-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Button type="button" variant="ghost" size="icon" aria-label="Voice" className="shrink-0">
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1"
            />
            <Button type="submit" size="icon" className="shrink-0 gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </motion.div>
      )}
    </>
  );
}
