import { api, ensureConfigured } from "./api";

export type SatelliteData = {
  ndvi: number;
  vegetation_index: number;
  crop_stress: number;
  field_health: number;
  heatmap_url?: string;
};

export const satelliteService = {
  async getByCoords(lat: number, lon: number): Promise<SatelliteData> {
    ensureConfigured();
    const { data } = await api.get<SatelliteData>("/satellite", { params: { lat, lon } });
    return data;
  },
};
