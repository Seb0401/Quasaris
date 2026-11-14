"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import { CalendarDays, Crosshair, Droplets, Layers3, LocateFixed, Minus, Plus, Satellite } from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { GIBS_LAYERS, gibsUrl, smapDate } from "@/lib/gibs";

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

export default function ParcelMap({ lat, lon, onPick, ndviTime = "2025-09-01", showNdvi = true, compact = false, className = "" }: Props) {
  const es = useLocale() === "es";
  const ndvi = GIBS_LAYERS.ndviMonthly;
  const smap = GIBS_LAYERS.smapRootZone;
  const [layerOn, setLayerOn] = useState(showNdvi);
  const [smapOn, setSmapOn] = useState(false);
  const ndviVisible = layerOn && !smapOn;
  const [map, setMap] = useState<LeafletMap | null>(null);
  const date = new Intl.DateTimeFormat(es ? "es" : "en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ndviTime}T00:00:00Z`));

  // seguir a la parcela cuando cambia desde fuera (GPS, otra pantalla)
  useEffect(() => {
    if (map) map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 1.1 });
  }, [map, lat, lon]);

  return (
    <div className={`parcel-map-shell ${compact ? "compact" : ""} ${className}`}>
      <MapContainer ref={setMap} center={[lat, lon]} zoom={11} className="parcel-map" scrollWheelZoom zoomControl={false} attributionControl>
        <TileLayer attribution="Imagery © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} />
        {ndviVisible && <TileLayer key={ndviTime} attribution="NDVI: NASA GIBS / MODIS Terra" url={gibsUrl(ndvi, ndviTime)} maxNativeZoom={ndvi.maxNativeZoom} maxZoom={18} opacity={0.58} />}
        {smapOn && <TileLayer key={`smap-${ndviTime}`} attribution="Soil moisture: NASA GIBS / SMAP L4" url={gibsUrl(smap, smapDate(ndviTime))} maxNativeZoom={smap.maxNativeZoom} maxZoom={18} opacity={0.6} />}
        <CircleMarker center={[lat, lon]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#b9ff63", fillOpacity: 1 }} />
        <CircleMarker center={[lat, lon]} radius={22} pathOptions={{ color: "#b9ff63", weight: 1.5, fillColor: "#b9ff63", fillOpacity: 0.12, opacity: 0.8 }} />
        <ClickHandler onPick={onPick} />
      </MapContainer>

      <div className="map-pulse" aria-hidden />
      <div className="map-reticle" aria-hidden><Crosshair size={34} strokeWidth={1.2} /></div>

      {/* arriba a la izquierda: capas satelitales (una a la vez) */}
      <div className="map-chip map-layer-card">
        <div className="map-layer-row">
          <Satellite size={15} />
          <span><strong>MODIS NDVI</strong><small>{es ? "Vigor vegetal" : "Plant vigor"}</small></span>
          <button type="button" className={ndviVisible ? "map-toggle on" : "map-toggle"} onClick={() => { setLayerOn(smapOn ? true : !layerOn); setSmapOn(false); }} aria-pressed={ndviVisible} aria-label={es ? "Mostrar capa NDVI" : "Show NDVI layer"}><span /></button>
        </div>
        <div className="map-layer-row">
          <Droplets size={15} />
          <span><strong>SMAP</strong><small>{es ? "Humedad del suelo" : "Soil moisture"}</small></span>
          <button type="button" className={smapOn ? "map-toggle on" : "map-toggle"} onClick={() => setSmapOn((value) => !value)} aria-pressed={smapOn} aria-label={es ? "Mostrar capa SMAP" : "Show SMAP layer"}><span /></button>
        </div>
      </div>

      {/* arriba a la derecha: fecha y coordenadas */}
      <div className="map-top-right">
        <div className="map-chip"><CalendarDays size={13} /><span className="capitalize">{date}</span></div>
        <div className="map-chip map-coordinate"><span className="live-dot" />{lat.toFixed(4)} · {lon.toFixed(4)}</div>
      </div>

      {/* derecha al centro: controles */}
      <div className="map-controls">
        <button type="button" onClick={() => map?.zoomIn()} aria-label={es ? "Acercar" : "Zoom in"}><Plus size={17} /></button>
        <button type="button" onClick={() => map?.zoomOut()} aria-label={es ? "Alejar" : "Zoom out"}><Minus size={17} /></button>
        <button type="button" onClick={() => map?.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 1 })} aria-label={es ? "Centrar parcela" : "Center field"}><LocateFixed size={17} /></button>
      </div>

      {/* abajo a la izquierda: leyenda */}
      {(ndviVisible || smapOn) && (
        <div className="map-chip map-legend">
          <div><Layers3 size={13} /><strong>{smapOn ? (es ? "Humedad del suelo (raíces)" : "Root-zone soil moisture") : es ? "Vigor vegetal" : "Plant vigor"}</strong></div>
          <span className="ndvi-gradient" style={smapOn ? { background: "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)" } : undefined} />
          {smapOn ? <small><span>{es ? "Seco" : "Dry"}</span><span>{es ? "Húmedo" : "Wet"}</span></small> : <small><span>{es ? "Bajo" : "Low"}</span><span>{es ? "Medio" : "Mid"}</span><span>{es ? "Alto" : "High"}</span></small>}
        </div>
      )}
    </div>
  );
}
