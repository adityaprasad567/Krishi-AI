import { api, ensureConfigured } from "./api";

// Input shape matches backend /crops/recommend expected fields (lowercase)
export type CropInput = {
  lat?: number;
  lon?: number;
  season?: string;
  soil_type?: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  temperature: number;
  humidity: number;
  rainfall: number;
};

export type CropResult = {
  name: string;
  confidence: number;
  expected_yield: string;
  water_requirement: string;
  growing_duration: string;
  profitability: number;
  best_sowing_month: string;
  fertilizer: string;
};

export const cropsService = {
  async recommend(input: CropInput): Promise<CropResult[]> {
    ensureConfigured();
    const { data } = await api.post<CropResult[]>("/crops/recommend", input);
    return data;
  },
};
