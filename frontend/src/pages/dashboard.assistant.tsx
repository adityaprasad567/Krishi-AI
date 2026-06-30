import { Bot, Mic, Send, Wifi, WifiOff } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PanelCard } from "@/components/dashboard/primitives";
import { api, isApiConfigured } from "@/services/api";

type Message = { role: "user" | "bot"; text: string; loading?: boolean };

const QUICK_QUESTIONS = [
  "What should I grow this season?",
  "Will it rain tomorrow?",
  "How can I improve my soil?",
  "Best fertilizer for paddy?",
  "How to detect crop disease early?",
  "When is the best time to sow wheat?",
];

async function queryBackendAssistant(question: string, signal: AbortSignal): Promise<string> {
  // Try to hit the backend /predict-live or use a chat endpoint if you add one.
  // For now, we send the question to the health endpoint as a connectivity check
  // and return a contextual stub. Replace this with your actual AI chat endpoint.
  try {
    const { data } = await api.get("/health", { signal });
    const crops: string[] = (data as { crops?: string[] }).crops ?? [];
    const cropList = crops.slice(0, 6).join(", ");
    return (
      `I'm KrishiBot, connected to KrishiAI backend! ` +
      `I can recommend from ${crops.length} crops including ${cropList}. ` +
      `For a personalized recommendation, head to the Crop Recommendation panel and fill in your soil details. ` +
      `\n\nYour question: "${question}"\n\nConnect a dedicated AI chat endpoint (e.g., OpenAI or Gemini) to get live conversational answers.`
    );
  } catch {
    throw new Error("Could not reach the backend.");
  }
}

function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: isApiConfigured
        ? "Namaste! I'm KrishiBot. Ask me about crops, weather, soil, or markets. I'm connected to the backend and ready to help!"
        : "Namaste! I'm KrishiBot running in demo mode. Set VITE_API_BASE_URL to enable live AI answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", text: q };
    const botPlaceholder: Message = { role: "bot", text: "", loading: true };
    setMessages((m) => [...m, userMsg, botPlaceholder]);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let reply: string;
      if (isApiConfigured) {
        reply = await queryBackendAssistant(q, controller.signal);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        reply = `Demo mode: "${q}" — Connect VITE_API_BASE_URL to your KrishiAI backend for live AI-powered answers about crops, weather, soil, and markets.`;
      }
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "bot", text: reply };
        return copy;
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "bot",
            text: `Sorry, I couldn't reach the backend: ${(e as Error).message}`,
          };
          return copy;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="AI Assistant"
        subtitle="Your multilingual farming companion · EN · हिन्दी · বাংলা"
        actions={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isApiConfigured
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isApiConfigured ? (
              <><Wifi className="h-3 w-3" /> Connected</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Demo mode</>
            )}
          </span>
        }
      />
      <PanelCard className="flex h-[70dvh] flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full gradient-primary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold">KrishiBot</div>
            <div className="text-xs text-muted-foreground">
              {isApiConfigured ? "Connected to backend" : "Demo mode"}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto gradient-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.loading ? (
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                </span>
              ) : (
                m.text
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              disabled={loading}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Button type="button" variant="ghost" size="icon" aria-label="Voice (coming soon)" disabled>
            <Mic className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about farming…"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="gradient-primary text-primary-foreground"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </PanelCard>
    </div>
  );
}

export default AssistantPanel;
