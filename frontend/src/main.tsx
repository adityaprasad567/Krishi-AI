import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./styles.css";
import "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { useThemeSync } from "@/hooks/use-theme";
import { useLangSync } from "@/hooks/use-lang";
import { setupGlobalErrorHandlers } from "@/lib/error-capture";

// Set up global unhandled error capturing
setupGlobalErrorHandlers();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry API-not-configured errors — they will never succeed
      retry: (failureCount, error) => {
        if ((error as Error).name === "ApiNotConfiguredError") return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
});

function Root() {
  useThemeSync();
  useLangSync();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
