import { api, ensureConfigured } from "./api";

export type SoilData = {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  moisture: number;
  organic_carbon: number;
  health_score: number;
  suggestions: string[];
  suitable_crops: string[];
};

export const soilService = {
  async getByCoords(lat: number, lon: number): Promise<SoilData> {
    ensureConfigured();
    const { data } = await api.get<SoilData>("/soil", { params: { lat, lon } });
    return data;
  },
};
