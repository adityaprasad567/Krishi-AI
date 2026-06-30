import { api, ensureConfigured } from "./api";

export type MarketPrice = {
  crop: string;
  today: number;
  yesterday: number;
  unit: string;
  trend: { date: string; price: number }[];
};

export const marketService = {
  async list(state?: string): Promise<MarketPrice[]> {
    ensureConfigured();
    const { data } = await api.get<MarketPrice[]>("/market/prices", {
      params: state ? { state } : undefined,
    });
    return data;
  },
};
