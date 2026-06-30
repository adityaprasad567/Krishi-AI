import { api, ensureConfigured } from "./api";

export type CurrentWeather = {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  rain_probability: number;
  clouds: number;
  visibility: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  aqi: number;
  condition: string;
  icon?: string;
};

export type HourlyPoint = { time: string; temp: number; rain: number };
export type DailyPoint = {
  date: string;
  min: number;
  max: number;
  rain: number;
  condition: string;
};

export type WeatherResponse = {
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

export const weatherService = {
  async getByCoords(lat: number, lon: number): Promise<WeatherResponse> {
    ensureConfigured();
    const { data } = await api.get<WeatherResponse>("/weather", { params: { lat, lon } });
    return data;
  },
};
