"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { GIBS_LAYERS, gibsUrl } from "@/lib/gibs";

type Props = {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
  /** Fecha de la capa NDVI (AAAA-MM-01). La Máquina del tiempo la mueve. */
  ndviTime?: string;
  showNdvi?: boolean;
  className?: string;
};

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains(L.latLng(lat, lon))) map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

export default function ParcelMap({ lat, lon, onPick, ndviTime = "2025-09-01", showNdvi = true, className = "h-[55vh] min-h-72" }: Props) {
  const ndvi = GIBS_LAYERS.ndviMonthly;
  return (
    <MapContainer center={[lat, lon]} zoom={11} className={`${className} w-full rounded-2xl z-0`} scrollWheelZoom>
      <TileLayer
        attribution="Imagery © Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      {showNdvi && (
        <TileLayer
          key={ndviTime}
          attribution="NDVI: NASA GIBS / MODIS Terra"
          url={gibsUrl(ndvi, ndviTime)}
          maxNativeZoom={ndvi.maxNativeZoom}
          maxZoom={18}
          opacity={0.55}
        />
      )}
      <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2f6b3a", fillOpacity: 1 }} />
      <ClickHandler onPick={onPick} />
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  );
}
