import { api, ensureConfigured } from "./api";

export type AuthUser = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: AuthUser };

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    ensureConfigured();
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    // Persist token and user
    if (typeof window !== "undefined") {
      window.localStorage.setItem("krishiai-token", data.token);
      window.localStorage.setItem("krishiai-user", JSON.stringify(data.user));
    }
    return data;
  },

  async register(input: {
    name: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    ensureConfigured();
    const { data } = await api.post<AuthResponse>("/auth/register", input);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("krishiai-token", data.token);
      window.localStorage.setItem("krishiai-user", JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("krishiai-token");
      window.localStorage.removeItem("krishiai-user");
    }
  },

  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("krishiai-user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("krishiai-token"));
  },
};
