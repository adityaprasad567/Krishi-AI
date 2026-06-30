/**
 * Client-side error capture utility.
 * Extend this to send errors to your observability platform (Sentry, etc.)
 */

export function captureError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[KrishiAI Error]", { message, stack, context });
}

export function setupGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason, { type: "unhandledrejection" });
  });

  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message, { type: "window.error" });
  });
}
