"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { GIBS_LAYERS, gibsUrl, type GibsLayerKey } from "@/lib/gibs";

type Props = {
  lat: number;
  lon: number;
  onPick?: (lat: number, lon: number) => void;
  /** Capa NASA superpuesta. null = solo la imagen base. Por defecto, NDVI mensual. */
  layer?: GibsLayerKey | null;
  /** Fecha de la capa (AAAA-MM-DD), ya ajustada con layerTime(). La Máquina del tiempo la mueve. */
  time?: string;
  /** Compatibilidad con la primera versión: fecha del NDVI. */
  ndviTime?: string;
  showNdvi?: boolean;
  className?: string;
};

const OPACITY: Record<GibsLayerKey, number> = {
  ndviMonthly: 0.6,
  ndvi16Day: 0.6,
  smapRootZone: 0.6,
  trueColor: 0.9,
};

function ClickHandler({ onPick }: { onPick: NonNullable<Props["onPick"]> }) {
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

/** className: solo la altura del mapa (p. ej. "h-64"); el ancho y los bordes los pone el componente. */
export default function ParcelMap({ lat, lon, onPick, layer, time, ndviTime = "2025-09-01", showNdvi = true, className = "h-[55vh] min-h-72" }: Props) {
  const key: GibsLayerKey | null = layer === undefined ? (showNdvi ? "ndviMonthly" : null) : layer;
  const overlay = key ? GIBS_LAYERS[key] : null;
  const when = time ?? ndviTime;

  return (
    <MapContainer center={[lat, lon]} zoom={11} className={`${className} w-full rounded-2xl z-0`} scrollWheelZoom>
      <TileLayer
        attribution="Imagery © Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      {overlay && key && (
        <TileLayer
          key={`${overlay.id}-${when}`}
          attribution={overlay.attribution}
          url={gibsUrl(overlay, when)}
          maxNativeZoom={overlay.maxNativeZoom}
          maxZoom={18}
          opacity={OPACITY[key]}
        />
      )}
      <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2f6b3a", fillOpacity: 1 }} />
      {onPick && <ClickHandler onPick={onPick} />}
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  );
}
