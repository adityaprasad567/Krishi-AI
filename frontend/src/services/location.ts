import { api, ensureConfigured, isApiConfigured } from "./api";
import type { LocationData } from "@/stores/location-store";

type ReverseGeocodeResponse = {
  village?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

export const locationService = {
  async reverseGeocode(lat: number, lon: number): Promise<LocationData> {
    if (isApiConfigured) {
      const { data } = await api.get<ReverseGeocodeResponse>(`/location/reverse`, {
        params: { lat, lon },
      });
      return {
        lat,
        lon,
        village: data.village ?? data.city,
        district: data.district,
        state: data.state,
        country: data.country,
        label:
          [data.village ?? data.city, data.district, data.state].filter(Boolean).join(", ") ||
          `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        source: "gps",
      };
    }
    // Fallback: use OSM Nominatim (no key required) for reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const r = await fetch(url, { headers: { "Accept-Language": "en" } });
    const j = (await r.json()) as { address?: Record<string, string>; display_name?: string };
    const a = j.address ?? {};
    return {
      lat,
      lon,
      village: a.village ?? a.town ?? a.hamlet ?? a.city,
      district: a.state_district ?? a.county,
      state: a.state,
      country: a.country,
      label:
        [a.village ?? a.town ?? a.city, a.state_district ?? a.county, a.state]
          .filter(Boolean)
          .join(", ") ||
        j.display_name ||
        `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      source: "gps",
    };
  },

  async search(query: string): Promise<LocationData[]> {
    if (!query.trim()) return [];
    if (isApiConfigured) {
      const { data } = await api.get<LocationData[]>(`/location/search`, { params: { q: query } });
      return data;
    }
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&q=${encodeURIComponent(query)}`;
    const r = await fetch(url, { headers: { "Accept-Language": "en" } });
    const j = (await r.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }>;
    return j.map((x) => ({
      lat: parseFloat(x.lat),
      lon: parseFloat(x.lon),
      label: x.display_name,
      village: x.address?.village ?? x.address?.town ?? x.address?.city,
      district: x.address?.state_district ?? x.address?.county,
      state: x.address?.state,
      country: x.address?.country,
      source: "search" as const,
    }));
  },

  getBrowserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  },
  ensureConfigured,
};
