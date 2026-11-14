"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import { CalendarDays, Crosshair, Droplets, Layers3, LocateFixed, Satellite } from "lucide-react";
import { GIBS_LAYERS, gibsUrl, smapDate } from "@/lib/gibs";
import { useLocale } from "@/components/i18n-provider";

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
  const smap = GIBS_LAYERS.smapRootZone;
  const locale = useLocale();
  const [layerOn, setLayerOn] = useState(showNdvi);
  const [smapOn, setSmapOn] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const date = new Intl.DateTimeFormat("es", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ndviTime}T00:00:00Z`));

  return (
    <div className={`parcel-map-shell ${compact ? "compact" : ""} ${className}`}>
      <MapContainer center={[lat, lon]} zoom={11} className="parcel-map" scrollWheelZoom zoomControl>
        <TileLayer attribution="Imagery © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} />
        {layerOn && !smapOn && <TileLayer key={ndviTime} attribution="NDVI: NASA GIBS / MODIS Terra" url={gibsUrl(ndvi, ndviTime)} maxNativeZoom={ndvi.maxNativeZoom} maxZoom={18} opacity={0.58} />}
        {smapOn && <TileLayer key={`smap-${ndviTime}`} attribution="Soil moisture: NASA GIBS / SMAP L4" url={gibsUrl(smap, smapDate(ndviTime))} maxNativeZoom={smap.maxNativeZoom} maxZoom={18} opacity={0.6} />}
        <CircleMarker center={[lat, lon]} radius={11} pathOptions={{ color: "#fff", weight: 4, fillColor: "#39b86b", fillOpacity: 1 }} />
        <CircleMarker center={[lat, lon]} radius={20} pathOptions={{ color: "#8ae899", weight: 2, fillOpacity: 0, opacity: .75 }} />
        <ClickHandler onPick={onPick} />
        <Recenter lat={lat} lon={lon} request={recenterRequest} />
      </MapContainer>

      <div className="map-layer-card">
        <div><Satellite size={16} /><span><strong>MODIS NDVI</strong><small>NASA GIBS</small></span></div>
        <button type="button" className={layerOn && !smapOn ? "map-toggle on" : "map-toggle"} onClick={() => { setSmapOn(false); setLayerOn((value) => (smapOn ? true : !value)); }} aria-pressed={layerOn && !smapOn} aria-label="MODIS NDVI"><span /></button>
        <div><Droplets size={16} /><span><strong>SMAP</strong><small>{locale === "en" ? "Soil moisture" : "Humedad suelo"}</small></span></div>
        <button type="button" className={smapOn ? "map-toggle on" : "map-toggle"} onClick={() => setSmapOn((value) => !value)} aria-pressed={smapOn} aria-label="SMAP"><span /></button>
      </div>
      <div className="map-date-chip"><CalendarDays size={14} />{date}</div>
      <button type="button" className="map-locate" onClick={() => setRecenterRequest((value) => value + 1)} aria-label="Centrar parcela"><LocateFixed size={18} /></button>
      <div className="map-reticle" aria-hidden><Crosshair size={36} /></div>
      <div className="map-legend">
        <div><Layers3 size={14} /><strong>{smapOn ? (locale === "en" ? "Root-zone soil moisture" : "Humedad del suelo (raíces)") : locale === "en" ? "Plant vigor" : "Vigor vegetal"}</strong></div>
        <span className="ndvi-gradient" style={smapOn ? { background: "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)" } : undefined} />
        <small>{smapOn ? (locale === "en" ? <><span>Dry</span><span></span><span>Wet</span></> : <><span>Seco</span><span></span><span>Húmedo</span></>) : locale === "en" ? <><span>Low</span><span>Mid</span><span>High</span></> : <><span>Bajo</span><span>Medio</span><span>Alto</span></>}</small>
      </div>
      <div className="map-coordinate"><span className="live-dot" />{lat.toFixed(4)} · {lon.toFixed(4)}</div>
    </div>
  );
}
