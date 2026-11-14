"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import { CalendarDays, Crosshair, Layers3, LocateFixed, Satellite } from "lucide-react";
import { GIBS_LAYERS, gibsUrl } from "@/lib/gibs";

type Props = {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
  ndviTime?: string;
  showNdvi?: boolean;
  className?: string;
  compact?: boolean;
};

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function Recenter({ lat, lon, request }: { lat: number; lon: number; request: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 1.1 }); }, [lat, lon, map, request]);
  return null;
}

export default function ParcelMap({ lat, lon, onPick, ndviTime = "2025-09-01", showNdvi = true, compact = false, className = "" }: Props) {
  const ndvi = GIBS_LAYERS.ndviMonthly;
  const [layerOn, setLayerOn] = useState(showNdvi);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const date = new Intl.DateTimeFormat("es", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ndviTime}T00:00:00Z`));

  return (
    <div className={`parcel-map-shell ${compact ? "compact" : ""} ${className}`}>
      <MapContainer center={[lat, lon]} zoom={11} className="parcel-map" scrollWheelZoom zoomControl>
        <TileLayer attribution="Imagery © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} />
        {layerOn && <TileLayer key={ndviTime} attribution="NDVI: NASA GIBS / MODIS Terra" url={gibsUrl(ndvi, ndviTime)} maxNativeZoom={ndvi.maxNativeZoom} maxZoom={18} opacity={0.58} />}
        <CircleMarker center={[lat, lon]} radius={11} pathOptions={{ color: "#fff", weight: 4, fillColor: "#39b86b", fillOpacity: 1 }} />
        <CircleMarker center={[lat, lon]} radius={20} pathOptions={{ color: "#8ae899", weight: 2, fillOpacity: 0, opacity: .75 }} />
        <ClickHandler onPick={onPick} />
        <Recenter lat={lat} lon={lon} request={recenterRequest} />
      </MapContainer>

      <div className="map-layer-card">
        <div><Satellite size={16} /><span><strong>MODIS NDVI</strong><small>NASA GIBS</small></span></div>
        <button type="button" className={layerOn ? "map-toggle on" : "map-toggle"} onClick={() => setLayerOn((value) => !value)} aria-pressed={layerOn}><span /></button>
      </div>
      <div className="map-date-chip"><CalendarDays size={14} />{date}</div>
      <button type="button" className="map-locate" onClick={() => setRecenterRequest((value) => value + 1)} aria-label="Centrar parcela"><LocateFixed size={18} /></button>
      <div className="map-reticle" aria-hidden><Crosshair size={36} /></div>
      <div className="map-legend">
        <div><Layers3 size={14} /><strong>Vigor vegetal</strong></div>
        <span className="ndvi-gradient" /><small><span>Bajo</span><span>Medio</span><span>Alto</span></small>
      </div>
      <div className="map-coordinate"><span className="live-dot" />{lat.toFixed(4)} · {lon.toFixed(4)}</div>
    </div>
  );
}
