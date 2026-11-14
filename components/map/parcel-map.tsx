"use client";

import "leaflet/dist/leaflet.css";
import L, { type Map as LeafletMap } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Layers,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Search,
  X,
} from "lucide-react";
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
  /** ocupa todo el contenedor padre (vista de mapa a pantalla completa) */
  fill?: boolean;
  /** caja de búsqueda flotante arriba a la izquierda */
  search?: boolean;
  /** paneles flotantes propios de la página, encima del mapa */
  children?: React.ReactNode;
};

type Base = "satellite" | "hybrid" | "terrain";
type Data = "ndvi" | "smap" | "none";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASES: Record<Base, { url: string; labels?: string; thumb: string }> = {
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Imagery/MapServer/tile/10/559/306`,
  },
  hybrid: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Imagery/MapServer/tile/10/559/306`,
  },
  terrain: {
    url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Topo_Map/MapServer/tile/10/559/306`,
  },
};

/** Zonas agrícolas de Arequipa para saltar rápido (centros aproximados). */
const ZONES: { name: string; lat: number; lon: number }[] = [
  { name: "Majes (El Pedregal)", lat: -16.36, lon: -72.19 },
  { name: "Santa Rita de Siguas", lat: -16.49, lon: -72.1 },
  { name: "La Joya", lat: -16.43, lon: -71.82 },
  { name: "Vítor", lat: -16.43, lon: -71.93 },
  { name: "Valle de Camaná", lat: -16.62, lon: -72.71 },
  { name: "Aplao (Valle de Majes)", lat: -16.08, lon: -72.49 },
  { name: "Valle del Colca (Chivay)", lat: -15.64, lon: -71.6 },
  { name: "Valle de Tambo (Cocachacra)", lat: -17.09, lon: -71.77 },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const PIN = L.divIcon({
  className: "map-pin",
  html: `<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true"><path d="M16 43c-1-6-14-16-14-27a14 14 0 0 1 28 0c0 11-13 21-14 27z" fill="#b9ff63" stroke="#0a2230" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="#0a2230"/></svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 43],
});

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

function ParcelMapInner({
  lat,
  lon,
  onPick,
  ndviTime = "2025-09-01",
  showNdvi = true,
  compact = false,
  fill = false,
  search = false,
  className = "",
  children,
}: Props) {
  const es = useLocale() === "es";
  const [base, setBase] = useState<Base>("hybrid");
  const [data, setData] = useState<Data>(showNdvi ? "ndvi" : "none");
  const [opacity, setOpacity] = useState(0.6);
  const [layersOpen, setLayersOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const date = new Intl.DateTimeFormat(es ? "es" : "en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ndviTime}T00:00:00Z`));

  // seguir a la parcela cuando cambia desde fuera (GPS, búsqueda, otra pantalla)
  useEffect(() => {
    if (map)
      map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 1.1 });
  }, [map, lat, lon]);

  const markerEvents = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onPick(p.lat, p.lng);
      },
    }),
    [onPick],
  );

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const ndvi = GIBS_LAYERS.ndviMonthly;
  const smap = GIBS_LAYERS.smapRootZone;
  const b = BASES[base];

  return (
    <div
      className={`parcel-map-shell ${compact ? "compact" : ""} ${fill ? "fill" : ""} ${className}`}
    >
      <MapContainer
        ref={setMap}
        center={[lat, lon]}
        zoom={11}
        className="parcel-map"
        scrollWheelZoom
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          key={base}
          attribution="Imagery © Esri"
          url={b.url}
          maxZoom={18}
        />
        {data === "ndvi" && (
          <TileLayer
            key={`ndvi-${ndviTime}`}
            attribution="NDVI: NASA GIBS / MODIS Terra"
            url={gibsUrl(ndvi, ndviTime)}
            maxNativeZoom={ndvi.maxNativeZoom}
            maxZoom={18}
            opacity={opacity}
          />
        )}
        {data === "smap" && (
          <TileLayer
            key={`smap-${ndviTime}`}
            attribution="Soil moisture: NASA GIBS / SMAP L4"
            url={gibsUrl(smap, smapDate(ndviTime))}
            maxNativeZoom={smap.maxNativeZoom}
            maxZoom={18}
            opacity={opacity}
          />
        )}
        {b.labels && (
          <TileLayer
            key={`${base}-labels`}
            url={b.labels}
            maxZoom={18}
            zIndex={5}
          />
        )}
        <Marker
          position={[lat, lon]}
          icon={PIN}
          draggable
          eventHandlers={markerEvents}
        />
        <ClickHandler onPick={onPick} />
      </MapContainer>

      {search && <SearchBox es={es} onPick={onPick} />}

      {/* arriba a la derecha: fecha de la capa NASA */}
      {data !== "none" && (
        <div className="gm-chip gm-date">
          {data === "ndvi" ? "MODIS NDVI" : "SMAP"} ·{" "}
          <span className="capitalize">{date}</span>
        </div>
      )}

      {/* abajo a la derecha: mi ubicación y zoom, como en Google Maps */}
      <div className="gm-controls">
        <button
          type="button"
          className="gm-round"
          onClick={locate}
          disabled={locating}
          aria-label={es ? "Mi ubicación" : "My location"}
          title={es ? "Mi ubicación" : "My location"}
        >
          <Navigation size={17} className={locating ? "animate-pulse" : ""} />
        </button>
        <button
          type="button"
          className="gm-round"
          onClick={() =>
            map?.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 1 })
          }
          aria-label={es ? "Centrar parcela" : "Center field"}
          title={es ? "Centrar parcela" : "Center field"}
        >
          <LocateFixed size={17} />
        </button>
        <div className="gm-zoom">
          <button
            type="button"
            onClick={() => map?.zoomIn()}
            aria-label={es ? "Acercar" : "Zoom in"}
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            onClick={() => map?.zoomOut()}
            aria-label={es ? "Alejar" : "Zoom out"}
          >
            <Minus size={17} />
          </button>
        </div>
      </div>

      {/* abajo a la izquierda: botón de capas + leyenda */}
      <div className="gm-layers-anchor">
        {layersOpen && (
          <div
            className="gm-popover gm-layers-pop"
            role="dialog"
            aria-label={es ? "Capas" : "Layers"}
          >
            <div className="gm-pop-head">
              <b>{es ? "Capas" : "Layers"}</b>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                aria-label={es ? "Cerrar" : "Close"}
              >
                <X size={15} />
              </button>
            </div>
            <div className="gm-pop-cols">
              <div>
                <small className="gm-pop-kicker">
                  {es ? "Tipo de mapa" : "Map type"}
                </small>
                <div className="gm-thumbs">
                  {(["satellite", "hybrid", "terrain"] as Base[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setBase(k)}
                      className={base === k ? "active" : ""}
                      aria-pressed={base === k}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={BASES[k].thumb}
                        alt=""
                        loading="lazy"
                        className={k === "hybrid" ? "hybrid" : ""}
                      />
                      <span>
                        {k === "satellite"
                          ? es
                            ? "Satélite"
                            : "Satellite"
                          : k === "hybrid"
                            ? es
                              ? "Con nombres"
                              : "Labels"
                            : es
                              ? "Relieve"
                              : "Terrain"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <small className="gm-pop-kicker">
                  {es ? "Datos satelitales NASA" : "NASA satellite data"}
                </small>
                <div className="gm-data-list">
                  {(
                    [
                      [
                        "ndvi",
                        es ? "Vigor de la vegetación" : "Vegetation vigor",
                        "MODIS NDVI",
                        "linear-gradient(90deg,#a67c52,#e8d98a,#7fbf5f,#1f6b2a)",
                      ],
                      [
                        "smap",
                        es ? "Humedad del suelo" : "Soil moisture",
                        "SMAP L4",
                        "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)",
                      ],
                      [
                        "none",
                        es ? "Sin capa" : "No layer",
                        "",
                        "rgba(255,255,255,.08)",
                      ],
                    ] as [Data, string, string, string][]
                  ).map(([k, label, src, swatch]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setData(k)}
                      className={data === k ? "active" : ""}
                      aria-pressed={data === k}
                    >
                      <i style={{ background: swatch }} />
                      <span>
                        <b>{label}</b>
                        {src && <small>{src}</small>}
                      </span>
                      {data === k && <Check size={15} />}
                    </button>
                  ))}
                </div>
                {data !== "none" && (
                  <label className="gm-opacity">
                    <span>{es ? "Transparencia" : "Opacity"}</span>
                    <input
                      type="range"
                      min={0.2}
                      max={0.9}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`gm-layers-btn ${layersOpen ? "open" : ""}`}
          onClick={() => setLayersOpen((o) => !o)}
          aria-expanded={layersOpen}
          aria-label={es ? "Capas" : "Layers"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BASES[base === "terrain" ? "satellite" : "terrain"].thumb}
            alt=""
            loading="lazy"
          />
          <span>
            <Layers size={13} />
            {es ? "Capas" : "Layers"}
          </span>
        </button>
        {data !== "none" && !layersOpen && (
          <div className="gm-chip gm-legend">
            <span
              className="ndvi-gradient"
              style={
                data === "smap"
                  ? {
                      background:
                        "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)",
                    }
                  : undefined
              }
            />
            <small>
              <span>
                {data === "smap"
                  ? es
                    ? "Seco"
                    : "Dry"
                  : es
                    ? "Poca planta"
                    : "Sparse"}
              </span>
              <span>
                {data === "smap"
                  ? es
                    ? "Húmedo"
                    : "Wet"
                  : es
                    ? "Mucha planta"
                    : "Dense"}
              </span>
            </small>
          </div>
        )}
      </div>

      {/* coordenadas, discretas, como la escala de Google Maps */}
      <div className="gm-coords">
        {lat.toFixed(4)}, {lon.toFixed(4)}
      </div>

      {children}
    </div>
  );
}

function SearchBox({
  es,
  onPick,
}: {
  es: boolean;
  onPick: (lat: number, lon: number) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const coords = q.match(
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  );
  const hits = coords
    ? []
    : ZONES.filter((z) => !q.trim() || norm(z.name).includes(norm(q.trim())));
  const go = (lat: number, lon: number) => {
    onPick(lat, lon);
    setOpen(false);
    ref.current?.blur();
  };
  return (
    <div className={`gm-search ${open ? "open" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (coords) go(Number(coords[1]), Number(coords[2]));
          else if (hits[0]) {
            setQ(hits[0].name);
            go(hits[0].lat, hits[0].lon);
          }
        }}
      >
        <Search size={17} />
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            es
              ? "Busca una zona o pega coordenadas"
              : "Search a zone or paste coordinates"
          }
          aria-label={es ? "Buscar zona" : "Search zone"}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label={es ? "Borrar" : "Clear"}
          >
            <X size={15} />
          </button>
        )}
      </form>
      {open && (coords || hits.length > 0) && (
        <ul className="gm-search-list">
          {coords ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(Number(coords[1]), Number(coords[2]))}
              >
                <LocateFixed size={15} />
                {es ? "Ir a" : "Go to"} {coords[1]}, {coords[2]}
              </button>
            </li>
          ) : (
            hits.map((z) => (
              <li key={z.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(z.name);
                    go(z.lat, z.lon);
                  }}
                >
                  <Navigation size={14} />
                  <span>
                    {z.name}
                    <small>Arequipa</small>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Si el mapa falla al dibujarse, avisa hacia arriba para montarlo de nuevo en vez de romper la página. */
class MapBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? <div className="map-skeleton ui-skeleton" /> : this.props.children;
  }
}

/**
 * Next conserva las páginas visitadas ocultas en memoria. Al ocultarlas, Leaflet destruye el mapa,
 * pero sus capas quedan montadas y al volver intentan dibujarse sobre un mapa que ya no existe.
 * Por eso el mapa solo vive mientras la página está visible: se monta de nuevo en cada visita.
 */
export default function ParcelMap(props: Props) {
  const [generation, setGeneration] = useState<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGeneration((g) => (g ?? 0) + 1));
    return () => {
      cancelAnimationFrame(frame);
      setGeneration(null);
    };
  }, []);

  if (generation === null) return <div className={`map-skeleton ui-skeleton ${props.className ?? ""}`} />;
  return (
    <MapBoundary key={generation} onError={() => setGeneration((g) => (g ?? 0) + 1)}>
      <ParcelMapInner {...props} />
    </MapBoundary>
  );
}
