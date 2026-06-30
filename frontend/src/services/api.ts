/// <reference types="vite/client" />
import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const isApiConfigured = Boolean(API_BASE_URL);

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || "/",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("krishiai-token");
    if (token) {
      config.headers.set?.("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

// Global error normalisation — convert Django error responses to friendly messages
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    if (!error.response) {
      // Network error / timeout
      return Promise.reject(
        new Error("Cannot reach the server. Check your connection or VITE_API_BASE_URL.")
      );
    }
    const status = error.response.status;
    const serverMsg =
      error.response.data?.error ||
      error.response.data?.detail ||
      error.message;

    if (status === 401) {
      // Clear stale token
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("krishiai-token");
        window.localStorage.removeItem("krishiai-user");
      }
      return Promise.reject(new Error("Session expired. Please log in again."));
    }
    if (status === 429) {
      return Promise.reject(new Error("Too many requests. Please wait a moment."));
    }
    if (status === 503) {
      return Promise.reject(
        new Error("Backend model is not ready. Run train_model.py first.")
      );
    }
    return Promise.reject(new Error(serverMsg || `Request failed (${status})`));
  }
);

export class ApiNotConfiguredError extends Error {
  constructor() {
    super("Backend not configured. Set VITE_API_BASE_URL in your .env file to enable live data.");
    this.name = "ApiNotConfiguredError";
  }
}

export const ensureConfigured = () => {
  if (!isApiConfigured) throw new ApiNotConfiguredError();
};
