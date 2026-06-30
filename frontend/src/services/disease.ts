import { api, ensureConfigured } from "./api";

export type DiseaseResult = {
  disease: string;
  confidence: number;
  treatment: string;
  prevention: string[];
};

export const diseaseService = {
  async predict(file: File): Promise<DiseaseResult> {
    ensureConfigured();
    const form = new FormData();
    form.append("image", file);
    const { data } = await api.post<DiseaseResult>("/disease/predict", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30000,  // disease detection may take longer
    });
    return data;
  },
};
