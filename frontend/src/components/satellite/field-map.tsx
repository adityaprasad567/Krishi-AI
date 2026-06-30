import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useLocationStore } from "@/stores/location-store";
import { locationService } from "@/services/location";
import { toast } from "sonner";

// fix default marker icons (Leaflet + bundlers issue)
const icon = L.divIcon({
  className: "",
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;
    background:linear-gradient(135deg,#2E7D32,#4CAF50);
    border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom() < 8 ? 11 : map.getZoom());
  }, [lat, lon, map]);
  return null;
}

function ClickHandler() {
  const setCurrent = useLocationStore((s) => s.setCurrent);
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const loc = await locationService.reverseGeocode(lat, lng);
        setCurrent({ ...loc, source: "map" });
        toast.success(loc.label ?? "Location set");
      } catch {
        setCurrent({ lat, lon: lng, source: "map", label: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
      }
    },
  });
  return null;
}

export function FieldMap() {
  const current = useLocationStore((s) => s.current);
  const center: [number, number] = current ? [current.lat, current.lon] : [22.5726, 88.3639]; // Kolkata

  return (
    <MapContainer
      center={center}
      zoom={current ? 11 : 5}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: 360 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler />
      {current && (
        <>
          <Marker position={[current.lat, current.lon]} icon={icon} />
          <Recenter lat={current.lat} lon={current.lon} />
        </>
      )}
    </MapContainer>
  );
}
